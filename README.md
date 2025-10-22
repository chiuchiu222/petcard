## PetCard

Next.js (App Router, TypeScript, Tailwind) + Supabase.

### Env

Create `.env.local` based on `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Install

1) Install Node.js 18+ and npm.
2) In project folder:

```
npm install
```

### Supabase setup

- In Supabase SQL editor, run the SQL in section “SQL”.
- Create a public bucket named `vaccines` in Storage.

### Dev

```
npm run dev
```
Open `http://localhost:3000/p/demo1234`.

Insert a sample pet in `pets` table:
- `public_id = 'demo1234'`
- `edit_pin = '123456'`
- `name = 'Milo'`

Generate a QR to `/p/demo1234`. On the page, enter PIN `123456` to add a vaccination and upload stamp images.

### SQL

Paste into Supabase SQL editor:

```sql
-- Pets
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  edit_pin text not null check (char_length(edit_pin) between 4 and 8),
  name text not null,
  species text check (species in ('dog','cat','other')) default 'dog',
  breed text, sex text, color text,
  birthdate date, weight_kg numeric(5,2),
  microchip text, avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Vaccinations
create table if not exists public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  date date not null,
  vaccine_name text not null,
  lot_no text, vet_name text,
  next_due date,
  notes text,
  images text[] not null default '{}'::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Views công khai
create or replace view public.public_pets as
  select public_id, name, species, breed, sex, color,
         birthdate, weight_kg, microchip, avatar_url, updated_at
  from public.pets;

create or replace view public.public_vaccinations as
  select v.id, p.public_id, v.date, v.vaccine_name, v.lot_no, v.vet_name,
         v.next_due, v.notes, v.images, v.created_at, v.updated_at
  from public.vaccinations v join public.pets p on p.id = v.pet_id;

-- RLS tối thiểu an toàn
alter table public.pets enable row level security;
alter table public.vaccinations enable row level security;

revoke all on table public.pets from anon;
revoke all on table public.vaccinations from anon;

grant select on table public.public_pets to anon;
grant select on table public.public_vaccinations to anon;

create policy if not exists deny_all_pets on public.pets for all to anon using (false) with check (false);
create policy if not exists deny_all_vacc on public.vaccinations for all to anon using (false) with check (false);

-- RPC: KHÔNG có delete
create or replace function public._pet_id_by_pin(p_public_id text, p_pin text)
returns uuid language plpgsql security definer as $$
declare pid uuid;
begin
  select id into pid from public.pets where public_id = p_public_id and edit_pin = p_pin;
  if pid is null then raise exception 'Invalid PIN or public_id'; end if;
  return pid;
end; $$;
revoke all on function public._pet_id_by_pin(text, text) from public;

create or replace function public.add_vac_with_pin(
  p_public_id text, p_pin text,
  p_date date, p_vaccine_name text,
  p_lot text default null, p_vet text default null,
  p_next_due date default null, p_notes text default null
) returns uuid language plpgsql security definer as $$
declare pid uuid; vid uuid;
begin
  pid := public._pet_id_by_pin(p_public_id, p_pin);
  insert into public.vaccinations(pet_id, date, vaccine_name, lot_no, vet_name, next_due, notes)
  values (pid, p_date, p_vaccine_name, p_lot, p_vet, p_next_due, p_notes)
  returning id into vid;
  return vid;
end; $$;
grant execute on function public.add_vac_with_pin(text, text, date, text, text, text, date, text) to anon;

create or replace function public.update_vac_with_pin(
  p_public_id text, p_pin text, p_vac_id uuid,
  p_date date, p_vaccine_name text,
  p_lot text default null, p_vet text default null,
  p_next_due date default null, p_notes text default null
) returns void language plpgsql security definer as $$
declare pid uuid; cnt int;
begin
  pid := public._pet_id_by_pin(p_public_id, p_pin);
  update public.vaccinations set
    date = p_date,
    vaccine_name = p_vaccine_name,
    lot_no = p_lot,
    vet_name = p_vet,
    next_due = p_next_due,
    notes = p_notes,
    updated_at = now()
  where id = p_vac_id and pet_id = pid;
  get diagnostics cnt = row_count;
  if cnt = 0 then raise exception 'Invalid vaccination id'; end if;
end; $$;
grant execute on function public.update_vac_with_pin(text, text, uuid, date, text, text, text, date, text) to anon;

create or replace function public.attach_vac_images_with_pin(
  p_public_id text, p_pin text, p_vac_id uuid, p_new_images text[]
) returns void language plpgsql security definer as $$
declare pid uuid;
begin
  pid := public._pet_id_by_pin(p_public_id, p_pin);
  update public.vaccinations set images = (
    select array_agg(distinct e)
    from unnest(images || coalesce(p_new_images, '{}')) as e
  ), updated_at = now()
  where id = p_vac_id and pet_id = pid;
end; $$;
grant execute on function public.attach_vac_images_with_pin(text, text, uuid, text[]) to anon;
```

### Acceptance tests

- Public page shows pet and vaccinations without PIN.
- With correct PIN, add new vaccination; record appears.
- Edit existing vaccination; fields update and `updated_at` changes.
- Upload 2 images; `images[]` has 2 public URLs; refresh shows them.
- No delete button; no delete RPC.
- Wrong PIN returns error “Invalid PIN or public_id”.
- Image >3MB blocked client-side.
- Public page excludes owner PII (pet-only info).



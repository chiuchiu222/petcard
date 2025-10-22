import { supa } from '@/lib/supabaseClient';
import EditPanel from './EditPanel';

export default async function Page({ params }: { params: { publicId: string } }) {
  const { data: pet } = await supa
    .from('public_pets')
    .select('*')
    .eq('public_id', params.publicId)
    .maybeSingle();

  if (!pet) return <main className="max-w-xl mx-auto p-6">Không tìm thấy hồ sơ.</main>;

  const { data: vacc } = await supa
    .from('public_vaccinations')
    .select('*')
    .eq('public_id', params.publicId)
    .order('date', { ascending: false });

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-4">
        {pet.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pet.avatar_url} alt="avatar" className="w-16 h-16 rounded-xl object-cover" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{pet.name}</h1>
          <p className="text-sm opacity-70">
            {pet.species} • {pet.breed || '–'} • {pet.sex || '–'}
          </p>
        </div>
      </header>

      <section>
        <h2 className="font-semibold mb-2">Lịch tiêm</h2>
        <ul className="space-y-3">
          {vacc?.map((v: any) => (
            <li key={v.id} className="p-3 rounded-xl border border-neutral-800">
              <div className="text-sm font-medium">{v.vaccine_name}</div>
              <div className="text-xs opacity-70">
                Ngày: {new Date(v.date).toLocaleDateString('vi-VN')}
              </div>
              {v.next_due && (
                <div className="text-xs opacity-70">
                  Hẹn: {new Date(v.next_due).toLocaleDateString('vi-VN')}
                </div>
              )}
              {v.images?.length ? (
                <div className="flex gap-2 mt-2 overflow-x-auto">
                  {v.images.map((u: string) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={u} src={u} alt="tem" className="h-16 w-auto rounded-md" />
                  ))}
                </div>
              ) : null}
              {v.notes && <div className="text-xs opacity-70 mt-1">{v.notes}</div>}
            </li>
          ))}
          {!vacc?.length && <div className="text-sm opacity-70">Chưa có dữ liệu</div>}
        </ul>
      </section>

      <EditPanel publicId={params.publicId} />
      <footer className="text-xs opacity-60">
        Cập nhật: {new Date(pet.updated_at).toLocaleDateString('vi-VN')}
      </footer>
    </main>
  );
}



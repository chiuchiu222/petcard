'use client';
import { useState, useEffect } from 'react';
import { supa } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function EditPanel({ publicId }: { publicId: string }) {
  const [pin, setPin] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    date: '', vaccine_name: '', lot_no: '', vet_name: '', next_due: '', notes: ''
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [vacIdToEdit, setVacIdToEdit] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const router = useRouter();

  const load = async () => {
    const { data } = await supa.from('public_vaccinations')
      .select('*').eq('public_id', publicId).order('date', { ascending: false });
    setList(data || []);
  };
  useEffect(() => { if (open) load(); }, [open]);

  const addOrUpdate = async () => {
    if (!pin) { alert('Nhập PIN.'); return; }
    if (!form.vaccine_name) { alert('Nhập tên vaccine.'); return; }
    setBusy(true);
    try {
      let vacId = vacIdToEdit;
      if (vacId) {
        const { error } = await supa.rpc('update_vac_with_pin', {
          p_public_id: publicId, p_pin: pin, p_vac_id: vacId,
          p_date: form.date || null, p_vaccine_name: form.vaccine_name,
          p_lot: form.lot_no || null, p_vet: form.vet_name || null,
          p_next_due: form.next_due || null, p_notes: form.notes || null,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supa.rpc('add_vac_with_pin', {
          p_public_id: publicId, p_pin: pin,
          p_date: form.date, p_vaccine_name: form.vaccine_name,
          p_lot: form.lot_no || null, p_vet: form.vet_name || null,
          p_next_due: form.next_due || null, p_notes: form.notes || null,
        });
        if (error) throw error;
        vacId = data as string;
        setVacIdToEdit(vacId!);
      }

      if (files?.length && vacId) {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (!f.type.startsWith('image/')) continue;
          if (f.size > 3 * 1024 * 1024) { alert('Ảnh >3MB, vui lòng giảm dung lượng.'); continue; }
          const ext = f.name.split('.').pop()?.toLowerCase() || 'jpg';
          const path = `${publicId}/${vacId}/${Date.now()}-${i}.${ext}`;
          const up = await supa.storage.from('vaccines').upload(path, f, { upsert: false, contentType: f.type });
          if (up.error) throw up.error;
          const { data: pub } = supa.storage.from('vaccines').getPublicUrl(path);
          urls.push(pub.publicUrl);
        }
        if (urls.length) {
          const { error } = await supa.rpc('attach_vac_images_with_pin', {
            p_public_id: publicId, p_pin: pin, p_vac_id: vacId, p_new_images: urls
          });
          if (error) throw error;
        }
      }

      alert('Đã lưu.');
      setVacIdToEdit(null);
      setFiles(null);
      setForm({ date: '', vaccine_name: '', lot_no: '', vet_name: '', next_due: '', notes: '' });
      await load();
      router.refresh();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 p-4 rounded-xl border border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm">
          Muốn <b>tự thêm/sửa</b> lịch tiêm? Nhập PIN (in ở mặt sau thẻ) rồi bấm Mở form.
        </div>
        <div className="flex items-center gap-2">
          <input value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN"
            className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700 w-24" />
          <button onClick={()=>setOpen(v=>!v)} className="px-3 py-1 rounded-md bg-emerald-600 text-white">
            {open? 'Đóng form':'Mở form'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Ngày
              <input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}
                className="mt-1 w-full px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700" />
            </label>
            <label className="text-sm">Tên vaccine
              <input value={form.vaccine_name} onChange={e=>setForm({...form, vaccine_name:e.target.value})}
                className="mt-1 w-full px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Số lô
              <input value={form.lot_no} onChange={e=>setForm({...form, lot_no:e.target.value})}
                className="mt-1 w-full px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700" />
            </label>
            <label className="text-sm">Bác sĩ/CSKH
              <input value={form.vet_name} onChange={e=>setForm({...form, vet_name:e.target.value})}
                className="mt-1 w-full px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Hẹn lần sau
              <input type="date" value={form.next_due} onChange={e=>setForm({...form, next_due:e.target.value})}
                className="mt-1 w-full px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700" />
            </label>
            <label className="text-sm">Ghi chú
              <input value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}
                className="mt-1 w-full px-2 py-1 rounded-md bg-neutral-900 border border-neutral-700" />
            </label>
          </div>

          <div className="text-sm">Ảnh tem vaccine (≤ 3MB/ảnh)
            <input type="file" multiple accept="image/*" onChange={e=>setFiles(e.target.files)} className="mt-1 block" />
          </div>

          <div className="flex gap-2">
            <button disabled={busy} onClick={addOrUpdate} className="px-3 py-2 rounded-md bg-emerald-600 text-white">Lưu</button>
            <button onClick={()=>{ setVacIdToEdit(null); setForm({ date: '', vaccine_name: '', lot_no: '', vet_name: '', next_due: '', notes: '' }); }} className="px-3 py-2 rounded-md border">Nhập bản mới</button>
          </div>

          <hr className="my-2 opacity-30" />
          <div>
            <div className="text-sm font-semibold mb-2">Sửa mũi đã có (KHÔNG XOÁ)</div>
            <ul className="space-y-2">
              {list.map((v:any)=> (
                <li key={v.id} className="p-2 rounded-md border border-neutral-800 flex items-center justify-between">
                  <div className="text-sm">{v.vaccine_name} • {new Date(v.date).toLocaleDateString('vi-VN')}</div>
                  <button onClick={()=>{ setVacIdToEdit(v.id); setForm({ date:v.date, vaccine_name:v.vaccine_name, lot_no:v.lot_no||'', vet_name:v.vet_name||'', next_due:v.next_due||'', notes:v.notes||'' }); }} className="px-2 py-1 text-xs rounded border">Chọn để sửa</button>
                </li>
              ))}
              {!list.length && <div className="text-xs opacity-70">Chưa có mũi nào.</div>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}



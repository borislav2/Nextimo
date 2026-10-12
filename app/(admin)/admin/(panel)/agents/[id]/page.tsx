import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateAgent } from "@/lib/actions/team";
import { Flash, PageTop } from "@/components/admin/ui";

export const metadata = { title: "Брокер" };

export default async function AgentPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; error?: string } }) {
  await requireAdmin();
  const u = await db.user.findUnique({ where: { id: params.id } });
  if (!u) notFound();

  return (
    <>
      <PageTop title={u.name} back="/admin/agents" />
      <Flash ok={searchParams.saved ? "Записано." : undefined} error={searchParams.error === "self" ? "Не можете да премахнете собствения си админ достъп." : undefined} />
      <form action={updateAgent.bind(null, u.id)} className="card pad" style={{ maxWidth: 760 }}>
        <div className="row" style={{ marginBottom: 16 }}>
          {u.photoUrl ? <img className="avatar" src={u.photoUrl} alt="" style={{ width: 72, height: 72 }} /> : <div className="avatar" style={{ width: 72, height: 72 }}>{u.name[0]}</div>}
          <div><label>Снимка</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></div>
        </div>
        <div className="form-grid">
          <div><label>Име</label><input name="name" required defaultValue={u.name} /></div>
          <div><label>Имейл</label><input value={u.email} disabled /></div>
          <div><label>Телефон</label><input name="phone" defaultValue={u.phone ?? ""} /></div>
          <div>
            <label>Роля</label>
            <select name="role" defaultValue={u.role}>
              <option value="AGENT">Брокер</option>
              <option value="ADMIN">Администратор</option>
            </select>
          </div>
          <div className="full"><label>Кратко представяне (BG)</label><textarea name="bioBg" defaultValue={u.bioBg ?? ""} style={{ minHeight: 70 }} /></div>
          <div className="full"><label>Кратко представяне (EN)</label><textarea name="bioEn" defaultValue={u.bioEn ?? ""} style={{ minHeight: 70 }} /></div>
          <div><label>Нова парола (празно = без промяна)</label><input name="password" type="text" minLength={8} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "end" }}>
            <label className="check"><input type="checkbox" name="active" defaultChecked={u.active} /> Активен (може да влиза)</label>
            <label className="check"><input type="checkbox" name="showOnSite" defaultChecked={u.showOnSite} /> Показва се на сайта</label>
          </div>
        </div>
        <button className="btn" style={{ marginTop: 14 }}>Запази</button>
      </form>
    </>
  );
}

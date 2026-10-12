import { requireUser } from "@/lib/auth";
import { changeOwnPassword } from "@/lib/actions/auth";
import { updateOwnProfile } from "@/lib/actions/team";
import { Flash, PageTop } from "@/components/admin/ui";

export const metadata = { title: "Профил" };

export default async function Profile({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const u = await requireUser();
  const err = searchParams.error === "wrong" ? "Текущата парола е грешна." : searchParams.error === "short" ? "Новата парола трябва да е поне 8 символа." : undefined;
  return (
    <>
      <PageTop title="Моят профил" />
      <Flash ok={searchParams.saved ? "Записано." : undefined} error={err} />
      <div className="two-col">
        <form action={updateOwnProfile} className="card pad">
          <div className="row" style={{ marginBottom: 16 }}>
            {u.photoUrl ? <img className="avatar" src={u.photoUrl} alt="" style={{ width: 72, height: 72 }} /> : <div className="avatar" style={{ width: 72, height: 72 }}>{u.name[0]}</div>}
            <div><label>Снимка (показва се на обявите)</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></div>
          </div>
          <div className="form-grid">
            <div><label>Име</label><input name="name" defaultValue={u.name} /></div>
            <div><label>Телефон</label><input name="phone" defaultValue={u.phone ?? ""} /></div>
            <div className="full"><label>Представяне (BG)</label><textarea name="bioBg" defaultValue={u.bioBg ?? ""} style={{ minHeight: 70 }} /></div>
            <div className="full"><label>Представяне (EN)</label><textarea name="bioEn" defaultValue={u.bioEn ?? ""} style={{ minHeight: 70 }} /></div>
          </div>
          <button className="btn" style={{ marginTop: 14 }}>Запази</button>
        </form>
        <form action={changeOwnPassword} className="card pad">
          <h3>Смяна на парола</h3>
          <div className="field"><label>Текуща парола</label><input name="current" type="password" required autoComplete="current-password" /></div>
          <div className="field"><label>Нова парола</label><input name="next" type="password" minLength={8} required autoComplete="new-password" /></div>
          <button className="btn">Смени паролата</button>
        </form>
      </div>
    </>
  );
}

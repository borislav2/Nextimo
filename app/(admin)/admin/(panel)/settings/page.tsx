import { getSettings } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateSettings } from "@/lib/actions/team";
import { Flash, PageTop } from "@/components/admin/ui";

export const metadata = { title: "Настройки" };

export default async function Settings({ searchParams }: { searchParams: { saved?: string } }) {
  await requireAdmin();
  const s = await getSettings();
  return (
    <>
      <PageTop title="Настройки на сайта" />
      <Flash ok={searchParams.saved ? "Записано. Промените вече са на сайта." : undefined} />
      <form action={updateSettings} className="grid" style={{ gap: 18, maxWidth: 900 }}>
        <div className="card pad">
          <h3>Контакти</h3>
          <div className="form-grid">
            <div className="full"><label>Име на фирмата</label><input name="companyName" defaultValue={s.companyName} /></div>
            <div><label>Телефон</label><input name="phone" defaultValue={s.phone} placeholder="089 916 3240" /></div>
            <div><label>Втори телефон</label><input name="phone2" defaultValue={s.phone2} /></div>
            <div><label>Имейл</label><input name="email" type="email" defaultValue={s.email} /></div>
            <div><label>Адрес (BG)</label><input name="addressBg" defaultValue={s.addressBg} /></div>
            <div><label>Адрес (EN)</label><input name="addressEn" defaultValue={s.addressEn} /></div>
            <div><label>Работно време (BG)</label><input name="hoursBg" defaultValue={s.hoursBg} /></div>
            <div><label>Работно време (EN)</label><input name="hoursEn" defaultValue={s.hoursEn} /></div>
            <div><label>Офис – ширина (lat), ако няма адрес</label><input name="mapLat" defaultValue={s.mapLat} /></div>
            <div><label>Офис – дължина (lng), ако няма адрес</label><input name="mapLng" defaultValue={s.mapLng} /></div>
            <div className="full"><label>Facebook</label><input name="facebook" defaultValue={s.facebook} /></div>
            <div className="full"><label>Instagram</label><input name="instagram" defaultValue={s.instagram} /></div>
          </div>
        </div>
        <div className="card pad">
          <h3>Страница „За нас“</h3>
          <p className="muted small">Оставете празно, за да се показва текстът по подразбиране.</p>
          <div className="field"><label>Текст (BG)</label><textarea name="aboutBg" rows={7} defaultValue={s.aboutBg} /></div>
          <div className="field"><label>Текст (EN)</label><textarea name="aboutEn" rows={7} defaultValue={s.aboutEn} /></div>
        </div>
        <div className="card pad">
          <h3>Сделки</h3>
          <div className="form-grid">
            <div><label>Комисиона по подразбиране (%)</label><input name="defaultCommissionPct" type="number" step="0.1" defaultValue={s.defaultCommissionPct} /></div>
          </div>
        </div>
        <div><button className="btn">Запази настройките</button></div>
      </form>
    </>
  );
}

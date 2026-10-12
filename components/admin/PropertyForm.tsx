import type { Client, Property, User } from "@prisma/client";
import {
  CONSTRUCTION, DEAL_TYPES, FEATURES, FURNISHING, HEATING, PLOVDIV_DISTRICTS, PROPERTY_STATUS, PROPERTY_TYPES,
} from "@/lib/constants";

type Props = {
  action: (fd: FormData) => Promise<void>;
  property?: Property | null;
  agents: Pick<User, "id" | "name">[];
  owners: Pick<Client, "id" | "name" | "phone">[];
  currentUserId: string;
};

export default function PropertyForm({ action, property: p, agents, owners, currentUserId }: Props) {
  const opts = (m: Record<string, { bg: string }>) => Object.entries(m).map(([k, v]) => <option key={k} value={k}>{v.bg}</option>);
  return (
    <form action={action} className="grid" style={{ gap: 18 }}>
      <div className="card pad">
        <h3>Основни данни</h3>
        <div className="form-grid">
          <div className="full"><label>Заглавие (BG) *</label><input name="titleBg" required defaultValue={p?.titleBg} placeholder="напр. Тристаен апартамент в Кършияка" /></div>
          <div className="full"><label>Заглавие (EN)</label><input name="titleEn" defaultValue={p?.titleEn ?? ""} /></div>
          <div><label>Тип сделка</label><select name="dealType" defaultValue={p?.dealType ?? "SALE"}>{opts(DEAL_TYPES)}</select></div>
          <div><label>Вид имот</label><select name="type" defaultValue={p?.type ?? "TWO_BED"}>{opts(PROPERTY_TYPES)}</select></div>
          <div><label>Статус</label><select name="status" defaultValue={p?.status ?? "DRAFT"}>{opts(PROPERTY_STATUS)}</select></div>
          <div><label>Цена (€){p?.dealType === "RENT" ? " / месец" : ""} *</label><input name="price" type="number" min={0} required defaultValue={p?.price} /></div>
          <div><label>Площ (м²) *</label><input name="area" type="number" step="0.1" min={0} required defaultValue={p?.area} /></div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "end", gap: 6 }}>
            <label className="check"><input type="checkbox" name="priceOnRequest" defaultChecked={p?.priceOnRequest} /> Цена при запитване</label>
            <label className="check"><input type="checkbox" name="featured" defaultChecked={p?.featured} /> Избран (на началната страница)</label>
          </div>
        </div>
      </div>

      <div className="card pad">
        <h3>Характеристики</h3>
        <div className="form-grid">
          <div><label>Стаи</label><input name="rooms" type="number" min={0} defaultValue={p?.rooms ?? ""} /></div>
          <div><label>Бани</label><input name="bathrooms" type="number" min={0} defaultValue={p?.bathrooms ?? ""} /></div>
          <div><label>Етаж</label><input name="floor" type="number" defaultValue={p?.floor ?? ""} /></div>
          <div><label>Етажа в сградата</label><input name="totalFloors" type="number" min={0} defaultValue={p?.totalFloors ?? ""} /></div>
          <div><label>Година на строителство</label><input name="yearBuilt" type="number" min={1800} max={2100} defaultValue={p?.yearBuilt ?? ""} /></div>
          <div>
            <label>Строителство</label>
            <input name="construction" list="construction-list" defaultValue={p?.construction ?? ""} />
            <datalist id="construction-list">{CONSTRUCTION.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label>Отопление</label>
            <input name="heating" list="heating-list" defaultValue={p?.heating ?? ""} />
            <datalist id="heating-list">{HEATING.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div><label>Обзавеждане</label><select name="furnishing" defaultValue={p?.furnishing ?? "UNFURNISHED"}>{opts(FURNISHING)}</select></div>
        </div>
        <label style={{ marginTop: 16 }}>Особености</label>
        <div className="row">
          {Object.entries(FEATURES).map(([k, v]) => (
            <label key={k} className="check" style={{ marginRight: 10 }}>
              <input type="checkbox" name="features" value={k} defaultChecked={p?.features.includes(k)} /> {v.bg}
            </label>
          ))}
        </div>
      </div>

      <div className="card pad">
        <h3>Местоположение</h3>
        <div className="form-grid">
          <div><label>Град</label><input name="city" defaultValue={p?.city ?? "Пловдив"} /></div>
          <div>
            <label>Квартал *</label>
            <input name="district" list="district-list" required defaultValue={p?.district ?? ""} />
            <datalist id="district-list">{PLOVDIV_DISTRICTS.map((d) => <option key={d} value={d} />)}</datalist>
          </div>
          <div className="full"><label>Адрес (по желание, показва се на сайта)</label><input name="address" defaultValue={p?.address ?? ""} /></div>
          <div><label>Ширина (lat)</label><input name="lat" defaultValue={p?.lat ?? ""} placeholder="42.1354" /></div>
          <div><label>Дължина (lng)</label><input name="lng" defaultValue={p?.lng ?? ""} placeholder="24.7453" /></div>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>Координати: десен клик върху мястото в Google Maps → копирайте числата. Без тях картата показва квартала.</p>
      </div>

      <div className="card pad">
        <h3>Описание</h3>
        <div className="field"><label>Описание (BG)</label><textarea name="descriptionBg" rows={8} defaultValue={p?.descriptionBg} /></div>
        <div className="field"><label>Описание (EN)</label><textarea name="descriptionEn" rows={6} defaultValue={p?.descriptionEn ?? ""} /></div>
      </div>

      <div className="card pad">
        <h3>Вътрешна информация</h3>
        <div className="form-grid">
          <div>
            <label>Отговорен брокер</label>
            <select name="agentId" defaultValue={p?.agentId ?? currentUserId}>
              <option value="">—</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label>Собственик (клиент)</label>
            <select name="ownerId" defaultValue={p?.ownerId ?? ""}>
              <option value="">— не е избран —</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}{o.phone ? ` · ${o.phone}` : ""}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card pad">
        <h3>{p ? "Добави още снимки" : "Снимки"}</h3>
        <input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple />
        <p className="muted small" style={{ marginTop: 8 }}>JPG, PNG или WEBP, до 10 MB всяка. Първата снимка е корица — редът се сменя след запис.</p>
      </div>

      <div className="row">
        <button className="btn">{p ? "Запази промените" : "Създай имота"}</button>
      </div>
    </form>
  );
}

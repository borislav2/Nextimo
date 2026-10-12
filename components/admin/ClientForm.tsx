import type { Client, User } from "@prisma/client";
import { CLIENT_TYPES, PROPERTY_TYPES } from "@/lib/constants";

type Props = {
  action: (fd: FormData) => Promise<void>;
  client?: Client | null;
  agents: Pick<User, "id" | "name">[];
  currentUserId: string;
};

export default function ClientForm({ action, client: c, agents, currentUserId }: Props) {
  return (
    <form action={action} className="card pad">
      <div className="form-grid">
        <div><label>Име *</label><input name="name" required defaultValue={c?.name} /></div>
        <div><label>Телефон</label><input name="phone" type="tel" defaultValue={c?.phone ?? ""} /></div>
        <div><label>Имейл</label><input name="email" type="email" defaultValue={c?.email ?? ""} /></div>
        <div>
          <label>Тип</label>
          <select name="type" defaultValue={c?.type ?? "BUYER"}>
            {Object.entries(CLIENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.bg}</option>)}
          </select>
        </div>
        <div><label>Източник</label><input name="source" list="sources" defaultValue={c?.source ?? ""} placeholder="Сайт, Facebook, alo.bg…" />
          <datalist id="sources">{["Сайт", "Facebook", "Instagram", "alo.bg", "imot.bg", "Препоръка", "Обаждане", "Офис"].map((x) => <option key={x} value={x} />)}</datalist>
        </div>
        <div>
          <label>Брокер</label>
          <select name="agentId" defaultValue={c?.agentId ?? currentUserId}>
            <option value="">—</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div><label>Бюджет от (€)</label><input name="budgetMin" type="number" min={0} defaultValue={c?.budgetMin ?? ""} /></div>
        <div><label>Бюджет до (€)</label><input name="budgetMax" type="number" min={0} defaultValue={c?.budgetMax ?? ""} /></div>
        <div className="full"><label>Желани квартали (със запетая)</label><input name="preferredDistricts" defaultValue={c?.preferredDistricts.join(", ") ?? ""} placeholder="Кършияка, Център" /></div>
        <div className="full">
          <label>Търси</label>
          <div className="row">
            {Object.entries(PROPERTY_TYPES).map(([k, v]) => (
              <label key={k} className="check" style={{ marginRight: 8 }}>
                <input type="checkbox" name="wantedTypes" value={k} defaultChecked={c?.wantedTypes.includes(k)} /> {v.bg}
              </label>
            ))}
          </div>
        </div>
        <div className="full"><label>Обобщение / изисквания</label><textarea name="notesSummary" defaultValue={c?.notesSummary ?? ""} /></div>
      </div>
      <button className="btn" style={{ marginTop: 14 }}>{c ? "Запази" : "Създай клиент"}</button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { CONTRACT_STATUS, CONTRACT_TYPES } from "@/lib/constants";

type Opt = { id: string; label: string };
export type ClientOpt = { id: string; name: string; phone: string; email: string; egn: string; idCard: string; address: string };
export type PropertyOpt = { id: string; label: string; price: number; dealType: "SALE" | "RENT"; ownerId: string };
type Party = { clientId: string; name: string; egn: string; idCard: string; address: string; phone: string; email: string };

const EMPTY: Party = { clientId: "", name: "", egn: "", idCard: "", address: "", phone: "", email: "" };

type Props = {
  action: (fd: FormData) => Promise<void>;
  contract?: {
    type: string; status: string; propertyId: string; partyA: Party; partyB: Party; price: number; deposit: number | null;
    commissionPct: number | null; termMonths: number | null; signedAt: string; notes: string; agentId: string | null; number: string;
  } | null;
  properties: PropertyOpt[];
  clients: ClientOpt[];
  agents: Opt[];
  defaults: { propertyId?: string; clientId?: string; agentId: string; commissionPct: number };
};

function fromClient(c: ClientOpt): Party {
  return { clientId: c.id, name: c.name, egn: c.egn, idCard: c.idCard, address: c.address, phone: c.phone, email: c.email };
}

const ROLES: Record<string, [string, string]> = {
  PRELIMINARY_SALE: ["Продавач", "Купувач"],
  RENT: ["Наемодател", "Наемател"],
  BROKERAGE: ["Възложител (собственик)", ""],
};

export default function ContractForm({ action, contract: c, properties, clients, agents, defaults }: Props) {
  const byId = new Map(clients.map((x) => [x.id, x]));
  const initialProperty = c?.propertyId ?? defaults.propertyId ?? "";
  const initialProp = properties.find((p) => p.id === initialProperty);

  const [type, setType] = useState(c?.type ?? (initialProp?.dealType === "RENT" ? "RENT" : "PRELIMINARY_SALE"));
  const [propertyId, setPropertyId] = useState(initialProperty);
  const [price, setPrice] = useState<string>(c ? String(c.price) : initialProp ? String(initialProp.price) : "");
  const [a, setA] = useState<Party>(c?.partyA ?? (initialProp?.ownerId && byId.get(initialProp.ownerId) ? fromClient(byId.get(initialProp.ownerId)!) : EMPTY));
  const [b, setB] = useState<Party>(c?.partyB ?? (defaults.clientId && byId.get(defaults.clientId) ? fromClient(byId.get(defaults.clientId)!) : EMPTY));

  const [roleA, roleB] = ROLES[type] ?? ROLES.PRELIMINARY_SALE;

  function pickProperty(id: string) {
    setPropertyId(id);
    const p = properties.find((x) => x.id === id);
    if (!p) return;
    setPrice(String(p.price));
    setType((t) => (p.dealType === "RENT" ? "RENT" : t === "RENT" ? "PRELIMINARY_SALE" : t));
    const owner = p.ownerId ? byId.get(p.ownerId) : null;
    if (owner) setA(fromClient(owner));
  }

  function partyFields(prefix: "a" | "b", p: Party, set: (p: Party) => void, role: string) {
    const upd = (k: keyof Party) => (e: React.ChangeEvent<HTMLInputElement>) => set({ ...p, [k]: e.target.value });
    return (
      <fieldset className="card pad" style={{ margin: 0 }}>
        <legend style={{ fontWeight: 700, padding: "0 6px" }}>{role}</legend>
        <input type="hidden" name={`${prefix}_clientId`} value={p.clientId} />
        <div className="form-grid">
          <div className="full">
            <label>Избери клиент (данните се попълват автоматично)</label>
            <select
              value={p.clientId}
              onChange={(e) => {
                const found = byId.get(e.target.value);
                set(found ? fromClient(found) : { ...EMPTY });
              }}
            >
              <option value="">— въведи ръчно —</option>
              {clients.map((x) => <option key={x.id} value={x.id}>{x.name}{x.phone ? ` · ${x.phone}` : ""}</option>)}
            </select>
          </div>
          <div className="full"><label>Три имена *</label><input name={`${prefix}_name`} value={p.name} onChange={upd("name")} /></div>
          <div><label>ЕГН / ЕИК</label><input name={`${prefix}_egn`} value={p.egn} onChange={upd("egn")} /></div>
          <div><label>Лична карта</label><input name={`${prefix}_idCard`} value={p.idCard} onChange={upd("idCard")} /></div>
          <div className="full"><label>Адрес</label><input name={`${prefix}_address`} value={p.address} onChange={upd("address")} /></div>
          <div><label>Телефон</label><input name={`${prefix}_phone`} value={p.phone} onChange={upd("phone")} /></div>
          <div><label>Имейл</label><input name={`${prefix}_email`} type="email" value={p.email} onChange={upd("email")} /></div>
        </div>
      </fieldset>
    );
  }

  return (
    <form action={action} className="grid" style={{ gap: 16 }}>
      <div className="card pad">
        <div className="form-grid">
          <div className="full">
            <label>Имот *</label>
            <select name="propertyId" required value={propertyId} onChange={(e) => pickProperty(e.target.value)}>
              <option value="">— изберете —</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label>Вид договор</label>
            <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.bg}</option>)}
            </select>
          </div>
          <div>
            <label>Статус</label>
            <select name="status" defaultValue={c?.status ?? "DRAFT"}>
              {Object.entries(CONTRACT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.bg}</option>)}
            </select>
          </div>
          <div>
            <label>{type === "RENT" ? "Месечен наем (€)" : type === "BROKERAGE" ? "Обявена цена (€)" : "Цена (€)"} *</label>
            <input name="price" type="number" min={0} required value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div><label>{type === "RENT" ? "Депозит (€)" : "Капаро (€)"}</label><input name="deposit" type="number" min={0} defaultValue={c?.deposit ?? ""} /></div>
          {type === "BROKERAGE" && <div><label>Комисиона %</label><input name="commissionPct" type="number" step="0.1" min={0} defaultValue={c?.commissionPct ?? defaults.commissionPct} /></div>}
          {type === "RENT" && <div><label>Срок (месеци)</label><input name="termMonths" type="number" min={1} defaultValue={c?.termMonths ?? 12} /></div>}
          <div><label>Дата на подписване</label><input name="signedAt" type="date" defaultValue={c?.signedAt ?? ""} /></div>
          <div>
            <label>Брокер</label>
            <select name="agentId" defaultValue={c?.agentId ?? defaults.agentId}>
              {agents.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </div>
          <div className="full"><label>Допълнителни клаузи / бележки</label><textarea name="notes" defaultValue={c?.notes ?? ""} /></div>
        </div>
      </div>

      {partyFields("a", a, setA, roleA)}
      {type === "BROKERAGE" ? <input type="hidden" name="b_name" value="" /> : partyFields("b", b, setB, roleB)}

      <div><button className="btn">{c ? "Запази" : "Създай договор"}</button></div>
    </form>
  );
}

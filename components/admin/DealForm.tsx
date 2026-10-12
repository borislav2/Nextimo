import type { Deal } from "@prisma/client";
import { DEAL_STATUS } from "@/lib/constants";

type Opt = { id: string; label: string };

type Props = {
  action: (fd: FormData) => Promise<void>;
  deal?: Deal | null;
  properties?: Opt[];
  clients?: Opt[];
  agents: Opt[];
  defaults: { propertyId?: string; clientId?: string; agentId: string; commissionPct: number };
};

export default function DealForm({ action, deal: d, properties, clients, agents, defaults }: Props) {
  return (
    <form action={action} className="card pad">
      <div className="form-grid">
        {properties && (
          <div className="full">
            <label>Имот *</label>
            <select name="propertyId" required defaultValue={defaults.propertyId || ""}>
              <option value="">— изберете —</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        )}
        {clients && (
          <div className="full">
            <label>Купувач / наемател *</label>
            <select name="clientId" required defaultValue={defaults.clientId || ""}>
              <option value="">— изберете —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label>Тип</label>
          <select name="type" defaultValue={d?.type ?? "SALE"}>
            <option value="SALE">Продажба</option>
            <option value="RENT">Наем</option>
          </select>
        </div>
        <div>
          <label>Статус</label>
          <select name="status" defaultValue={d?.status ?? "PENDING"}>
            {Object.entries(DEAL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.bg}</option>)}
          </select>
        </div>
        <div><label>Цена на сделката (€) *</label><input name="price" type="number" min={0} required defaultValue={d?.price} /></div>
        <div><label>Комисиона %</label><input name="commissionPct" type="number" step="0.1" min={0} defaultValue={d?.commissionPct ?? defaults.commissionPct} /></div>
        <div><label>Комисиона (€) — празно = автоматично</label><input name="commissionAmount" type="number" min={0} defaultValue={d?.commissionAmount ?? ""} /></div>
        <div><label>Дял на брокера %</label><input name="agentSharePct" type="number" step="1" min={0} max={100} defaultValue={d?.agentSharePct ?? 50} /></div>
        <div><label>Капаро (€)</label><input name="depositAmount" type="number" min={0} defaultValue={d?.depositAmount ?? ""} /></div>
        <div><label>Дата на приключване</label><input name="closedAt" type="date" defaultValue={d?.closedAt ? d.closedAt.toISOString().slice(0, 10) : ""} /></div>
        <div>
          <label>Брокер</label>
          <select name="agentId" defaultValue={d?.agentId ?? defaults.agentId}>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <div className="full"><label>Бележки (нотариус, срокове, условия)</label><textarea name="notes" defaultValue={d?.notes ?? ""} /></div>
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>„Капаро“ маркира имота като резервиран; „Приключена“ — като продаден/отдаден.</p>
      <button className="btn">{d ? "Запази" : "Създай сделка"}</button>
    </form>
  );
}

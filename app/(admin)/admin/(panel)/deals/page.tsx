import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db, getSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createDeal } from "@/lib/actions/schedule";
import { DEAL_STATUS, DEAL_TYPES, label } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import DealForm from "@/components/admin/DealForm";
import { Empty, Flash, PageTop, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Сделки" };

export default async function Deals({ searchParams }: { searchParams: { status?: string; year?: string; client?: string; saved?: string; error?: string } }) {
  const user = await requireUser();
  const year = parseInt(searchParams.year || "") || new Date().getFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  const where: Prisma.DealWhereInput = {};
  if (searchParams.status) where.status = searchParams.status as Prisma.DealWhereInput["status"];

  const [deals, closedYear, properties, clients, agents, settings] = await Promise.all([
    db.deal.findMany({
      where,
      include: { property: { select: { id: true, refNo: true, titleBg: true } }, client: { select: { id: true, name: true } }, agent: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    db.deal.findMany({ where: { status: "CLOSED", closedAt: { gte: yearStart, lt: yearEnd } }, include: { agent: { select: { id: true, name: true } } } }),
    db.property.findMany({ where: { status: { in: ["ACTIVE", "RESERVED"] } }, select: { id: true, refNo: true, titleBg: true }, orderBy: { refNo: "desc" } }),
    db.client.findMany({ where: { type: { in: ["BUYER", "TENANT"] } }, select: { id: true, name: true, phone: true }, orderBy: { updatedAt: "desc" }, take: 500 }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    getSettings(),
  ]);

  const total = closedYear.reduce((a, d) => a + d.commissionAmount, 0);
  const volume = closedYear.reduce((a, d) => a + d.price, 0);
  const byAgent = new Map<string, { name: string; count: number; commission: number; share: number }>();
  for (const d of closedYear) {
    const k = d.agent?.id ?? "-";
    const row = byAgent.get(k) ?? { name: d.agent?.name ?? "Без брокер", count: 0, commission: 0, share: 0 };
    row.count++;
    row.commission += d.commissionAmount;
    row.share += (d.commissionAmount * d.agentSharePct) / 100;
    byAgent.set(k, row);
  }
  const byMonth = Array.from({ length: 12 }, (_, m) =>
    closedYear.filter((d) => d.closedAt && d.closedAt.getUTCMonth() === m).reduce((a, d) => a + d.commissionAmount, 0),
  );
  const maxMonth = Math.max(1, ...byMonth);
  const months = ["Ян", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];

  return (
    <>
      <PageTop title="Сделки и комисиони">
        <Link href={`/admin/deals?year=${year - 1}`} className="btn secondary small">← {year - 1}</Link>
        <b>{year}</b>
        <Link href={`/admin/deals?year=${year + 1}`} className="btn secondary small">{year + 1} →</Link>
      </PageTop>
      <Flash ok={searchParams.saved ? "Сделката е записана." : undefined} error={searchParams.error ? "Изберете имот и клиент." : undefined} />

      <div className="kpis">
        <div className="card kpi"><span>Приключени сделки {year}</span><b>{closedYear.length}</b></div>
        <div className="card kpi"><span>Комисиони {year}</span><b>{formatPrice(total)}</b></div>
        <div className="card kpi"><span>Обем на сделките</span><b>{formatPrice(volume)}</b></div>
      </div>

      <div className="two-col" style={{ marginBottom: 22 }}>
        <div className="card pad">
          <h3>Комисиони по месеци</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, marginTop: 12 }}>
            {byMonth.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }} title={formatPrice(v)}>
                <div style={{ width: "100%", maxWidth: 28, height: `${(v / maxMonth) * 100}%`, minHeight: v ? 4 : 1, background: v ? "var(--red)" : "var(--line)", borderRadius: "4px 4px 0 0" }} />
                <span className="muted" style={{ fontSize: 11 }}>{months[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card pad">
          <h3>По брокери</h3>
          {byAgent.size === 0 ? <p className="muted small">Няма приключени сделки.</p> : (
            <table className="table">
              <thead><tr><th>Брокер</th><th>Бр.</th><th>Дял</th></tr></thead>
              <tbody>
                {[...byAgent.values()].sort((a, b) => b.commission - a.commission).map((r) => (
                  <tr key={r.name}><td>{r.name}</td><td>{r.count}</td><td>{formatPrice(Math.round(r.share))}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="toolbar">
            <Link href="/admin/deals" className={`btn small ${searchParams.status ? "secondary" : ""}`}>Всички</Link>
            {Object.entries(DEAL_STATUS).map(([k, v]) => (
              <Link key={k} href={`/admin/deals?status=${k}`} className={`btn small ${searchParams.status === k ? "" : "secondary"}`}>{v.bg}</Link>
            ))}
          </div>
          {deals.length === 0 ? <Empty>Няма сделки.</Empty> : (
            <div className="card table-wrap">
              <table className="table">
                <thead><tr><th>Имот</th><th>Клиент</th><th>Цена</th><th>Комисиона</th><th>Статус</th><th>Дата</th></tr></thead>
                <tbody>
                  {deals.map((d) => (
                    <tr key={d.id}>
                      <td><Link href={`/admin/deals/${d.id}`} style={{ fontWeight: 700 }}>{d.property.refNo}</Link><div className="muted small">{d.property.titleBg}</div></td>
                      <td><Link href={`/admin/clients/${d.client.id}`}>{d.client.name}</Link><div className="muted small">{label(DEAL_TYPES, d.type)} · {d.agent?.name}</div></td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatPrice(d.price)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatPrice(d.commissionAmount)}<div className="muted small">{d.commissionPct}%</div></td>
                      <td><StatusBadge kind="deal" value={d.status} /></td>
                      <td className="small muted">{d.closedAt ? formatDate(d.closedAt) : formatDate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3>Нова сделка</h3>
          <DealForm
            action={createDeal}
            properties={properties.map((p) => ({ id: p.id, label: `${p.refNo} · ${p.titleBg}` }))}
            clients={clients.map((c) => ({ id: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}` }))}
            agents={agents.map((a) => ({ id: a.id, label: a.name }))}
            defaults={{ clientId: searchParams.client, agentId: user.id, commissionPct: settings.defaultCommissionPct }}
          />
        </div>
      </div>
    </>
  );
}

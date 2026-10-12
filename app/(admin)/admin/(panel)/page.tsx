import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import { INQUIRY_KINDS, label } from "@/lib/constants";
import { Flash, PageTop, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Табло" };

export default async function Dashboard({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await requireUser();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  const [active, forSale, forRent, newInq, upcoming, closedMonth, pipelineDeals, latestInq, topViewed] = await Promise.all([
    db.property.count({ where: { status: "ACTIVE" } }),
    db.property.count({ where: { status: "ACTIVE", dealType: "SALE" } }),
    db.property.count({ where: { status: "ACTIVE", dealType: "RENT" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.viewing.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: now, lte: weekEnd } },
      include: { property: { select: { titleBg: true, refNo: true, id: true } }, client: { select: { name: true, phone: true, id: true } }, agent: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    db.deal.findMany({ where: { status: "CLOSED", closedAt: { gte: monthStart } }, select: { commissionAmount: true, agentId: true, agentSharePct: true } }),
    db.deal.aggregate({ where: { status: { in: ["PENDING", "DEPOSIT"] } }, _sum: { commissionAmount: true }, _count: true }),
    db.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { property: { select: { refNo: true } } } }),
    db.property.findMany({ where: { status: "ACTIVE" }, orderBy: { views: "desc" }, take: 5, select: { id: true, titleBg: true, views: true, refNo: true } }),
  ]);

  const commissionMonth = closedMonth.reduce((a, d) => a + d.commissionAmount, 0);
  const myShare = closedMonth.filter((d) => d.agentId === user.id).reduce((a, d) => a + (d.commissionAmount * d.agentSharePct) / 100, 0);

  return (
    <>
      <PageTop title={`Здравейте, ${user.name.split(" ")[0]}`}>
        <Link href="/admin/properties/new" className="btn">+ Нов имот</Link>
      </PageTop>
      <Flash error={searchParams.denied ? "Само администратор има достъп до тази страница." : undefined} />

      <div className="kpis">
        <div className="card kpi"><span>Активни обяви</span><b>{active}</b><div className="muted small">{forSale} продажби · {forRent} наеми</div></div>
        <Link href="/admin/inquiries?status=NEW" className="card kpi"><span>Нови запитвания</span><b style={{ color: newInq ? "var(--red)" : undefined }}>{newInq}</b></Link>
        <div className="card kpi"><span>Огледи (7 дни)</span><b>{upcoming.length}</b></div>
        <div className="card kpi"><span>Комисиони този месец</span><b>{formatPrice(commissionMonth)}</b><div className="muted small">ваш дял: {formatPrice(Math.round(myShare))}</div></div>
        <div className="card kpi"><span>Сделки в процес</span><b>{pipelineDeals._count}</b><div className="muted small">очаквано: {formatPrice(pipelineDeals._sum.commissionAmount ?? 0)}</div></div>
      </div>

      <div className="two-col">
        <div className="card pad">
          <div className="row" style={{ marginBottom: 8 }}><h3 style={{ margin: 0 }}>Предстоящи огледи</h3><div className="spacer" /><Link href="/admin/viewings" className="btn secondary small">Всички</Link></div>
          {upcoming.length === 0 ? <p className="muted small">Няма насрочени огледи през следващите 7 дни.</p> : (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {upcoming.map((v) => (
                    <tr key={v.id}>
                      <td style={{ whiteSpace: "nowrap" }}><b>{formatDate(v.startsAt)}</b><div className="muted small">{formatTime(v.startsAt)}</div></td>
                      <td><Link href={`/admin/properties/${v.property.id}`}>{v.property.titleBg}</Link><div className="muted small">{v.property.refNo}</div></td>
                      <td><Link href={`/admin/clients/${v.client.id}`}>{v.client.name}</Link><div className="muted small">{v.client.phone}</div></td>
                      <td className="muted small">{v.agent?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card pad">
            <div className="row" style={{ marginBottom: 8 }}><h3 style={{ margin: 0 }}>Последни запитвания</h3><div className="spacer" /><Link href="/admin/inquiries" className="btn secondary small">Всички</Link></div>
            <ul className="timeline">
              {latestInq.map((q) => (
                <li key={q.id}>
                  <div className="row"><b>{q.name}</b><StatusBadge kind="inquiry" value={q.status} /></div>
                  <div className="muted small">{label(INQUIRY_KINDS, q.kind)}{q.property ? ` · ${q.property.refNo}` : ""} · {formatDate(q.createdAt, "bg", true)}</div>
                </li>
              ))}
              {latestInq.length === 0 && <li className="muted small">Още няма запитвания.</li>}
            </ul>
          </div>
          <div className="card pad">
            <h3>Най-гледани обяви</h3>
            <ul className="timeline">
              {topViewed.map((p) => (
                <li key={p.id} className="row"><Link href={`/admin/properties/${p.id}`} style={{ flex: 1 }}>{p.titleBg}</Link><span className="muted small">{p.views} 👁</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

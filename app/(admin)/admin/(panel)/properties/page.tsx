import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DEAL_TYPES, PROPERTY_STATUS, PROPERTY_TYPES, label } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { Empty, PageTop, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Имоти" };

export default async function AdminProperties({ searchParams }: { searchParams: { q?: string; status?: string; deal?: string; agent?: string } }) {
  const where: Prisma.PropertyWhereInput = {};
  if (searchParams.status) where.status = searchParams.status as Prisma.PropertyWhereInput["status"];
  else where.status = { not: "ARCHIVED" };
  if (searchParams.deal) where.dealType = searchParams.deal as Prisma.PropertyWhereInput["dealType"];
  if (searchParams.agent) where.agentId = searchParams.agent;
  if (searchParams.q) {
    const q = searchParams.q;
    where.OR = [
      { titleBg: { contains: q, mode: "insensitive" } },
      { refNo: { contains: q, mode: "insensitive" } },
      { district: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, agents] = await Promise.all([
    db.property.findMany({
      where,
      include: { images: { orderBy: { order: "asc" }, take: 1 }, agent: { select: { name: true } }, _count: { select: { inquiries: true, viewings: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageTop title="Имоти">
        <Link href="/admin/properties/new" className="btn">+ Нов имот</Link>
      </PageTop>

      <form className="toolbar">
        <input name="q" placeholder="Търси заглавие, реф. №, квартал…" defaultValue={searchParams.q} />
        <select name="status" defaultValue={searchParams.status || ""}>
          <option value="">Всички (без архив)</option>
          {Object.entries(PROPERTY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.bg}</option>)}
        </select>
        <select name="deal" defaultValue={searchParams.deal || ""}>
          <option value="">Продажба и наем</option>
          {Object.entries(DEAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v.bg}</option>)}
        </select>
        <select name="agent" defaultValue={searchParams.agent || ""}>
          <option value="">Всички брокери</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="btn secondary">Филтрирай</button>
      </form>

      {items.length === 0 ? (
        <Empty>Няма имоти. <Link href="/admin/properties/new" style={{ color: "var(--red)" }}>Добавете първия.</Link></Empty>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th></th><th>Имот</th><th>Цена</th><th>Статус</th><th>Брокер</th><th>Запитв.</th><th>Огледи</th><th>Прегледи</th></tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.images[0] ? <img className="thumb" src={p.images[0].url} alt="" /> : <div className="thumb" />}</td>
                  <td>
                    <Link href={`/admin/properties/${p.id}`} style={{ fontWeight: 700 }}>{p.titleBg}</Link>
                    <div className="muted small">{p.refNo} · {label(DEAL_TYPES, p.dealType)} · {label(PROPERTY_TYPES, p.type)} · {p.district} · {p.area} м²{p.featured ? " · ★" : ""}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatPrice(p.price)}</td>
                  <td><StatusBadge kind="property" value={p.status} /></td>
                  <td>{p.agent?.name ?? "—"}</td>
                  <td>{p._count.inquiries}</td>
                  <td>{p._count.viewings}</td>
                  <td>{p.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

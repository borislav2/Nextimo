import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CLIENT_TYPES, label } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import { Empty, PageTop } from "@/components/admin/ui";

export const metadata = { title: "Клиенти" };

export default async function Clients({ searchParams }: { searchParams: { q?: string; type?: string; mine?: string } }) {
  const user = await requireUser();
  const where: Prisma.ClientWhereInput = {};
  if (searchParams.type) where.type = searchParams.type as Prisma.ClientWhereInput["type"];
  if (searchParams.mine) where.agentId = user.id;
  if (searchParams.q) {
    const q = searchParams.q;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const clients = await db.client.findMany({
    where,
    include: { agent: { select: { name: true } }, _count: { select: { viewings: true, deals: true, ownedProperties: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return (
    <>
      <PageTop title="Клиенти">
        <Link href="/admin/clients/new" className="btn">+ Нов клиент</Link>
      </PageTop>
      <form className="toolbar">
        <input name="q" placeholder="Име, телефон, имейл…" defaultValue={searchParams.q} />
        <select name="type" defaultValue={searchParams.type || ""}>
          <option value="">Всички типове</option>
          {Object.entries(CLIENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.bg}</option>)}
        </select>
        <label className="check" style={{ alignSelf: "center", margin: 0 }}><input type="checkbox" name="mine" value="1" defaultChecked={!!searchParams.mine} /> Само мои</label>
        <button className="btn secondary">Търси</button>
      </form>

      {clients.length === 0 ? <Empty>Няма клиенти.</Empty> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Име</th><th>Контакт</th><th>Тип</th><th>Бюджет</th><th>Квартали</th><th>Огледи</th><th>Брокер</th><th>Обновен</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/clients/${c.id}`} style={{ fontWeight: 700 }}>{c.name}</Link>{c.source && <div className="muted small">{c.source}</div>}</td>
                  <td className="small">{c.phone && <div><a href={`tel:${c.phone}`}>{c.phone}</a></div>}{c.email}</td>
                  <td><span className="badge">{label(CLIENT_TYPES, c.type)}</span>{c._count.ownedProperties > 0 && <div className="muted small">{c._count.ownedProperties} имота</div>}</td>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{c.budgetMax ? `${c.budgetMin ? formatPrice(c.budgetMin) + " – " : "до "}${formatPrice(c.budgetMax)}` : "—"}</td>
                  <td className="small">{c.preferredDistricts.join(", ") || "—"}</td>
                  <td>{c._count.viewings}</td>
                  <td className="small">{c.agent?.name ?? "—"}</td>
                  <td className="small muted">{formatDate(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CONTRACT_TYPES, label } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import { Empty, PageTop, StatusBadge } from "@/components/admin/ui";
import type { Party } from "@/lib/actions/contracts";

export const metadata = { title: "Договори" };

export default async function Contracts() {
  await requireUser();
  const contracts = await db.contract.findMany({
    include: { property: { select: { id: true, refNo: true, titleBg: true } }, agent: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <>
      <PageTop title="Договори">
        <Link href="/admin/contracts/new" className="btn small">+ Нов договор</Link>
      </PageTop>
      {contracts.length === 0 ? <Empty>Още няма договори.</Empty> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>№</th><th>Вид</th><th>Имот</th><th>Страни</th><th>Сума</th><th>Статус</th><th>Дата</th></tr></thead>
            <tbody>
              {contracts.map((c) => {
                const a = c.partyA as unknown as Party;
                const b = c.partyB as unknown as Party;
                return (
                  <tr key={c.id}>
                    <td><Link href={`/admin/contracts/${c.id}`} style={{ fontWeight: 700 }}>{c.number}</Link></td>
                    <td>{label(CONTRACT_TYPES, c.type)}</td>
                    <td><Link href={`/admin/properties/${c.property.id}`}>{c.property.refNo}</Link><div className="muted small">{c.property.titleBg}</div></td>
                    <td className="small">{a.name}{b.name ? <> → {b.name}</> : null}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatPrice(c.price)}</td>
                    <td><StatusBadge kind="contract" value={c.status} /></td>
                    <td className="small muted">{formatDate(c.signedAt ?? c.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

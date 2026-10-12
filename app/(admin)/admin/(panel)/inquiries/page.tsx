import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { INQUIRY_KINDS, INQUIRY_STATUS, label } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { assignInquiry, deleteInquiry, inquiryToClient, setInquiryStatus } from "@/lib/actions/crm";
import { Empty, PageTop } from "@/components/admin/ui";
import AutoSubmitSelect from "@/components/admin/AutoSubmitSelect";
import ConfirmButton from "@/components/admin/ConfirmButton";

export const metadata = { title: "Запитвания" };

export default async function Inquiries({ searchParams }: { searchParams: { status?: string; view?: string; mine?: string } }) {
  const user = await requireUser();
  const where: Prisma.InquiryWhereInput = {};
  if (searchParams.status) where.status = searchParams.status as Prisma.InquiryWhereInput["status"];
  if (searchParams.mine) where.agentId = user.id;
  const board = searchParams.view === "board";

  const [items, agents] = await Promise.all([
    db.inquiry.findMany({
      where: board ? { ...where, status: undefined, createdAt: { gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) } } : where,
      include: { property: { select: { id: true, refNo: true, titleBg: true } }, agent: { select: { name: true } }, client: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const statusOptions = Object.entries(INQUIRY_STATUS).map(([k, v]) => ({ value: k, label: v.bg }));
  const agentOptions = [{ value: "", label: "— няма —" }, ...agents.map((a) => ({ value: a.id, label: a.name }))];

  return (
    <>
      <PageTop title="Запитвания">
        <Link href={`/admin/inquiries${board ? "" : "?view=board"}`} className="btn secondary small">{board ? "Таблица" : "Етапи (pipeline)"}</Link>
      </PageTop>

      {!board && (
        <div className="toolbar">
          <Link href="/admin/inquiries" className={`btn small ${!searchParams.status && !searchParams.mine ? "" : "secondary"}`}>Всички</Link>
          {Object.entries(INQUIRY_STATUS).map(([k, v]) => (
            <Link key={k} href={`/admin/inquiries?status=${k}`} className={`btn small ${searchParams.status === k ? "" : "secondary"}`}>{v.bg}</Link>
          ))}
          <Link href="/admin/inquiries?mine=1" className={`btn small ${searchParams.mine ? "" : "secondary"}`}>Мои</Link>
        </div>
      )}

      {items.length === 0 ? <Empty>Няма запитвания тук.</Empty> : board ? (
        <div className="pipeline">
          {Object.entries(INQUIRY_STATUS).map(([k, v]) => {
            const col = items.filter((q) => q.status === k);
            return (
              <div key={k} className="col">
                <h3><span>{v.bg}</span><span>{col.length}</span></h3>
                {col.map((q) => (
                  <div key={q.id} className="item">
                    <b>{q.name}</b>
                    <div className="muted small">{q.phone}</div>
                    <div className="muted small">{label(INQUIRY_KINDS, q.kind)}{q.property ? ` · ${q.property.refNo}` : ""}</div>
                    <div className="row" style={{ marginTop: 6 }}>
                      <AutoSubmitSelect action={setInquiryStatus.bind(null, q.id)} name="status" value={q.status} options={statusOptions} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Дата</th><th>Клиент</th><th>Тип / имот</th><th>Съобщение</th><th>Статус</th><th>Брокер</th><th></th></tr></thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id}>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDate(q.createdAt, "bg", true)}</td>
                  <td>
                    <b>{q.name}</b>
                    <div className="small">{q.phone && <a href={`tel:${q.phone}`}>{q.phone}</a>}</div>
                    {q.email && <div className="small"><a href={`mailto:${q.email}`}>{q.email}</a></div>}
                    {q.lang === "en" && <span className="badge">EN</span>}
                  </td>
                  <td className="small">
                    {label(INQUIRY_KINDS, q.kind)}
                    {q.property && <div><Link href={`/admin/properties/${q.property.id}`} style={{ color: "var(--red)" }}>{q.property.refNo}</Link> {q.property.titleBg}</div>}
                    {q.preferredDate && <div className="muted">Оглед: {q.preferredDate}</div>}
                  </td>
                  <td className="small" style={{ maxWidth: 280 }}>{q.message}</td>
                  <td><AutoSubmitSelect action={setInquiryStatus.bind(null, q.id)} name="status" value={q.status} options={statusOptions} /></td>
                  <td><AutoSubmitSelect action={assignInquiry.bind(null, q.id)} name="agentId" value={q.agentId ?? ""} options={agentOptions} /></td>
                  <td>
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <form action={inquiryToClient.bind(null, q.id)}><button className="btn secondary small">{q.client ? "Клиент →" : "→ Клиент"}</button></form>
                      {user.role === "ADMIN" && (
                        <form action={deleteInquiry.bind(null, q.id)}><ConfirmButton message="Изтриване на запитването?" className="btn ghost small">✕</ConfirmButton></form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

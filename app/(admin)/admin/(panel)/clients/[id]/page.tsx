import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma, PropertyType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addClientNote, deleteClient, updateClient } from "@/lib/actions/crm";
import ClientForm from "@/components/admin/ClientForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageTop, StatusBadge } from "@/components/admin/ui";
import { CLIENT_TYPES, INQUIRY_KINDS, label } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata = { title: "Клиент" };

export default async function ClientPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; error?: string } }) {
  const user = await requireUser();
  const c = await db.client.findUnique({
    where: { id: params.id },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      inquiries: { orderBy: { createdAt: "desc" }, include: { property: { select: { id: true, refNo: true } } } },
      viewings: { orderBy: { startsAt: "desc" }, include: { property: { select: { id: true, titleBg: true, refNo: true } } } },
      deals: { include: { property: { select: { refNo: true } } } },
      ownedProperties: { select: { id: true, titleBg: true, refNo: true, status: true } },
    },
  });
  if (!c) notFound();

  const agents = await db.user.findMany({ where: { active: true }, select: { id: true, name: true } });

  // Matching listings for buyers / tenants
  let matches: { id: string; titleBg: string; refNo: string; price: number; district: string; area: number }[] = [];
  if (c.type === "BUYER" || c.type === "TENANT") {
    const where: Prisma.PropertyWhereInput = { status: "ACTIVE", dealType: c.type === "TENANT" ? "RENT" : "SALE" };
    if (c.budgetMax) where.price = { lte: Math.round(c.budgetMax * 1.05), ...(c.budgetMin ? { gte: Math.round(c.budgetMin * 0.9) } : {}) };
    if (c.preferredDistricts.length) where.district = { in: c.preferredDistricts };
    if (c.wantedTypes.length) where.type = { in: c.wantedTypes as PropertyType[] };
    const seen = new Set(c.viewings.map((v) => v.property.id));
    matches = (await db.property.findMany({ where, take: 12, orderBy: { createdAt: "desc" }, select: { id: true, titleBg: true, refNo: true, price: true, district: true, area: true } }))
      .filter((p) => !seen.has(p.id));
  }

  return (
    <>
      <PageTop title={c.name} back="/admin/clients">
        <span className="badge">{label(CLIENT_TYPES, c.type)}</span>
        {c.phone && <a href={`tel:${c.phone}`} className="btn secondary small">📞 {c.phone}</a>}
        {c.phone && <a href={`viber://chat?number=${encodeURIComponent(c.phone.replace(/\s/g, ""))}`} className="btn secondary small">Viber</a>}
        <Link href={`/admin/viewings?client=${c.id}`} className="btn small">+ Оглед</Link>
        <Link href={`/admin/contracts/new?client=${c.id}`} className="btn secondary small">+ Договор</Link>
      </PageTop>
      <Flash ok={searchParams.saved ? "Записано." : undefined} error={searchParams.error === "deals" ? "Клиентът има сделки и не може да бъде изтрит." : undefined} />

      <div className="two-col">
        <div className="grid" style={{ gap: 18 }}>
          <div className="card pad">
            <h3>Бележки и история</h3>
            <form action={addClientNote.bind(null, c.id)} className="row" style={{ alignItems: "flex-end", marginBottom: 12 }}>
              <textarea name="text" placeholder="Обаждане, изисквания, обратна връзка…" style={{ minHeight: 60, flex: 1 }} required />
              <button className="btn">Добави</button>
            </form>
            <ul className="timeline">
              {c.notes.map((n) => (
                <li key={n.id}>
                  <div className="muted small">{formatDate(n.createdAt, "bg", true)} · {n.author?.name ?? "—"}</div>
                  <div style={{ whiteSpace: "pre-line" }}>{n.text}</div>
                </li>
              ))}
              {c.notes.length === 0 && <li className="muted small">Още няма бележки.</li>}
            </ul>
          </div>

          {matches.length > 0 && (
            <div className="card pad">
              <h3>Подходящи имоти ({matches.length})</h3>
              <p className="muted small">По бюджет, квартали и вид, без вече огледаните.</p>
              <ul className="timeline">
                {matches.map((p) => (
                  <li key={p.id} className="row">
                    <Link href={`/admin/properties/${p.id}`} style={{ flex: 1 }}><b>{p.refNo}</b> {p.titleBg}</Link>
                    <span className="small muted">{p.district} · {p.area} м²</span>
                    <b className="small">{formatPrice(p.price)}</b>
                    <Link href={`/admin/viewings?client=${c.id}&property=${p.id}`} className="btn secondary small">Оглед</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ClientForm action={updateClient.bind(null, c.id)} client={c} agents={agents} currentUserId={user.id} />
        </div>

        <aside className="grid" style={{ gap: 16 }}>
          <div className="card pad">
            <h3>Огледи ({c.viewings.length})</h3>
            <ul className="timeline">
              {c.viewings.map((v) => (
                <li key={v.id}>
                  <div className="row"><b className="small">{formatDate(v.startsAt, "bg", true)}</b><StatusBadge kind="viewing" value={v.status} /></div>
                  <Link href={`/admin/properties/${v.property.id}`}>{v.property.refNo} · {v.property.titleBg}</Link>
                  {v.feedback && <div className="muted small">{v.feedback}</div>}
                </li>
              ))}
              {c.viewings.length === 0 && <li className="muted small">Няма огледи.</li>}
            </ul>
          </div>

          {c.ownedProperties.length > 0 && (
            <div className="card pad">
              <h3>Имоти на клиента</h3>
              <ul className="timeline">
                {c.ownedProperties.map((p) => (
                  <li key={p.id} className="row"><Link href={`/admin/properties/${p.id}`} style={{ flex: 1 }}>{p.refNo} · {p.titleBg}</Link><StatusBadge kind="property" value={p.status} /></li>
                ))}
              </ul>
            </div>
          )}

          <div className="card pad">
            <h3>Запитвания</h3>
            <ul className="timeline">
              {c.inquiries.map((q) => (
                <li key={q.id}>
                  <div className="row"><span className="small">{label(INQUIRY_KINDS, q.kind)}</span><StatusBadge kind="inquiry" value={q.status} /></div>
                  <div className="muted small">{formatDate(q.createdAt)}{q.property ? ` · ${q.property.refNo}` : ""}</div>
                </li>
              ))}
              {c.inquiries.length === 0 && <li className="muted small">Няма.</li>}
            </ul>
          </div>

          <div className="card pad">
            <div className="row"><h3 style={{ margin: 0 }}>Сделки</h3><div className="spacer" /><Link href={`/admin/deals?client=${c.id}`} className="btn secondary small">+ Сделка</Link></div>
            <ul className="timeline">
              {c.deals.map((d) => (
                <li key={d.id} className="row"><Link href={`/admin/deals/${d.id}`} style={{ flex: 1 }}>{d.property.refNo} · {formatPrice(d.price)}</Link><StatusBadge kind="deal" value={d.status} /></li>
              ))}
              {c.deals.length === 0 && <li className="muted small">Няма.</li>}
            </ul>
          </div>

          {user.role === "ADMIN" && (
            <form action={deleteClient.bind(null, c.id)}>
              <ConfirmButton message="Изтриване на клиента и всички негови бележки и огледи?">Изтрий клиента</ConfirmButton>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}

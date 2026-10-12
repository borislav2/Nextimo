import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  deleteProperty, deletePropertyImage, duplicateProperty, moveImage, updateProperty,
} from "@/lib/actions/properties";
import PropertyForm from "@/components/admin/PropertyForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageTop, StatusBadge } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { INQUIRY_KINDS, label } from "@/lib/constants";

export const metadata = { title: "Редакция на имот" };

export default async function EditProperty({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; archived?: string } }) {
  const user = await requireUser();
  const p = await db.property.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { order: "asc" } },
      owner: true,
      inquiries: { orderBy: { createdAt: "desc" }, take: 10 },
      viewings: { orderBy: { startsAt: "desc" }, take: 10, include: { client: true } },
      deals: { include: { client: true } },
    },
  });
  if (!p) notFound();

  const [agents, owners] = await Promise.all([
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    db.client.findMany({ where: { type: { in: ["OWNER", "LANDLORD"] } }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageTop title={p.titleBg} back="/admin/properties">
        <StatusBadge kind="property" value={p.status} />
        <Link href={`/bg/properties/${p.slug}`} target="_blank" className="btn secondary small">Виж на сайта ↗</Link>
        <form action={duplicateProperty.bind(null, p.id)}><button className="btn secondary small">Дублирай</button></form>
      </PageTop>
      <Flash ok={searchParams.saved ? "Записано." : searchParams.archived ? "Имотът има сделки, затова е архивиран вместо изтрит." : undefined} />

      <div className="two-col">
        <div className="grid" style={{ gap: 18 }}>
          <div className="card pad">
            <h3>Снимки ({p.images.length})</h3>
            {p.images.length === 0 ? (
              <p className="muted small">Още няма снимки — добавете ги по-долу.</p>
            ) : (
              <div className="img-grid">
                {p.images.map((im, i) => (
                  <div key={im.id} className="item">
                    <img src={im.url} alt="" />
                    {i === 0 && <span className="badge red" style={{ position: "absolute", top: 6, left: 6 }}>Корица</span>}
                    <div className="actions">
                      <form action={moveImage.bind(null, im.id, "up")}><button className="btn ghost small" title="Наляво" disabled={i === 0}>←</button></form>
                      {i !== 0 && <form action={moveImage.bind(null, im.id, "first")}><button className="btn ghost small" title="Направи корица">★</button></form>}
                      <form action={moveImage.bind(null, im.id, "down")}><button className="btn ghost small" title="Надясно" disabled={i === p.images.length - 1}>→</button></form>
                      <form action={deletePropertyImage.bind(null, im.id)}><button className="btn ghost small" title="Изтрий" style={{ color: "var(--red)" }}>✕</button></form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <PropertyForm action={updateProperty.bind(null, p.id)} property={p} agents={agents} owners={owners} currentUserId={user.id} />
        </div>

        <aside className="grid" style={{ gap: 16 }}>
          <div className="card pad small">
            <div><span className="muted">Реф. №:</span> <b>{p.refNo}</b></div>
            <div><span className="muted">Създаден:</span> {formatDate(p.createdAt)}</div>
            <div><span className="muted">Прегледи на сайта:</span> {p.views}</div>
            {p.owner && <div><span className="muted">Собственик:</span> <Link href={`/admin/clients/${p.owner.id}`} style={{ color: "var(--red)" }}>{p.owner.name}</Link> {p.owner.phone}</div>}
          </div>

          <div className="card pad">
            <div className="row" style={{ marginBottom: 6 }}><h3 style={{ margin: 0 }}>Огледи</h3><div className="spacer" /><Link href={`/admin/viewings?property=${p.id}`} className="btn secondary small">+ Оглед</Link></div>
            {p.viewings.length === 0 ? <p className="muted small">Няма огледи.</p> : (
              <ul className="timeline">
                {p.viewings.map((v) => (
                  <li key={v.id}>
                    <div className="row"><b>{formatDate(v.startsAt, "bg", true)}</b><StatusBadge kind="viewing" value={v.status} /></div>
                    <Link href={`/admin/clients/${v.client.id}`}>{v.client.name}</Link>
                    {v.feedback && <div className="muted small">{v.feedback}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card pad">
            <h3>Запитвания</h3>
            {p.inquiries.length === 0 ? <p className="muted small">Няма запитвания.</p> : (
              <ul className="timeline">
                {p.inquiries.map((q) => (
                  <li key={q.id}>
                    <div className="row"><b>{q.name}</b><StatusBadge kind="inquiry" value={q.status} /></div>
                    <div className="muted small">{label(INQUIRY_KINDS, q.kind)} · {formatDate(q.createdAt, "bg", true)} · {q.phone}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {p.deals.length > 0 && (
            <div className="card pad">
              <h3>Сделки</h3>
              <ul className="timeline">
                {p.deals.map((d) => (
                  <li key={d.id}><div className="row"><b>{d.client.name}</b><StatusBadge kind="deal" value={d.status} /></div></li>
                ))}
              </ul>
            </div>
          )}

          {user.role === "ADMIN" && (
            <form action={deleteProperty.bind(null, p.id)} className="card pad">
              <p className="muted small">Изтриването премахва имота и снимките му окончателно. Имоти със сделки се архивират.</p>
              <ConfirmButton message="Сигурни ли сте, че искате да изтриете имота?">Изтрий имота</ConfirmButton>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}

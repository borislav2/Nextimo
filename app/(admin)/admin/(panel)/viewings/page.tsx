import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createViewing, deleteViewing, updateViewing } from "@/lib/actions/schedule";
import { VIEWING_STATUS } from "@/lib/constants";
import { dateToSofiaLocal, formatTime } from "@/lib/format";
import { Flash, PageTop, StatusBadge } from "@/components/admin/ui";
import ConfirmButton from "@/components/admin/ConfirmButton";

export const metadata = { title: "Огледи" };

function startOfWeek(offset: number) {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + offset * 7);
  return d;
}

export default async function Viewings({
  searchParams,
}: {
  searchParams: { week?: string; mine?: string; property?: string; client?: string; saved?: string; warn?: string; error?: string };
}) {
  const user = await requireUser();
  const offset = parseInt(searchParams.week || "0") || 0;
  const from = startOfWeek(offset);
  const to = new Date(from.getTime() + 7 * 24 * 3600 * 1000);

  const [viewings, properties, clients, agents] = await Promise.all([
    db.viewing.findMany({
      where: { startsAt: { gte: from, lt: to }, ...(searchParams.mine ? { agentId: user.id } : {}) },
      include: {
        property: { select: { id: true, titleBg: true, refNo: true, district: true, address: true } },
        client: { select: { id: true, name: true, phone: true } },
        agent: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.property.findMany({ where: { status: { in: ["ACTIVE", "RESERVED"] } }, select: { id: true, titleBg: true, refNo: true }, orderBy: { refNo: "desc" } }),
    db.client.findMany({ select: { id: true, name: true, phone: true }, orderBy: { updatedAt: "desc" }, take: 500 }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => new Date(from.getTime() + i * 24 * 3600 * 1000));
  const dayKey = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Sofia" }).format(d);
  const fmtDay = (d: Date) => new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long" }).format(d);
  const defaultStart = dateToSofiaLocal(new Date(Math.ceil(Date.now() / 3600000) * 3600000 + 24 * 3600000));
  const q = (o: number) => `/admin/viewings?week=${o}${searchParams.mine ? "&mine=1" : ""}`;

  return (
    <>
      <PageTop title="Огледи">
        <Link href={q(offset - 1)} className="btn secondary small">← Предишна</Link>
        <Link href={q(0)} className="btn secondary small">Тази седмица</Link>
        <Link href={q(offset + 1)} className="btn secondary small">Следваща →</Link>
        <Link href={`/admin/viewings?week=${offset}${searchParams.mine ? "" : "&mine=1"}`} className={`btn small ${searchParams.mine ? "" : "secondary"}`}>Само мои</Link>
      </PageTop>
      <Flash
        ok={searchParams.saved ? "Огледът е насрочен." : undefined}
        error={searchParams.warn ? "Огледът е записан, но брокерът има друг оглед по същото време." : searchParams.error ? "Изберете имот, клиент и час." : undefined}
      />

      <div className="two-col">
        <div>
          {days.map((d) => {
            const list = viewings.filter((v) => dayKey(v.startsAt) === dayKey(d));
            return (
              <div key={d.toISOString()} className="day-group">
                <h3>{fmtDay(d)} {list.length > 0 && <span className="badge red">{list.length}</span>}</h3>
                {list.length === 0 ? <div className="muted small" style={{ paddingLeft: 4 }}>—</div> : (
                  <div className="card">
                    {list.map((v) => (
                      <div key={v.id} style={{ padding: 14, borderBottom: "1px solid var(--line)" }}>
                        <div className="row">
                          <b style={{ fontSize: "1.1rem" }}>{formatTime(v.startsAt)}</b>
                          <StatusBadge kind="viewing" value={v.status} />
                          <Link href={`/admin/properties/${v.property.id}`} style={{ fontWeight: 700 }}>{v.property.refNo} · {v.property.titleBg}</Link>
                        </div>
                        <div className="small" style={{ marginTop: 4 }}>
                          <Link href={`/admin/clients/${v.client.id}`}>{v.client.name}</Link>
                          {v.client.phone && <> · <a href={`tel:${v.client.phone}`}>{v.client.phone}</a></>}
                          <span className="muted"> · {v.property.district}{v.property.address ? `, ${v.property.address}` : ""} · {v.agent?.name}</span>
                        </div>
                        <details className="box" style={{ marginTop: 6 }}>
                          <summary className="small">Резултат / промяна</summary>
                          <form action={updateViewing.bind(null, v.id)} className="form-grid" style={{ marginTop: 8 }}>
                            <div>
                              <label>Статус</label>
                              <select name="status" defaultValue={v.status}>
                                {Object.entries(VIEWING_STATUS).map(([k, l]) => <option key={k} value={k}>{l.bg}</option>)}
                              </select>
                            </div>
                            <div><label>Час</label><input type="datetime-local" name="startsAt" defaultValue={dateToSofiaLocal(v.startsAt)} /></div>
                            <div className="full"><label>Обратна връзка от клиента</label><textarea name="feedback" defaultValue={v.feedback ?? ""} style={{ minHeight: 60 }} /></div>
                            <div className="full row">
                              <button className="btn small">Запази</button>
                            </div>
                          </form>
                          <form action={deleteViewing.bind(null, v.id)} style={{ marginTop: 6 }}>
                            <ConfirmButton message="Изтриване на огледа?" className="btn ghost small">Изтрий</ConfirmButton>
                          </form>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form action={createViewing} className="card pad sticky-side">
          <h3>Насрочи оглед</h3>
          <div className="field">
            <label>Имот</label>
            <select name="propertyId" required defaultValue={searchParams.property || ""}>
              <option value="">— изберете —</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.refNo} · {p.titleBg}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Клиент</label>
            <select name="clientId" required defaultValue={searchParams.client || ""}>
              <option value="">— изберете —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
            </select>
            <div className="small" style={{ marginTop: 4 }}><Link href="/admin/clients/new" style={{ color: "var(--red)" }}>+ нов клиент</Link></div>
          </div>
          <div className="field"><label>Дата и час</label><input type="datetime-local" name="startsAt" required defaultValue={defaultStart} /></div>
          <div className="field">
            <label>Продължителност</label>
            <select name="durationMin" defaultValue="30">
              {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} мин</option>)}
            </select>
          </div>
          <div className="field">
            <label>Брокер</label>
            <select name="agentId" defaultValue={user.id}>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Бележка</label><textarea name="feedback" style={{ minHeight: 60 }} /></div>
          <button className="btn" style={{ width: "100%" }}>Насрочи</button>
        </form>
      </div>
    </>
  );
}

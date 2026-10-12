import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createAgent } from "@/lib/actions/team";
import { Flash, PageTop } from "@/components/admin/ui";

export const metadata = { title: "Брокери" };

export default async function Agents({ searchParams }: { searchParams: { error?: string } }) {
  await requireAdmin();
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { properties: true, clients: true, deals: true } } },
  });

  return (
    <>
      <PageTop title="Брокери и достъп" />
      <Flash error={searchParams.error === "exists" ? "Вече има потребител с този имейл." : searchParams.error === "short" ? "Паролата трябва да е поне 8 символа." : undefined} />
      <div className="two-col">
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Име</th><th>Роля</th><th>Имоти</th><th>Клиенти</th><th>Сделки</th><th>На сайта</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                  <td>
                    <Link href={`/admin/agents/${u.id}`} style={{ fontWeight: 700 }}>{u.name}</Link>
                    <div className="muted small">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                  </td>
                  <td><span className={`badge ${u.role === "ADMIN" ? "red" : ""}`}>{u.role === "ADMIN" ? "Админ" : "Брокер"}</span>{!u.active && <span className="badge gray"> неактивен</span>}</td>
                  <td>{u._count.properties}</td>
                  <td>{u._count.clients}</td>
                  <td>{u._count.deals}</td>
                  <td>{u.showOnSite ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={createAgent} className="card pad">
          <h3>Добави брокер</h3>
          <div className="field"><label>Име</label><input name="name" required /></div>
          <div className="field"><label>Имейл (за вход)</label><input name="email" type="email" required /></div>
          <div className="field"><label>Телефон</label><input name="phone" type="tel" /></div>
          <div className="field"><label>Временна парола (мин. 8)</label><input name="password" type="text" minLength={8} required /></div>
          <div className="field">
            <label>Роля</label>
            <select name="role" defaultValue="AGENT">
              <option value="AGENT">Брокер — работи с имоти, клиенти, огледи, сделки</option>
              <option value="ADMIN">Администратор — всичко + брокери, настройки, изтриване</option>
            </select>
          </div>
          <button className="btn" style={{ width: "100%" }}>Създай</button>
        </form>
      </div>
    </>
  );
}

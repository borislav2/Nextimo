import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logout } from "@/lib/actions/auth";
import AdminNav from "@/components/admin/AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const newInquiries = await db.inquiry.count({ where: { status: "NEW" } });

  const items = [
    { href: "/admin", label: "Табло", icon: "▦" },
    { href: "/admin/properties", label: "Имоти", icon: "⌂" },
    { href: "/admin/inquiries", label: "Запитвания", icon: "✉", badge: newInquiries },
    { href: "/admin/clients", label: "Клиенти", icon: "☺" },
    { href: "/admin/viewings", label: "Огледи", icon: "◷" },
    { href: "/admin/deals", label: "Сделки", icon: "€" },
  ];
  const admin =
    user.role === "ADMIN"
      ? [
          { href: "/admin/agents", label: "Брокери", icon: "☷" },
          { href: "/admin/settings", label: "Настройки", icon: "⚙" },
        ]
      : [];

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/admin" className="brand">
          <img src="/logo.png" alt="" />
          <span>NEXTIMO<small>АДМИН ПАНЕЛ</small></span>
        </Link>
        <AdminNav items={items} admin={admin} />
        <div className="who">
          <div style={{ color: "#fff", fontWeight: 700 }}>{user.name}</div>
          <div className="small">{user.role === "ADMIN" ? "Администратор" : "Брокер"}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <Link href="/admin/profile" className="small">Профил</Link>
            <Link href="/bg" target="_blank" className="small">Сайт ↗</Link>
            <form action={logout}><button className="btn ghost small" style={{ color: "#cfcac4", padding: 0 }}>Изход</button></form>
          </div>
        </div>
      </aside>
      <div>
        <AdminNav items={items} admin={admin} mobile />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

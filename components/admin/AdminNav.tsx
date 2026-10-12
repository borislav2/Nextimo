"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; badge?: number };

export default function AdminNav({ items, admin, mobile = false }: { items: Item[]; admin: Item[]; mobile?: boolean }) {
  const path = usePathname() || "/admin";
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  const render = (i: Item) => (
    <Link key={i.href} href={i.href} className={isActive(i.href) ? "active" : ""}>
      {!mobile && <span aria-hidden>{i.icon}</span>}
      {i.label}
      {i.badge ? <span className="badge red" style={{ marginLeft: "auto", padding: "1px 7px" }}>{i.badge}</span> : null}
    </Link>
  );

  if (mobile) return <div className="admin-mobile-bar">{[...items, ...admin].map(render)}</div>;

  return (
    <nav>
      {items.map(render)}
      {admin.length > 0 && <div className="group">Управление</div>}
      {admin.map(render)}
    </nav>
  );
}

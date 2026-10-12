import Link from "next/link";
import {
  DEAL_STATUS, INQUIRY_STATUS, PROPERTY_STATUS, VIEWING_STATUS, label,
} from "@/lib/constants";

const COLORS: Record<string, string> = {
  // property
  DRAFT: "gray", ACTIVE: "green", RESERVED: "amber", SOLD: "blue", RENTED: "blue", ARCHIVED: "gray",
  // inquiry
  NEW: "red", CONTACTED: "amber", VIEWING: "blue", NEGOTIATION: "amber", WON: "green", LOST: "gray",
  // viewing
  SCHEDULED: "blue", DONE: "green", CANCELLED: "gray", NO_SHOW: "red",
  // deal
  PENDING: "amber", DEPOSIT: "blue", CLOSED: "green",
};

const MAPS = { property: PROPERTY_STATUS, inquiry: INQUIRY_STATUS, viewing: VIEWING_STATUS, deal: DEAL_STATUS };

export function StatusBadge({ kind, value }: { kind: keyof typeof MAPS; value: string }) {
  return <span className={`badge ${COLORS[value] || ""}`}>{label(MAPS[kind], value)}</span>;
}

export function PageTop({ title, children, back }: { title: string; children?: React.ReactNode; back?: string }) {
  return (
    <div className="admin-top">
      {back && <Link href={back} className="btn secondary small">←</Link>}
      <h1>{title}</h1>
      <div className="spacer" />
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card pad muted" style={{ textAlign: "center" }}>{children}</div>;
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <div className="alert">{error}</div>;
  if (ok) return <div className="alert ok">{ok}</div>;
  return null;
}

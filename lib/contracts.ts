import { db } from "@/lib/db";
import type { ClientOpt, PropertyOpt } from "@/components/admin/ContractForm";

/** Options for the contract form: every property and client with the data needed to auto-fill the form */
export async function contractFormOptions() {
  const [properties, clients, agents] = await Promise.all([
    db.property.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, refNo: true, titleBg: true, price: true, dealType: true, ownerId: true },
      orderBy: { refNo: "desc" },
      take: 500,
    }),
    db.client.findMany({
      select: { id: true, name: true, phone: true, email: true, egn: true, idCard: true, address: true },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);
  return {
    properties: properties.map<PropertyOpt>((p) => ({ id: p.id, label: `${p.refNo} · ${p.titleBg}`, price: p.price, dealType: p.dealType, ownerId: p.ownerId ?? "" })),
    clients: clients.map<ClientOpt>((c) => ({ id: c.id, name: c.name, phone: c.phone ?? "", email: c.email ?? "", egn: c.egn ?? "", idCard: c.idCard ?? "", address: c.address ?? "" })),
    agents: agents.map((a) => ({ id: a.id, label: a.name })),
  };
}

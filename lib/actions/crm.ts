"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClientType, InquiryStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { int, list, oneOf, s, sOrNull } from "@/lib/forms";

const INQ_STATUS = ["NEW", "CONTACTED", "VIEWING", "NEGOTIATION", "WON", "LOST"] as const;
const CLIENT_TYPES = ["BUYER", "TENANT", "OWNER", "LANDLORD"] as const;

/* ---------------- Inquiries ---------------- */

export async function setInquiryStatus(id: string, fd: FormData) {
  await requireUser();
  const status = oneOf(s(fd, "status"), INQ_STATUS, "NEW") as InquiryStatus;
  await db.inquiry.update({ where: { id }, data: { status } });
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
}

export async function assignInquiry(id: string, fd: FormData) {
  await requireUser();
  await db.inquiry.update({ where: { id }, data: { agentId: sOrNull(fd, "agentId", 40) } });
  revalidatePath("/admin/inquiries");
}

/** Creates (or reuses by phone/email) a client from an inquiry and links them */
export async function inquiryToClient(id: string) {
  const user = await requireUser();
  const q = await db.inquiry.findUnique({ where: { id }, include: { property: true } });
  if (!q) return;
  if (q.clientId) redirect(`/admin/clients/${q.clientId}`);

  const or = [q.phone ? { phone: q.phone } : null, q.email ? { email: q.email } : null].filter(Boolean) as { phone?: string; email?: string }[];
  let client = or.length ? await db.client.findFirst({ where: { OR: or } }) : null;

  if (!client) {
    const type: ClientType =
      q.kind === "SELL" || q.kind === "VALUATION"
        ? q.message?.startsWith("[rent]") ? "LANDLORD" : "OWNER"
        : q.property?.dealType === "RENT" ? "TENANT" : "BUYER";
    client = await db.client.create({
      data: {
        name: q.name,
        phone: q.phone,
        email: q.email,
        type,
        source: "Сайт",
        agentId: q.agentId || user.id,
        preferredDistricts: q.property ? [q.property.district] : [],
      },
    });
  }
  await db.inquiry.update({ where: { id }, data: { clientId: client.id, status: q.status === "NEW" ? "CONTACTED" : q.status } });
  if (q.message) {
    await db.clientNote.create({ data: { clientId: client.id, authorId: user.id, text: `Запитване от сайта${q.property ? ` за ${q.property.refNo}` : ""}: ${q.message}` } });
  }
  redirect(`/admin/clients/${client.id}`);
}

export async function deleteInquiry(id: string) {
  await requireAdmin();
  await db.inquiry.delete({ where: { id } });
  revalidatePath("/admin/inquiries");
}

/* ---------------- Clients ---------------- */

function readClient(fd: FormData) {
  return {
    name: s(fd, "name", 120) || "Без име",
    phone: sOrNull(fd, "phone", 30),
    email: sOrNull(fd, "email", 120),
    egn: sOrNull(fd, "egn", 20),
    idCard: sOrNull(fd, "idCard", 120),
    address: sOrNull(fd, "address", 300),
    type: oneOf(s(fd, "type"), CLIENT_TYPES, "BUYER") as ClientType,
    source: sOrNull(fd, "source", 80),
    budgetMin: int(fd, "budgetMin"),
    budgetMax: int(fd, "budgetMax"),
    preferredDistricts: s(fd, "preferredDistricts", 500).split(",").map((x) => x.trim()).filter(Boolean),
    wantedTypes: list(fd, "wantedTypes"),
    notesSummary: sOrNull(fd, "notesSummary", 5000),
    agentId: sOrNull(fd, "agentId", 40),
  };
}

export async function createClient(fd: FormData) {
  const user = await requireUser();
  const data = readClient(fd);
  const c = await db.client.create({ data: { ...data, agentId: data.agentId || user.id } });
  redirect(`/admin/clients/${c.id}`);
}

export async function updateClient(id: string, fd: FormData) {
  await requireUser();
  await db.client.update({ where: { id }, data: readClient(fd) });
  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}?saved=1`);
}

export async function deleteClient(id: string) {
  await requireAdmin();
  const deals = await db.deal.count({ where: { clientId: id } });
  if (deals > 0) redirect(`/admin/clients/${id}?error=deals`);
  await db.client.delete({ where: { id } });
  redirect("/admin/clients");
}

export async function addClientNote(clientId: string, fd: FormData) {
  const user = await requireUser();
  const text = s(fd, "text", 5000);
  if (text) await db.clientNote.create({ data: { clientId, authorId: user.id, text } });
  revalidatePath(`/admin/clients/${clientId}`);
}

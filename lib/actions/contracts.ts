"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContractStatus, ContractType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { float, int, oneOf, s, sOrNull } from "@/lib/forms";

const TYPES = ["PRELIMINARY_SALE", "RENT", "BROKERAGE"] as const;
const STATUSES = ["DRAFT", "SIGNED", "CANCELLED"] as const;

export type Party = { clientId: string; name: string; egn: string; idCard: string; address: string; phone: string; email: string };

function readParty(fd: FormData, prefix: "a" | "b"): Party {
  return {
    clientId: s(fd, `${prefix}_clientId`, 40),
    name: s(fd, `${prefix}_name`, 160),
    egn: s(fd, `${prefix}_egn`, 30),
    idCard: s(fd, `${prefix}_idCard`, 160),
    address: s(fd, `${prefix}_address`, 300),
    phone: s(fd, `${prefix}_phone`, 40),
    email: s(fd, `${prefix}_email`, 120),
  };
}

function readContract(fd: FormData) {
  const signedRaw = s(fd, "signedAt", 20);
  return {
    type: oneOf(s(fd, "type"), TYPES, "PRELIMINARY_SALE") as ContractType,
    status: oneOf(s(fd, "status"), STATUSES, "DRAFT") as ContractStatus,
    partyA: readParty(fd, "a"),
    partyB: readParty(fd, "b"),
    price: int(fd, "price") ?? 0,
    deposit: int(fd, "deposit"),
    commissionPct: float(fd, "commissionPct"),
    termMonths: int(fd, "termMonths"),
    signedAt: signedRaw ? new Date(signedRaw + "T12:00:00Z") : null,
    notes: sOrNull(fd, "notes", 5000),
    agentId: sOrNull(fd, "agentId", 40),
  };
}

async function nextNumber() {
  const year = new Date().getFullYear();
  const prefix = `ДГ-${year}-`;
  const rows = await db.contract.findMany({ where: { number: { startsWith: prefix } }, select: { number: true } });
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.number.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function createContract(fd: FormData) {
  const user = await requireUser();
  const propertyId = s(fd, "propertyId", 40);
  const data = readContract(fd);
  const needed = data.type === "BROKERAGE" ? data.partyA.name : data.partyB.name && data.partyA.name;
  if (!propertyId || !needed) redirect("/admin/contracts/new?error=missing");
  const c = await db.contract.create({
    data: { ...data, propertyId, number: await nextNumber(), agentId: data.agentId || user.id },
  });
  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/${c.id}?saved=1`);
}

export async function updateContract(id: string, fd: FormData) {
  await requireUser();
  const propertyId = s(fd, "propertyId", 40);
  const data = readContract(fd);
  await db.contract.update({ where: { id }, data: { ...data, ...(propertyId ? { propertyId } : {}) } });
  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/${id}?saved=1`);
}

export async function deleteContract(id: string) {
  await requireAdmin();
  await db.contract.delete({ where: { id } });
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}

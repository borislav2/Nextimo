"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DealStatus, DealType, ViewingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { float, int, oneOf, s, sOrNull } from "@/lib/forms";
import { sofiaLocalToDate } from "@/lib/format";

const V_STATUS = ["SCHEDULED", "DONE", "CANCELLED", "NO_SHOW"] as const;
const D_STATUS = ["PENDING", "DEPOSIT", "CLOSED", "CANCELLED"] as const;

/* ---------------- Viewings ---------------- */

export async function createViewing(fd: FormData) {
  const user = await requireUser();
  const propertyId = s(fd, "propertyId", 40);
  const clientId = s(fd, "clientId", 40);
  const when = s(fd, "startsAt", 30);
  if (!propertyId || !clientId || !when) redirect("/admin/viewings?error=missing");

  const startsAt = sofiaLocalToDate(when);
  const durationMin = int(fd, "durationMin") ?? 30;
  const agentId = sOrNull(fd, "agentId", 40) || user.id;

  // Warn about double-booking the same agent
  const end = new Date(startsAt.getTime() + durationMin * 60000);
  const clash = await db.viewing.findFirst({
    where: {
      agentId,
      status: "SCHEDULED",
      startsAt: { lt: end, gte: new Date(startsAt.getTime() - 3 * 60 * 60000) },
    },
  });
  const clashes = clash && new Date(clash.startsAt.getTime() + clash.durationMin * 60000) > startsAt;

  await db.viewing.create({ data: { propertyId, clientId, agentId, startsAt, durationMin, feedback: sOrNull(fd, "feedback", 2000) } });

  // Move linked inquiries forward in the pipeline
  await db.inquiry.updateMany({
    where: { clientId, status: { in: ["NEW", "CONTACTED"] } },
    data: { status: "VIEWING" },
  });

  revalidatePath("/admin/viewings");
  redirect(`/admin/viewings?${clashes ? "warn=clash" : "saved=1"}`);
}

export async function updateViewing(id: string, fd: FormData) {
  await requireUser();
  const status = oneOf(s(fd, "status"), V_STATUS, "SCHEDULED") as ViewingStatus;
  const when = s(fd, "startsAt", 30);
  await db.viewing.update({
    where: { id },
    data: {
      status,
      feedback: sOrNull(fd, "feedback", 2000),
      ...(when ? { startsAt: sofiaLocalToDate(when) } : {}),
    },
  });
  revalidatePath("/admin/viewings");
}

export async function deleteViewing(id: string) {
  await requireUser();
  await db.viewing.delete({ where: { id } });
  revalidatePath("/admin/viewings");
}

/* ---------------- Deals ---------------- */

function readDeal(fd: FormData) {
  const price = int(fd, "price") ?? 0;
  const commissionPct = float(fd, "commissionPct") ?? 3;
  const manual = int(fd, "commissionAmount");
  const status = oneOf(s(fd, "status"), D_STATUS, "PENDING") as DealStatus;
  const closedAtRaw = s(fd, "closedAt", 20);
  return {
    type: oneOf(s(fd, "type"), ["SALE", "RENT"] as const, "SALE") as DealType,
    status,
    price,
    commissionPct,
    commissionAmount: manual ?? Math.round((price * commissionPct) / 100),
    agentSharePct: float(fd, "agentSharePct") ?? 50,
    depositAmount: int(fd, "depositAmount"),
    closedAt: closedAtRaw ? new Date(closedAtRaw + "T12:00:00Z") : status === "CLOSED" ? new Date() : null,
    notes: sOrNull(fd, "notes", 5000),
    agentId: sOrNull(fd, "agentId", 40),
  };
}

async function syncAfterDeal(propertyId: string, clientId: string, status: DealStatus, type: DealType) {
  if (status === "CLOSED") {
    await db.property.update({ where: { id: propertyId }, data: { status: type === "RENT" ? "RENTED" : "SOLD" } });
    await db.inquiry.updateMany({ where: { clientId, status: { notIn: ["LOST"] } }, data: { status: "WON" } });
  } else if (status === "DEPOSIT") {
    await db.property.update({ where: { id: propertyId }, data: { status: "RESERVED" } });
    await db.inquiry.updateMany({ where: { clientId, status: { in: ["NEW", "CONTACTED", "VIEWING"] } }, data: { status: "NEGOTIATION" } });
  }
}

export async function createDeal(fd: FormData) {
  const user = await requireUser();
  const propertyId = s(fd, "propertyId", 40);
  const clientId = s(fd, "clientId", 40);
  if (!propertyId || !clientId) redirect("/admin/deals?error=missing");
  const data = readDeal(fd);
  await db.deal.create({ data: { ...data, propertyId, clientId, agentId: data.agentId || user.id } });
  await syncAfterDeal(propertyId, clientId, data.status, data.type);
  revalidatePath("/admin/deals");
  redirect("/admin/deals?saved=1");
}

export async function updateDeal(id: string, fd: FormData) {
  await requireUser();
  const data = readDeal(fd);
  const deal = await db.deal.update({ where: { id }, data });
  await syncAfterDeal(deal.propertyId, deal.clientId, data.status, data.type);
  revalidatePath("/admin/deals");
  redirect(`/admin/deals/${id}?saved=1`);
}

export async function deleteDeal(id: string) {
  await requireAdmin();
  await db.deal.delete({ where: { id } });
  redirect("/admin/deals");
}

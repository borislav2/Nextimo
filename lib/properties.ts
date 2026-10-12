import type { Prisma } from "@prisma/client";
import { db } from "./db";

export type ListParams = {
  deal?: string;
  type?: string;
  district?: string;
  min?: string;
  max?: string;
  area?: string;
  sort?: string;
  page?: string;
};

export const PAGE_SIZE = 12;

export function publicWhere(p: ListParams): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = { status: { in: ["ACTIVE", "RESERVED"] } };
  if (p.deal === "SALE" || p.deal === "RENT") where.dealType = p.deal;
  if (p.type) where.type = p.type as Prisma.PropertyWhereInput["type"];
  if (p.district) where.district = p.district;
  const min = parseInt(p.min || ""), max = parseInt(p.max || ""), area = parseFloat(p.area || "");
  if (!isNaN(min) || !isNaN(max)) where.price = { ...(isNaN(min) ? {} : { gte: min }), ...(isNaN(max) ? {} : { lte: max }) };
  if (!isNaN(area)) where.area = { gte: area };
  return where;
}

export function publicOrder(sort?: string): Prisma.PropertyOrderByWithRelationInput[] {
  if (sort === "price_asc") return [{ price: "asc" }];
  if (sort === "price_desc") return [{ price: "desc" }];
  return [{ featured: "desc" }, { createdAt: "desc" }];
}

export const cardInclude = { images: { orderBy: { order: "asc" as const }, take: 1 } };

export async function listPublic(p: ListParams) {
  const page = Math.max(1, parseInt(p.page || "1") || 1);
  const where = publicWhere(p);
  const [items, total] = await Promise.all([
    db.property.findMany({
      where,
      orderBy: publicOrder(p.sort),
      include: cardInclude,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.property.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type CardProperty = Prisma.PropertyGetPayload<{ include: typeof cardInclude }>;

/** Districts that currently have live listings (for the public filters) */
export async function getDistricts() {
  const rows = await db.property.groupBy({
    by: ["district"],
    where: { status: { in: ["ACTIVE", "RESERVED"] } },
    _count: { _all: true },
    orderBy: { district: "asc" },
  });
  return rows.map((r) => r.district);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DealType, Furnishing, PropertyStatus, PropertyType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { bool, float, int, list, oneOf, s, sOrNull } from "@/lib/forms";
import { slugify } from "@/lib/format";
import { deleteImage, saveImage } from "@/lib/upload";

const DEALS = ["SALE", "RENT"] as const;
const TYPES = ["STUDIO", "ONE_BED", "TWO_BED", "THREE_BED", "MULTI_BED", "MAISONETTE", "HOUSE", "OFFICE", "SHOP", "LAND", "GARAGE", "BUSINESS"] as const;
const STATUSES = ["DRAFT", "ACTIVE", "RESERVED", "SOLD", "RENTED", "ARCHIVED"] as const;
const FURN = ["UNFURNISHED", "PARTIAL", "FURNISHED"] as const;

async function nextRefNo() {
  const last = await db.property.findFirst({ where: { refNo: { startsWith: "NX-" } }, orderBy: { createdAt: "desc" }, select: { refNo: true } });
  const n = last ? parseInt(last.refNo.replace("NX-", "")) || 1000 : 1000;
  let candidate = n + 1;
  while (await db.property.findUnique({ where: { refNo: `NX-${candidate}` } })) candidate++;
  return `NX-${candidate}`;
}

function readProperty(fd: FormData) {
  const titleBg = s(fd, "titleBg", 200);
  if (!titleBg) throw new Error("Заглавието е задължително");
  return {
    titleBg,
    titleEn: sOrNull(fd, "titleEn", 200),
    descriptionBg: s(fd, "descriptionBg", 20000),
    descriptionEn: sOrNull(fd, "descriptionEn", 20000),
    dealType: oneOf(s(fd, "dealType"), DEALS, "SALE") as DealType,
    type: oneOf(s(fd, "type"), TYPES, "ONE_BED") as PropertyType,
    status: oneOf(s(fd, "status"), STATUSES, "DRAFT") as PropertyStatus,
    price: int(fd, "price") ?? 0,
    priceOnRequest: bool(fd, "priceOnRequest"),
    area: float(fd, "area") ?? 0,
    rooms: int(fd, "rooms"),
    bathrooms: int(fd, "bathrooms"),
    floor: int(fd, "floor"),
    totalFloors: int(fd, "totalFloors"),
    yearBuilt: int(fd, "yearBuilt"),
    construction: sOrNull(fd, "construction", 60),
    heating: sOrNull(fd, "heating", 60),
    furnishing: oneOf(s(fd, "furnishing"), FURN, "UNFURNISHED") as Furnishing,
    city: s(fd, "city", 80) || "Пловдив",
    district: s(fd, "district", 80) || "Друг",
    address: sOrNull(fd, "address", 200),
    lat: float(fd, "lat"),
    lng: float(fd, "lng"),
    features: list(fd, "features"),
    featured: bool(fd, "featured"),
    agentId: sOrNull(fd, "agentId", 40),
    ownerId: sOrNull(fd, "ownerId", 40),
  };
}

async function addImages(propertyId: string, fd: FormData) {
  const files = fd.getAll("images").filter((f): f is File => typeof f === "object" && f !== null && "size" in f && (f as File).size > 0);
  if (!files.length) return;
  const max = await db.propertyImage.aggregate({ where: { propertyId }, _max: { order: true } });
  let order = (max._max.order ?? -1) + 1;
  for (const file of files) {
    const url = await saveImage(file, propertyId);
    if (url) await db.propertyImage.create({ data: { propertyId, url, order: order++ } });
  }
}

export async function createProperty(fd: FormData) {
  const user = await requireUser();
  const data = readProperty(fd);
  const refNo = await nextRefNo();
  const base = slugify(data.titleEn || data.titleBg) || "imot";
  const property = await db.property.create({
    data: { ...data, agentId: data.agentId || user.id, refNo, slug: `${base}-${refNo.toLowerCase()}` },
  });
  await addImages(property.id, fd);
  revalidatePath("/admin/properties");
  redirect(`/admin/properties/${property.id}?saved=1`);
}

export async function updateProperty(id: string, fd: FormData) {
  await requireUser();
  const data = readProperty(fd);
  await db.property.update({ where: { id }, data });
  await addImages(id, fd);
  revalidatePath(`/admin/properties/${id}`);
  redirect(`/admin/properties/${id}?saved=1`);
}

export async function setPropertyStatus(id: string, fd: FormData) {
  await requireUser();
  const status = oneOf(s(fd, "status"), STATUSES, "DRAFT") as PropertyStatus;
  await db.property.update({ where: { id }, data: { status } });
  revalidatePath("/admin/properties");
}

export async function deleteProperty(id: string) {
  await requireAdmin();
  const deals = await db.deal.count({ where: { propertyId: id } });
  if (deals > 0) {
    // Keep history of properties with deals; archive instead
    await db.property.update({ where: { id }, data: { status: "ARCHIVED" } });
    redirect(`/admin/properties/${id}?archived=1`);
  }
  const images = await db.propertyImage.findMany({ where: { propertyId: id } });
  await db.property.delete({ where: { id } });
  await Promise.all(images.map((i) => deleteImage(i.url)));
  revalidatePath("/admin/properties");
  redirect("/admin/properties");
}

export async function deletePropertyImage(imageId: string) {
  await requireUser();
  const img = await db.propertyImage.delete({ where: { id: imageId } });
  await deleteImage(img.url);
  revalidatePath(`/admin/properties/${img.propertyId}`);
}

export async function moveImage(imageId: string, direction: "up" | "down" | "first") {
  await requireUser();
  const img = await db.propertyImage.findUnique({ where: { id: imageId } });
  if (!img) return;
  const all = await db.propertyImage.findMany({ where: { propertyId: img.propertyId }, orderBy: { order: "asc" } });
  const i = all.findIndex((x) => x.id === imageId);
  const arr = [...all];
  if (direction === "first") arr.unshift(...arr.splice(i, 1));
  else {
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  await db.$transaction(arr.map((x, idx) => db.propertyImage.update({ where: { id: x.id }, data: { order: idx } })));
  revalidatePath(`/admin/properties/${img.propertyId}`);
}

export async function duplicateProperty(id: string) {
  const user = await requireUser();
  const p = await db.property.findUnique({ where: { id } });
  if (!p) return;
  const refNo = await nextRefNo();
  const { id: _id, slug, refNo: _r, createdAt, updatedAt, views, externalId, externalUrl, source, ...rest } = p;
  const copy = await db.property.create({
    data: { ...rest, status: "DRAFT", featured: false, titleBg: `${p.titleBg} (копие)`, refNo, slug: `${slug.replace(/-nx-\d+$/, "")}-${refNo.toLowerCase()}`, agentId: p.agentId || user.id },
  });
  redirect(`/admin/properties/${copy.id}`);
}

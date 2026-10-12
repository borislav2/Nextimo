"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { bool, float, oneOf, s, sOrNull } from "@/lib/forms";
import { saveImage } from "@/lib/upload";

/* ---------------- Agents ---------------- */

export async function createAgent(fd: FormData) {
  await requireAdmin();
  const email = s(fd, "email", 120).toLowerCase();
  const password = s(fd, "password", 200);
  if (!email || password.length < 8) redirect("/admin/agents?error=short");
  if (await db.user.findUnique({ where: { email } })) redirect("/admin/agents?error=exists");
  const user = await db.user.create({
    data: {
      email,
      name: s(fd, "name", 100) || email,
      phone: sOrNull(fd, "phone", 30),
      role: oneOf(s(fd, "role"), ["ADMIN", "AGENT"] as const, "AGENT"),
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  redirect(`/admin/agents/${user.id}?saved=1`);
}

export async function updateAgent(id: string, fd: FormData) {
  const me = await requireAdmin();
  const photo = fd.get("photo");
  const photoUrl = photo && typeof photo === "object" && (photo as File).size > 0 ? await saveImage(photo as File, "agents") : undefined;
  const password = s(fd, "password", 200);
  const role = oneOf(s(fd, "role"), ["ADMIN", "AGENT"] as const, "AGENT");
  const active = bool(fd, "active");
  if (id === me.id && (role !== "ADMIN" || !active)) redirect(`/admin/agents/${id}?error=self`);

  await db.user.update({
    where: { id },
    data: {
      name: s(fd, "name", 100),
      phone: sOrNull(fd, "phone", 30),
      bioBg: sOrNull(fd, "bioBg", 2000),
      bioEn: sOrNull(fd, "bioEn", 2000),
      role,
      active,
      showOnSite: bool(fd, "showOnSite"),
      ...(photoUrl ? { photoUrl } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  revalidatePath("/admin/agents");
  redirect(`/admin/agents/${id}?saved=1`);
}

/* ---------------- Own profile ---------------- */

export async function updateOwnProfile(fd: FormData) {
  const user = await requireUser();
  const photo = fd.get("photo");
  const photoUrl = photo && typeof photo === "object" && (photo as File).size > 0 ? await saveImage(photo as File, "agents") : undefined;
  await db.user.update({
    where: { id: user.id },
    data: {
      name: s(fd, "name", 100) || user.name,
      phone: sOrNull(fd, "phone", 30),
      bioBg: sOrNull(fd, "bioBg", 2000),
      bioEn: sOrNull(fd, "bioEn", 2000),
      ...(photoUrl ? { photoUrl } : {}),
    },
  });
  redirect("/admin/profile?saved=1");
}

/* ---------------- Site settings ---------------- */

export async function updateSettings(fd: FormData) {
  await requireAdmin();
  const data = {
    companyName: s(fd, "companyName", 120),
    phone: s(fd, "phone", 30),
    phone2: s(fd, "phone2", 30),
    email: s(fd, "email", 120),
    addressBg: s(fd, "addressBg", 200),
    addressEn: s(fd, "addressEn", 200),
    hoursBg: s(fd, "hoursBg", 200),
    hoursEn: s(fd, "hoursEn", 200),
    facebook: s(fd, "facebook", 300),
    instagram: s(fd, "instagram", 300),
    mapLat: float(fd, "mapLat") ?? 42.1354,
    mapLng: float(fd, "mapLng") ?? 24.7453,
    aboutBg: s(fd, "aboutBg", 10000),
    aboutEn: s(fd, "aboutEn", 10000),
    defaultCommissionPct: float(fd, "defaultCommissionPct") ?? 3,
  };
  await db.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

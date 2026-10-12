"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { s } from "@/lib/forms";

const attempts = new Map<string, { n: number; until: number }>();

export async function login(fd: FormData) {
  const email = s(fd, "email", 120).toLowerCase();
  const password = s(fd, "password", 200);

  const a = attempts.get(email);
  if (a && a.until > Date.now()) redirect("/admin/login?error=locked");

  const user = await db.user.findUnique({ where: { email } });
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok || !user) {
    const n = (a?.n || 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 15 * 60 * 1000 : 0 });
    redirect("/admin/login?error=1");
  }
  attempts.delete(email);
  await createSession({ id: user.id, role: user.role, name: user.name });
  redirect("/admin");
}

export async function logout() {
  destroySession();
  redirect("/admin/login");
}

export async function changeOwnPassword(fd: FormData) {
  const user = await requireUser();
  const current = s(fd, "current", 200);
  const next = s(fd, "next", 200);
  if (next.length < 8) redirect("/admin/profile?error=short");
  if (!(await bcrypt.compare(current, user.passwordHash))) redirect("/admin/profile?error=wrong");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  redirect("/admin/profile?saved=1");
}

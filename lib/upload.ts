import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 10 * 1024 * 1024;

/** Saves an uploaded image and returns its public URL (served by app/uploads/[...path]/route.ts) */
export async function saveImage(file: File, folder: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Only JPG, PNG and WEBP images are allowed");
  if (file.size > MAX_BYTES) throw new Error("Image is larger than 10 MB");
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(UPLOAD_DIR, safeFolder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${safeFolder}/${name}`;
}

export async function deleteImage(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const file = path.resolve(UPLOAD_DIR, url.replace("/uploads/", ""));
  if (!file.startsWith(UPLOAD_DIR)) return;
  await unlink(file).catch(() => {});
}

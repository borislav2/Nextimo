import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const props = await db.property.findMany({
    where: { status: { in: ["ACTIVE", "RESERVED"] } },
    select: { slug: true, updatedAt: true },
  });
  const pages = ["", "/properties", "/sell", "/about", "/contact"];
  return ["bg", "en"].flatMap((lang) => [
    ...pages.map((p) => ({ url: `${base}/${lang}${p}`, changeFrequency: "daily" as const })),
    ...props.map((p) => ({ url: `${base}/${lang}/properties/${p.slug}`, lastModified: p.updatedAt })),
  ]);
}

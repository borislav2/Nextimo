import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const KINDS = ["PROPERTY", "VIEWING", "SELL", "VALUATION", "GENERAL"] as const;
type Kind = (typeof KINDS)[number];

// Very small in-memory rate limit (per server instance)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 8;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Honeypot filled in → pretend success, store nothing
  if (str(body.website, 100)) return NextResponse.json({ ok: true });

  const name = str(body.name, 100);
  const phone = str(body.phone, 30);
  const email = str(body.email, 120);
  if (!name || (!phone && !email)) return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });

  const kind: Kind = KINDS.includes(body.kind as Kind) ? (body.kind as Kind) : "GENERAL";
  const propertyId = str(body.propertyId, 40) || null;
  const property = propertyId ? await db.property.findUnique({ where: { id: propertyId }, select: { id: true, agentId: true } }) : null;

  let message = str(body.message, 2000);
  if (body.sellType) message = `[${str(body.sellType, 20)}] ${message}`;

  await db.inquiry.create({
    data: {
      kind,
      name,
      phone: phone || null,
      email: email || null,
      message: message || null,
      preferredDate: str(body.preferredDate, 80) || null,
      lang: body.lang === "en" ? "en" : "bg",
      propertyId: property?.id ?? null,
      agentId: property?.agentId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

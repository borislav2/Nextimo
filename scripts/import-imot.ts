/**
 * Imports Nextimo's listings from nextimo.imot.bg into the site database.
 *
 *   npm run import:imot -- --dry          # preview only: writes import-preview.json, changes nothing
 *   npm run import:imot                   # import / update listings and download photos
 *   npm run import:imot -- --no-photos    # import data without photos
 *   npm run import:imot -- --limit 5      # only the first 5 (for testing)
 *   npm run import:imot -- --archive-missing   # archive imported listings no longer on imot.bg
 *
 * Safe to run again: listings are matched by their imot.bg id, so it updates instead of duplicating.
 * Prices, texts and statuses you changed in the admin panel are only overwritten for fields that come from imot.bg.
 */
import "./env";
import { PrismaClient, type DealType, type Furnishing, type PropertyType } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { BASE, type BaseRow } from "./imot-listings";

const PROFILE = "https://nextimo.imot.bg";
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const DELAY_MS = 1500; // be gentle with imot.bg
const MAX_PHOTOS = 30;

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const NO_PHOTOS = args.includes("--no-photos");
const ARCHIVE_MISSING = args.includes("--archive-missing");
const LIMIT = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) || 0 : 0;

const db = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------------- fetching ---------------- */

async function fetchPage(url: string): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NextimoImporter/1.0; +https://nextimo.bg)",
          "Accept-Language": "bg-BG,bg;q=0.9",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      // imot.bg has historically used windows-1251; detect the charset
      const ctype = res.headers.get("content-type") || "";
      const head = buf.subarray(0, 3000).toString("latin1");
      const charset = (ctype.match(/charset=([\w-]+)/i)?.[1] || head.match(/charset=["']?([\w-]+)/i)?.[1] || "utf-8").toLowerCase();
      return new TextDecoder(charset === "windows-1251" || charset === "cp1251" ? "windows-1251" : "utf-8").decode(buf);
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(3000 * attempt);
    }
  }
  return "";
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; NextimoImporter/1.0)", Referer: PROFILE } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 2000 ? buf : null;
  } catch {
    return null;
  }
}

/* ---------------- parsing helpers ---------------- */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", ndash: "–", mdash: "—", bdquo: "„", ldquo: "“", rdquo: "”" };

function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function meta(html: string, prop: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
  return decodeEntities(html.match(re)?.[1] || html.match(re2)?.[1] || "").trim();
}

/** Finds the listing description: an element whose id/class mentions "description" / "opisanie", else og:description */
function extractDescription(html: string): string {
  const candidates: string[] = [];
  const re = /<(div|p|section)[^>]+(?:id|class)=["'][^"']*(?:descr|opisanie|description)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = htmlToText(m[2]);
    if (text.length > 60) candidates.push(text);
  }
  // Also look for text that follows a "Описание" heading
  const afterHeading = html.match(/>\s*Описание\s*<\/[^>]+>([\s\S]{50,8000}?)<(?:h\d|section|footer)/i);
  if (afterHeading) {
    const text = htmlToText(afterHeading[1]);
    if (text.length > 60) candidates.push(text);
  }
  const best = candidates.sort((a, b) => b.length - a.length)[0];
  return (best || meta(html, "og:description") || meta(html, "description")).slice(0, 15000);
}

/** All photo files for this listing id, as full-size URL candidates */
function extractPhotos(html: string, id: string): string[][] {
  const re = new RegExp(`(https?:)?//(imotstatic\\d*\\.focus\\.bg/imot/photosimotbg/[0-9/]+?)/+(?:big/+|med/+|small/+)?(${id}_[A-Za-z0-9]+)\\.(jpe?g|webp)`, "g");
  const seen = new Map<string, string[]>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [, , base, file, ext] = m;
    if (seen.has(file)) continue;
    const root = `https://${base.replace(/\/+$/, "")}`;
    seen.set(file, [`${root}//big/${file}.${ext}`, `${root}/big/${file}.${ext}`, `${root}/${file}.${ext}`]);
  }
  return [...seen.values()].slice(0, MAX_PHOTOS);
}

function yes(text: string, word: string) {
  // "Асансьор" present and not followed by ": НЕ"
  const re = new RegExp(`${word}(?!\\s*:?\\s*(?:НЕ|не|няма)\\b)`, "i");
  return re.test(text);
}

function extractDetails(text: string) {
  const construction = text.match(/\b(Тухла|Панел|ЕПК|ПК|Гредоред)\b/)?.[1] ?? null;
  const year = text.match(/(?:Година|Год\.?|строителство)[^\d\n]{0,30}(19\d{2}|20\d{2})/i)?.[1];
  const heatingParts: string[] = [];
  if (/ТЕЦ\s*:\s*ДА/i.test(text)) heatingParts.push("ТЕЦ");
  if (/Газ\s*:\s*ДА/i.test(text)) heatingParts.push("Газ");
  let furnishing: Furnishing | null = null;
  if (/Частично обзаведен/i.test(text)) furnishing = "PARTIAL";
  else if (/Необзаведен/i.test(text)) furnishing = "UNFURNISHED";
  else if (/Обзаведен/i.test(text)) furnishing = "FURNISHED";

  const features = new Set<string>();
  if (yes(text, "Асансьор")) features.add("elevator");
  if (/(Видео ?наблюдение|Контрол на достъпа|Охрана)/i.test(text)) features.add("security");
  if (/Паркомясто|Паркинг/i.test(text)) features.add("parking");
  if (/\bГараж\b/i.test(text)) features.add("garage");
  if (/Акт 16/i.test(text)) features.add("act16");
  if (/Климати/i.test(text)) features.add("ac");
  if (/Тераса|Балкон/i.test(text)) features.add("balcony");
  if (/Мазе|Таван/i.test(text)) features.add("storage");
  if (/Ново строителство|Акт 14|Акт 15|Акт 16/i.test(text)) features.add("newBuild");
  if (/Гледка/i.test(text)) features.add("view");

  return {
    construction,
    yearBuilt: year ? parseInt(year) : null,
    heating: heatingParts.join(", ") || null,
    furnishing,
    features: [...features],
  };
}

/* ---------------- mapping ---------------- */

const TYPE_MAP: Record<string, PropertyType> = {
  ednostaen: "STUDIO", dvustaen: "ONE_BED", tristaen: "TWO_BED", chetiristaen: "THREE_BED", mnogostaen: "MULTI_BED",
  mezonet: "MAISONETTE", kashta: "HOUSE", "etazh-ot-kashta": "HOUSE", vila: "HOUSE", partsel: "LAND", zemedelska: "LAND",
  ofis: "OFFICE", magazin: "SHOP", garazh: "GARAGE", "biznes-imot": "BUSINESS", zavedenie: "BUSINESS", hotel: "BUSINESS",
};

const TITLE_BG: Record<PropertyType, string> = {
  STUDIO: "Едностаен апартамент", ONE_BED: "Двустаен апартамент", TWO_BED: "Тристаен апартамент", THREE_BED: "Четиристаен апартамент",
  MULTI_BED: "Многостаен апартамент", MAISONETTE: "Мезонет", HOUSE: "Къща", OFFICE: "Офис", SHOP: "Магазин", LAND: "Парцел",
  GARAGE: "Гараж", BUSINESS: "Бизнес имот",
};
const TITLE_EN: Record<PropertyType, string> = {
  STUDIO: "Studio apartment", ONE_BED: "1-bedroom apartment", TWO_BED: "2-bedroom apartment", THREE_BED: "3-bedroom apartment",
  MULTI_BED: "Multi-bedroom apartment", MAISONETTE: "Maisonette", HOUSE: "House", OFFICE: "Office", SHOP: "Shop", LAND: "Land plot",
  GARAGE: "Garage", BUSINESS: "Commercial property",
};
const ROOMS: Partial<Record<PropertyType, number>> = { STUDIO: 1, ONE_BED: 2, TWO_BED: 3, THREE_BED: 4 };

function typeFromSlug(slug: string): string {
  const s = slug.replace(/^(prodava|dava-pod-naem)-/, "");
  return Object.keys(TYPE_MAP).sort((a, b) => b.length - a.length).find((k) => s.startsWith(k)) || "partsel";
}

const CYR: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya" };
const translit = (s: string) => s.toLowerCase().split("").map((c) => CYR[c] ?? c).join("");
const slugify = (s: string) => translit(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

type Listing = {
  id: string;
  url: string;
  dealType: DealType;
  type: PropertyType;
  city: string;
  district: string;
  price: number | null;
  area: number;
  floor: number | null;
  totalFloors: number | null;
  yard: number | null;
  vatExcluded: boolean;
};

function fromBase(r: BaseRow): Listing {
  const [id, slug, typeKey, city, district, price, area, floor, totalFloors, yard, vat] = r;
  return {
    id, url: `${PROFILE}/obiava-${id}-${slug}`, dealType: id.startsWith("2") ? "RENT" : "SALE",
    type: TYPE_MAP[typeKey] || "LAND", city, district, price, area, floor, totalFloors, yard, vatExcluded: !!vat,
  };
}

/** For listings that appeared after the base list was made: guess what we can from the page */
function fromPage(id: string, url: string, html: string): Listing {
  const slug = url.split(`obiava-${id}-`)[1] || "";
  const text = htmlToText(html);
  const price = text.match(/(\d{1,3}(?:[  .]\d{3})+|\d{3,})\s*(?:€|EUR)/)?.[1]?.replace(/\D/g, "");
  const area = text.match(/(?:Площ|площ)[^\d]{0,15}(\d[\d ]*)\s*(?:m2|м2|кв)/)?.[1]?.replace(/\D/g, "");
  const floor = text.match(/Етаж[^\d]{0,10}(\d+)[^\d]{1,10}(\d+)/);
  const inPlovdiv = slug.includes("grad-plovdiv");
  const place = (og: string) => og.split(",").slice(1).join(",").trim();
  const ogTitle = meta(html, "og:title");
  return {
    id, url, dealType: id.startsWith("2") ? "RENT" : "SALE", type: TYPE_MAP[typeFromSlug(slug)] || "LAND",
    city: inPlovdiv ? "Пловдив" : "област Пловдив", district: place(ogTitle).replace(/^град Пловдив,?\s*/i, "") || "Пловдив",
    price: price ? parseInt(price) : null, area: area ? parseInt(area) : 0,
    floor: floor ? parseInt(floor[1]) : null, totalFloors: floor ? parseInt(floor[2]) : null, yard: null, vatExcluded: /без ДДС/i.test(text),
  };
}

function makeTitle(l: Listing) {
  const where = l.city === "Пловдив" ? `в кв. ${l.district}` : l.district.startsWith("до ") ? l.district : `в ${l.district}`;
  const bg = l.type === "LAND" ? `${TITLE_BG[l.type]} ${l.area.toLocaleString("bg-BG")} м², ${l.district}` : `${TITLE_BG[l.type]} ${where}`;
  const en = l.type === "LAND" ? `${TITLE_EN[l.type]} ${l.area} m², ${translitPlace(l.district)}` : `${TITLE_EN[l.type]} in ${translitPlace(l.district)}`;
  return { bg: (l.dealType === "RENT" ? `${bg} под наем` : bg).replace(/\s+/g, " "), en: l.dealType === "RENT" ? `${en} for rent` : en };
}

function translitPlace(s: string) {
  return s
    .replace(/^с\.\s*/, "")
    .replace(/^гр\.\s*/, "")
    .split(/(\s+|\(|\))/)
    .map((w) => {
      const t = translit(w);
      return t.charAt(0).toUpperCase() + t.slice(1);
    })
    .join("")
    .replace(/^До Магистрала Тракия$/i, "near Trakia motorway");
}

/* ---------------- main ---------------- */

async function discoverIds(): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? `${PROFILE}/` : `${PROFILE}/obiavi/p-${page}`;
    let html: string;
    try {
      html = await fetchPage(url);
    } catch (e) {
      console.warn(`  ! could not read ${url}: ${(e as Error).message}`);
      break;
    }
    const before = found.size;
    for (const m of html.matchAll(/obiava-([0-9][a-z][0-9]{10,})-([a-z0-9-]+)/g)) {
      if (!found.has(m[1])) found.set(m[1], `${PROFILE}/obiava-${m[1]}-${m[2]}`);
    }
    console.log(`  page ${page}: ${found.size - before} listings`);
    if (found.size === before || !html.includes(`p-${page + 1}`)) break;
    await sleep(DELAY_MS);
  }
  return found;
}

async function nextRefNo() {
  const rows = await db.property.findMany({ where: { refNo: { startsWith: "NX-" } }, select: { refNo: true } });
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.refNo.slice(3)) || 0), 1000);
  return `NX-${max + 1}`;
}

async function main() {
  console.log(`Nextimo ← imot.bg import ${DRY ? "(DRY RUN — nothing is saved)" : ""}`);
  const admin = await db.user.findFirst({ where: { role: "ADMIN", active: true }, orderBy: { createdAt: "asc" } });

  console.log("Reading the agency profile…");
  const live = await discoverIds();
  const base = new Map(BASE.map((r) => [r[0], fromBase(r)]));
  if (live.size === 0) console.log("  Could not read the profile — falling back to the saved list of 79 listings.");

  const ids = live.size ? [...live.keys()] : [...base.keys()];
  const todo = LIMIT ? ids.slice(0, LIMIT) : ids;
  console.log(`${todo.length} listings to process.\n`);

  if (!DRY) {
    // Remove the 3 demo listings created by the seed (only if nothing is linked to them)
    const demo = await db.property.deleteMany({ where: { slug: { endsWith: "-demo" }, deals: { none: {} }, viewings: { none: {} } } });
    if (demo.count) console.log(`Removed ${demo.count} demo listings.\n`);
  }

  const preview: unknown[] = [];
  let created = 0, updated = 0, failed = 0, photos = 0;

  for (const [i, id] of todo.entries()) {
    const url = live.get(id) || base.get(id)!.url;
    process.stdout.write(`[${i + 1}/${todo.length}] ${id} … `);
    try {
      const html = await fetchPage(url);
      const listing = base.get(id) || fromPage(id, url, html);
      const text = htmlToText(html);
      const details = extractDetails(text);
      let description = extractDescription(html);
      const notes: string[] = [];
      if (listing.yard) notes.push(`Двор: ${listing.yard.toLocaleString("bg-BG")} м².`);
      if (listing.vatExcluded) notes.push("Цената е без ДДС.");
      if (notes.length) description = `${description}\n\n${notes.join(" ")}`.trim();
      const photoCandidates = extractPhotos(html, id);
      const title = makeTitle(listing);

      const data = {
        titleBg: title.bg,
        titleEn: title.en,
        descriptionBg: description || title.bg,
        dealType: listing.dealType,
        type: listing.type,
        price: listing.price ?? 0,
        priceOnRequest: listing.price == null,
        area: listing.area,
        rooms: ROOMS[listing.type] ?? null,
        floor: listing.floor,
        totalFloors: listing.totalFloors,
        yearBuilt: details.yearBuilt,
        construction: listing.type === "LAND" ? null : details.construction,
        heating: details.heating,
        furnishing: (details.furnishing ?? "UNFURNISHED") as Furnishing,
        city: listing.city,
        district: listing.district,
        features: listing.type === "LAND" ? [] : details.features,
        source: "imot.bg" as string,
        externalId: id,
        externalUrl: url,
      };

      if (DRY) {
        preview.push({ ...data, photos: photoCandidates.map((c) => c[0]) });
        console.log(`ok (${photoCandidates.length} photos found)`);
      } else {
        const existing = await db.property.findUnique({ where: { externalId: id }, include: { images: true } });
        let propertyId: string;
        if (existing) {
          // Keep the admin's own edits to title/description/status; refresh the facts from imot.bg
          await db.property.update({
            where: { id: existing.id },
            data: {
              price: data.price, priceOnRequest: data.priceOnRequest, area: data.area, floor: data.floor, totalFloors: data.totalFloors,
              externalUrl: url, ...(existing.status === "ARCHIVED" ? { status: "ACTIVE" as const } : {}),
            },
          });
          propertyId = existing.id;
          updated++;
        } else {
          const refNo = await nextRefNo();
          const p = await db.property.create({
            data: { ...data, refNo, slug: `${slugify(title.en || title.bg)}-${refNo.toLowerCase()}`, status: "ACTIVE", agentId: admin?.id ?? null },
          });
          propertyId = p.id;
          created++;
        }

        let got = 0;
        const hasImages = existing ? existing.images.length > 0 : false;
        if (!NO_PHOTOS && !hasImages) {
          const dir = path.join(UPLOAD_DIR, propertyId);
          await mkdir(dir, { recursive: true });
          for (const [order, candidates] of photoCandidates.entries()) {
            let buf: Buffer | null = null;
            for (const c of candidates) {
              buf = await download(c);
              if (buf) break;
            }
            if (!buf) continue;
            const name = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}.jpg`;
            await writeFile(path.join(dir, name), buf);
            await db.propertyImage.create({ data: { propertyId, url: `/uploads/${propertyId}/${name}`, order } });
            got++;
            await sleep(250);
          }
          photos += got;
        }
        console.log(`${existing ? "updated" : "created"}${NO_PHOTOS || hasImages ? "" : `, ${got} photos`}`);
      }
    } catch (e) {
      failed++;
      console.log(`FAILED: ${(e as Error).message}`);
    }
    await sleep(DELAY_MS);
  }

  if (ARCHIVE_MISSING && !DRY && live.size > 0) {
    const gone = await db.property.updateMany({
      where: { source: "imot.bg" as string, externalId: { notIn: [...live.keys()] }, status: { in: ["ACTIVE", "RESERVED"] } },
      data: { status: "ARCHIVED" },
    });
    console.log(`\nArchived ${gone.count} listings that are no longer on imot.bg.`);
  }

  if (DRY) {
    await writeFile("import-preview.json", JSON.stringify(preview, null, 2), "utf8");
    console.log(`\nPreview written to import-preview.json (${preview.length} listings). Run without --dry to import.`);
  } else {
    console.log(`\nDone: ${created} created, ${updated} updated, ${photos} photos, ${failed} failed.`);
    if (!admin) console.log("Note: no admin user found, so listings have no agent assigned. Run `npm run db:seed` first next time.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

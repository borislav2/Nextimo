import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDict, pick } from "@/lib/i18n";
import { cardInclude } from "@/lib/properties";
import { DEAL_TYPES, FEATURES, FURNISHING, PROPERTY_STATUS, PROPERTY_TYPES, label, type Lang } from "@/lib/constants";
import { formatNumber, formatPrice } from "@/lib/format";
import PropertyCard from "@/components/PropertyCard";
import InquiryForm from "@/components/InquiryForm";

const LIVE = ["ACTIVE", "RESERVED", "SOLD", "RENTED"] as const;

async function load(slug: string) {
  return db.property.findFirst({
    where: { slug, status: { in: [...LIVE] } },
    include: { images: { orderBy: { order: "asc" } }, agent: true },
  });
}

export async function generateMetadata({ params }: { params: { lang: Lang; slug: string } }): Promise<Metadata> {
  const p = await load(params.slug);
  if (!p) return {};
  const title = pick(params.lang, p.titleBg, p.titleEn);
  const desc = pick(params.lang, p.descriptionBg, p.descriptionEn).slice(0, 160);
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: p.images[0] ? [p.images[0].url] : [] },
  };
}

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: { lang: Lang; slug: string };
  searchParams: { img?: string };
}) {
  const lang = params.lang;
  const t = getDict(lang);
  const p = await load(params.slug);
  if (!p) notFound();

  db.property.update({ where: { id: p.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const similar = await db.property.findMany({
    where: { id: { not: p.id }, status: "ACTIVE", dealType: p.dealType, OR: [{ district: p.district }, { type: p.type }] },
    include: cardInclude,
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  const idx = Math.min(Math.max(0, parseInt(searchParams.img || "0") || 0), Math.max(0, p.images.length - 1));
  const main = p.images[idx];
  const side = p.images.filter((_, i) => i !== idx).slice(0, 2);
  const title = pick(lang, p.titleBg, p.titleEn);
  const closed = p.status === "SOLD" || p.status === "RENTED";
  const mapQuery = p.lat && p.lng ? `${p.lat},${p.lng}` : `${p.district}, ${p.city}, Bulgaria`;

  const specs: [string, string | null][] = [
    [t.property.area, `${formatNumber(p.area, lang)} m²`],
    [t.property.pricePerSqm, !p.priceOnRequest && p.dealType === "SALE" ? formatPrice(Math.round(p.price / p.area), lang) : null],
    [t.property.rooms, p.rooms ? String(p.rooms) : null],
    [t.property.bathrooms, p.bathrooms ? String(p.bathrooms) : null],
    [t.property.floor, p.floor != null ? `${p.floor}${p.totalFloors ? ` / ${p.totalFloors}` : ""}` : null],
    [t.property.year, p.yearBuilt ? String(p.yearBuilt) : null],
    [t.property.construction, p.construction],
    [t.property.heating, p.heating],
    [t.property.furnishing, label(FURNISHING, p.furnishing, lang)],
    [t.property.district, p.district],
  ];

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <Link href={`/${lang}/properties`} className="muted small">← {t.property.back}</Link>

      <div className="row" style={{ margin: "14px 0 18px", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className={`badge ${p.dealType === "RENT" ? "blue" : "red"}`}>{label(DEAL_TYPES, p.dealType, lang)}</span>
            <span className="badge">{label(PROPERTY_TYPES, p.type, lang)}</span>
            {p.status !== "ACTIVE" && <span className="badge amber">{label(PROPERTY_STATUS, p.status, lang)}</span>}
            <span className="muted small">{t.property.ref} {p.refNo}</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem, 3.4vw, 2.4rem)", marginBottom: 4 }}>{title}</h1>
          <div className="muted">{p.district}, {p.city}{p.address ? ` · ${p.address}` : ""}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>
            {p.priceOnRequest ? t.property.onRequest : formatPrice(p.price, lang)}
            {!p.priceOnRequest && p.dealType === "RENT" && <span className="muted small"> {t.property.perMonth}</span>}
          </div>
        </div>
      </div>

      <div className="gallery">
        <div className="main">
          {main ? <img src={main.url} alt={title} /> : <div className="no-img">NEXTIMO</div>}
        </div>
        <div className="thumbs">
          {side.map((im) => (
            <Link key={im.id} href={`?img=${p.images.indexOf(im)}`} scroll={false}>
              <img src={im.url} alt="" />
            </Link>
          ))}
        </div>
      </div>
      {p.images.length > 1 && (
        <div className="strip">
          {p.images.map((im, i) => (
            <Link key={im.id} href={`?img=${i}`} scroll={false} className={i === idx ? "active" : ""}>
              <img src={im.url} alt="" loading="lazy" />
            </Link>
          ))}
        </div>
      )}

      <div className="detail-layout">
        <div>
          <div className="specs">
            {specs.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>

          <h2 style={{ marginTop: 32 }}>{t.property.description}</h2>
          <div className="prose">{pick(lang, p.descriptionBg, p.descriptionEn)}</div>

          {p.features.length > 0 && (
            <>
              <h2 style={{ marginTop: 28 }}>{t.property.features}</h2>
              <div className="features">
                {p.features.map((f) => <span key={f}>✓ {label(FEATURES, f, lang)}</span>)}
              </div>
            </>
          )}

          <h2 style={{ marginTop: 28 }}>{t.property.location}</h2>
          <iframe
            className="map"
            loading="lazy"
            title={t.property.location}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${p.lat ? 16 : 14}&output=embed`}
          />
        </div>

        <aside className="sticky-side">
          {p.agent && p.agent.showOnSite && (
            <div className="card pad" style={{ marginBottom: 16 }}>
              <div className="muted small" style={{ marginBottom: 10 }}>{t.property.agent}</div>
              <div className="agent-row">
                {p.agent.photoUrl ? <img className="avatar" src={p.agent.photoUrl} alt="" /> : <div className="avatar">{p.agent.name[0]}</div>}
                <div>
                  <b>{p.agent.name}</b>
                  {p.agent.phone && <div><a href={`tel:${p.agent.phone.replace(/\s/g, "")}`}>{p.agent.phone}</a></div>}
                </div>
              </div>
            </div>
          )}
          {!closed && (
            <div className="card pad">
              <h3>{t.form.title}</h3>
              <InquiryForm t={t} lang={lang} propertyId={p.id} kind="PROPERTY" defaultMessage={`${t.form.defaultMsg} (${p.refNo})`} />
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <h2>{t.property.similar}</h2>
          <div className="grid grid-3">
            {similar.map((s) => <PropertyCard key={s.id} p={s} lang={lang} />)}
          </div>
        </section>
      )}
    </div>
  );
}

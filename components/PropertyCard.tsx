import Link from "next/link";
import type { CardProperty } from "@/lib/properties";
import { DEAL_TYPES, PROPERTY_STATUS, PROPERTY_TYPES, label, type Lang } from "@/lib/constants";
import { formatNumber, formatPrice } from "@/lib/format";
import { getDict, pick } from "@/lib/i18n";

export default function PropertyCard({ p, lang }: { p: CardProperty; lang: Lang }) {
  const t = getDict(lang);
  const img = p.images[0]?.url;
  return (
    <Link href={`/${lang}/properties/${p.slug}`} className="card prop-card">
      <div className="img">
        {img ? <img src={img} alt={pick(lang, p.titleBg, p.titleEn)} loading="lazy" /> : <div className="no-img">NEXTIMO</div>}
        <div className="badges">
          <span className={`badge ${p.dealType === "RENT" ? "blue" : "red"}`}>{label(DEAL_TYPES, p.dealType, lang)}</span>
          {p.status === "RESERVED" && <span className="badge amber">{label(PROPERTY_STATUS, p.status, lang)}</span>}
        </div>
      </div>
      <div className="body">
        <div className="price">
          {p.priceOnRequest ? t.property.onRequest : formatPrice(p.price, lang)}
          {!p.priceOnRequest && p.dealType === "RENT" && <span className="muted small"> {t.property.perMonth}</span>}
        </div>
        <h3 style={{ margin: 0 }}>{pick(lang, p.titleBg, p.titleEn)}</h3>
        <div className="muted small">{label(PROPERTY_TYPES, p.type, lang)} · {p.district}, {p.city}</div>
        <div className="meta">
          <span>{formatNumber(p.area, lang)} m²</span>
          {p.rooms ? <span>{p.rooms} {t.property.rooms.toLowerCase()}</span> : null}
          {p.floor != null ? <span>{t.property.floor} {p.floor}{p.totalFloors ? `/${p.totalFloors}` : ""}</span> : null}
        </div>
      </div>
    </Link>
  );
}

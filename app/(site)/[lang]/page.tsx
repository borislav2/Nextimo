import Link from "next/link";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { cardInclude, getDistricts } from "@/lib/properties";
import { PROPERTY_TYPES, type Lang } from "@/lib/constants";
import PropertyCard from "@/components/PropertyCard";

export default async function Home({ params }: { params: { lang: Lang } }) {
  const lang = params.lang;
  const t = getDict(lang);
  const live = { status: { in: ["ACTIVE", "RESERVED"] as ("ACTIVE" | "RESERVED")[] } };

  const [featured, latest, activeCount, districts, heroImg] = await Promise.all([
    db.property.findMany({ where: { ...live, featured: true }, include: cardInclude, orderBy: { updatedAt: "desc" }, take: 6 }),
    db.property.findMany({ where: { ...live, featured: false }, include: cardInclude, orderBy: { createdAt: "desc" }, take: 6 }),
    db.property.count({ where: live }),
    getDistricts(),
    db.propertyImage.findFirst({ where: { property: { ...live, featured: true } }, orderBy: [{ property: { updatedAt: "desc" } }, { order: "asc" }] }),
  ]);

  return (
    <>
      <section className="hero">
        <div
          className={`hero-bg ${heroImg ? "" : "fallback"}`}
          style={heroImg ? { backgroundImage: `url(${heroImg.url})` } : undefined}
        />
        <div className="container">
          <h1>{t.hero.title}</h1>
          <p className="lead">{t.hero.subtitle}</p>

          <form action={`/${lang}/properties`} className="search-box">
            <div className="tabs">
              <label><input type="radio" name="deal" value="SALE" defaultChecked /><span>{t.nav.sale}</span></label>
              <label><input type="radio" name="deal" value="RENT" /><span>{t.nav.rent}</span></label>
            </div>
            <select name="type" aria-label={t.list.type} defaultValue="">
              <option value="">{t.hero.anyType}</option>
              {Object.entries(PROPERTY_TYPES).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
            </select>
            <select name="district" aria-label={t.list.district} defaultValue="">
              <option value="">{t.hero.anyDistrict}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input name="max" type="number" min={0} placeholder={t.hero.maxPrice} aria-label={t.hero.maxPrice} />
            <button className="btn">{t.hero.search}</button>
          </form>

          <div className="hero-stats">
            <div><b>{activeCount}</b><span>{t.home.stats[0]}</span></div>
            <div><b>{Math.max(districts.length, 1)}</b><span>{t.home.stats[1]}</span></div>
            <div><b>24/7</b><span>{t.home.stats[2]}</span></div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>{t.home.featured}</h2>
              <Link href={`/${lang}/properties`} className="btn secondary">{t.home.viewAll} →</Link>
            </div>
            <div className="grid grid-3">
              {featured.map((p) => <PropertyCard key={p.id} p={p} lang={lang} />)}
            </div>
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section className="section" style={{ paddingTop: featured.length ? 0 : undefined }}>
          <div className="container">
            <div className="section-head">
              <h2>{t.home.latest}</h2>
              {!featured.length && <Link href={`/${lang}/properties`} className="btn secondary">{t.home.viewAll} →</Link>}
            </div>
            <div className="grid grid-3">
              {latest.map((p) => <PropertyCard key={p.id} p={p} lang={lang} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section services" style={{ background: "#fff", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container">
          <h2>{t.home.servicesTitle}</h2>
          <div className="grid grid-4" style={{ marginTop: 20 }}>
            {t.home.services.map((s, i) => (
              <div key={s.t} className="card">
                <div className="num">{i + 1}</div>
                <h3>{s.t}</h3>
                <p className="muted small" style={{ margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div style={{ flex: 1, minWidth: 260 }}>
              <h2 style={{ color: "#fff" }}>{t.home.sellTitle}</h2>
              <p>{t.home.sellText}</p>
            </div>
            <Link href={`/${lang}/sell`} className="btn">{t.home.sellCta}</Link>
          </div>
        </div>
      </section>
    </>
  );
}

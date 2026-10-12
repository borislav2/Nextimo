import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n";
import { getDistricts, listPublic, type ListParams } from "@/lib/properties";
import { PROPERTY_TYPES, type Lang } from "@/lib/constants";
import PropertyCard from "@/components/PropertyCard";

export async function generateMetadata({ params }: { params: { lang: Lang } }): Promise<Metadata> {
  return { title: getDict(params.lang).list.title };
}

export default async function Properties({ params, searchParams }: { params: { lang: Lang }; searchParams: ListParams }) {
  const lang = params.lang;
  const t = getDict(lang);
  const [{ items, total, page, pages }, districts] = await Promise.all([listPublic(searchParams), getDistricts()]);

  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => { if (v && k !== "page") q.set(k, String(v)); });
    q.set("page", String(n));
    return `/${lang}/properties?${q.toString()}`;
  };

  const heading = searchParams.deal === "SALE" ? t.nav.sale : searchParams.deal === "RENT" ? t.nav.rent : t.list.title;

  return (
    <div className="container">
      <div className="page-head">
        <h1>{heading}</h1>
        <p className="muted">{total} {t.list.results}</p>
      </div>

      <div className="list-layout">
        <form className="card filters" action={`/${lang}/properties`}>
          <h3>{t.list.filters}</h3>
          <div className="field">
            <label>{t.list.dealType}</label>
            <select name="deal" defaultValue={searchParams.deal || ""}>
              <option value="">{t.list.all}</option>
              <option value="SALE">{t.nav.sale}</option>
              <option value="RENT">{t.nav.rent}</option>
            </select>
          </div>
          <div className="field">
            <label>{t.list.type}</label>
            <select name="type" defaultValue={searchParams.type || ""}>
              <option value="">{t.list.all}</option>
              {Object.entries(PROPERTY_TYPES).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t.list.district}</label>
            <select name="district" defaultValue={searchParams.district || ""}>
              <option value="">{t.list.all}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <div className="field" style={{ flex: 1 }}>
              <label>{t.list.priceFrom}</label>
              <input name="min" type="number" min={0} defaultValue={searchParams.min} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>{t.list.priceTo}</label>
              <input name="max" type="number" min={0} defaultValue={searchParams.max} />
            </div>
          </div>
          <div className="field">
            <label>{t.list.areaFrom}</label>
            <input name="area" type="number" min={0} defaultValue={searchParams.area} />
          </div>
          <div className="field">
            <label>{t.list.sort}</label>
            <select name="sort" defaultValue={searchParams.sort || ""}>
              <option value="">{t.list.newest}</option>
              <option value="price_asc">{t.list.priceAsc}</option>
              <option value="price_desc">{t.list.priceDesc}</option>
            </select>
          </div>
          <div className="row">
            <button className="btn" style={{ flex: 1 }}>{t.list.apply}</button>
            <Link href={`/${lang}/properties`} className="btn secondary">{t.list.reset}</Link>
          </div>
        </form>

        <div>
          {items.length === 0 ? (
            <div className="card pad muted">{t.list.none}</div>
          ) : (
            <div className="grid grid-3">
              {items.map((p) => <PropertyCard key={p.id} p={p} lang={lang} />)}
            </div>
          )}
          {pages > 1 && (
            <div className="pager">
              {page > 1 && <Link className="btn secondary" href={pageHref(page - 1)}>← {t.list.prev}</Link>}
              <span className="btn ghost">{page} / {pages}</span>
              {page < pages && <Link className="btn secondary" href={pageHref(page + 1)}>{t.list.next} →</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

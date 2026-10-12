import "../../globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mainFont } from "@/lib/fonts";
import { getDict, isLang } from "@/lib/i18n";
import { getSettings } from "@/lib/db";
import type { Lang } from "@/lib/constants";
import { Suspense } from "react";
import LangSwitch from "@/components/LangSwitch";

// Listings change all the time, so pages are rendered on each request
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const en = params.lang === "en";
  return {
    title: {
      default: en ? "Nextimo Real Estate – Properties in Plovdiv" : "Nextimo Недвижими имоти – Имоти в Пловдив",
      template: "%s | Nextimo",
    },
    description: en
      ? "Apartments and houses for sale and rent in Plovdiv. Free valuation and full support."
      : "Апартаменти и къщи за продажба и под наем в Пловдив. Безплатна оценка и пълно съдействие.",
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    alternates: { languages: { bg: "/bg", en: "/en" } },
    icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang as Lang;
  const t = getDict(lang);
  const s = await getSettings();
  const other = lang === "bg" ? "en" : "bg";

  const links = [
    { href: `/${lang}/properties?deal=SALE`, label: t.nav.sale },
    { href: `/${lang}/properties?deal=RENT`, label: t.nav.rent },
    { href: `/${lang}/sell`, label: t.nav.sell },
    { href: `/${lang}/about`, label: t.nav.about },
    { href: `/${lang}/contact`, label: t.nav.contact },
  ];

  return (
    <html lang={lang} className={mainFont.variable}>
      <body>
        <header className="site-header">
          <div className="container inner">
            <Link href={`/${lang}`} className="brand">
              <img src="/logo.png" alt="" />
              <span>
                NEXTIMO
                <small>{lang === "bg" ? "НЕДВИЖИМИ ИМОТИ" : "REAL ESTATE"}</small>
              </span>
            </Link>
            <nav className="nav">
              {links.map((l) => (
                <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
            </nav>
            <div className="spacer" />
            <Suspense>
              <LangSwitch lang={lang} className="header-cta" />
            </Suspense>
            {s.phone && <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="btn header-cta">{s.phone}</a>}
            <details className="menu-toggle">
              <summary>☰</summary>
              <div className="mobile-nav">
                {links.map((l) => (
                  <Link key={l.href} href={l.href}>{l.label}</Link>
                ))}
                <Link href={`/${other}`}>{other === "en" ? "English" : "Български"}</Link>
                {s.phone && <a href={`tel:${s.phone.replace(/\s/g, "")}`}>📞 {s.phone}</a>}
              </div>
            </details>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="container">
            <div className="cols">
              <div>
                <div className="brand" style={{ color: "#fff", marginBottom: 12 }}>
                  <img src="/logo.png" alt="" />
                  <span>NEXTIMO<small>{lang === "bg" ? "НЕДВИЖИМИ ИМОТИ" : "REAL ESTATE"}</small></span>
                </div>
                <p className="small">{lang === "bg" ? s.addressBg : s.addressEn}</p>
                <p className="small">{lang === "bg" ? s.hoursBg : s.hoursEn}</p>
              </div>
              <div>
                <h4>{t.nav.properties}</h4>
                <p className="small"><Link href={`/${lang}/properties?deal=SALE`}>{t.nav.sale}</Link></p>
                <p className="small"><Link href={`/${lang}/properties?deal=RENT`}>{t.nav.rent}</Link></p>
                <p className="small"><Link href={`/${lang}/sell`}>{t.nav.sell}</Link></p>
              </div>
              <div>
                <h4>{t.nav.contact}</h4>
                {s.phone && <p className="small"><a href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></p>}
                {s.email && <p className="small"><a href={`mailto:${s.email}`}>{s.email}</a></p>}
                <p className="small">
                  {s.facebook && <a href={s.facebook} target="_blank" rel="noopener">Facebook</a>}
                  {s.instagram && <> · <a href={s.instagram} target="_blank" rel="noopener">Instagram</a></>}
                </p>
              </div>
            </div>
            <div className="bottom">© {new Date().getFullYear()} {s.companyName}. {t.footer.rights}</div>
          </div>
        </footer>
        {s.phone && (
          <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="btn call-fab">📞 {lang === "bg" ? "Обади се" : "Call"}</a>
        )}
      </body>
    </html>
  );
}

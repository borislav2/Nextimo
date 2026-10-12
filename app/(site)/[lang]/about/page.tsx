import type { Metadata } from "next";
import Link from "next/link";
import { db, getSettings } from "@/lib/db";
import { getDict, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

export async function generateMetadata({ params }: { params: { lang: Lang } }): Promise<Metadata> {
  return { title: getDict(params.lang).about.title };
}

const DEFAULT_BG = `Nextimo е агенция за недвижими имоти в Пловдив. Помагаме на хората да купят, продадат и наемат жилища и търговски площи — с подбрани обяви, професионални снимки и лично отношение във всяка стъпка.

Работим с проверени собственици и купувачи, организираме огледите и съдействаме за документите до финалния подпис при нотариуса.`;

const DEFAULT_EN = `Nextimo is a real estate agency in Plovdiv. We help people buy, sell and rent homes and commercial spaces — with curated listings, professional photography and personal care at every step.

We work with verified owners and buyers, organise viewings and help with the paperwork all the way to the notary.`;

export default async function About({ params }: { params: { lang: Lang } }) {
  const lang = params.lang;
  const t = getDict(lang);
  const s = await getSettings();
  const agents = await db.user.findMany({ where: { active: true, showOnSite: true }, orderBy: { createdAt: "asc" } });
  const text = pick(lang, s.aboutBg || DEFAULT_BG, s.aboutEn || DEFAULT_EN);

  return (
    <div className="container">
      <div className="page-head"><h1>{t.about.title}</h1></div>
      <div className="prose" style={{ fontSize: "1.08rem" }}>{text}</div>

      {agents.length > 0 && (
        <section className="section">
          <h2>{lang === "bg" ? "Нашият екип" : "Our team"}</h2>
          <div className="grid grid-4">
            {agents.map((a) => (
              <div key={a.id} className="card pad">
                <div className="agent-row" style={{ marginBottom: 10 }}>
                  {a.photoUrl ? <img className="avatar" src={a.photoUrl} alt="" /> : <div className="avatar">{a.name[0]}</div>}
                  <div>
                    <b>{a.name}</b>
                    {a.phone && <div className="small"><a href={`tel:${a.phone.replace(/\s/g, "")}`}>{a.phone}</a></div>}
                  </div>
                </div>
                {(a.bioBg || a.bioEn) && <p className="muted small" style={{ margin: 0 }}>{pick(lang, a.bioBg || "", a.bioEn)}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="cta-band" style={{ marginTop: 24 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ color: "#fff" }}>{t.home.sellTitle}</h2>
          <p>{t.home.sellText}</p>
        </div>
        <Link href={`/${lang}/sell`} className="btn">{t.home.sellCta}</Link>
      </div>
    </div>
  );
}

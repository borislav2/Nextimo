import type { Metadata } from "next";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";
import SellForm from "@/components/SellForm";

export async function generateMetadata({ params }: { params: { lang: Lang } }): Promise<Metadata> {
  return { title: getDict(params.lang).nav.sell };
}

export default function SellPage({ params }: { params: { lang: Lang } }) {
  const t = getDict(params.lang);
  return (
    <div className="container">
      <div className="page-head">
        <h1>{t.sell.title}</h1>
        <p className="muted" style={{ maxWidth: 640 }}>{t.sell.intro}</p>
      </div>
      <div className="detail-layout" style={{ marginTop: 12 }}>
        <div className="card pad">
          <SellForm t={t} lang={params.lang} />
        </div>
        <div className="grid">
          {t.sell.steps.map((s, i) => (
            <div key={s} className="card pad row">
              <span className="badge red">{i + 1}</span>
              <b>{s}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

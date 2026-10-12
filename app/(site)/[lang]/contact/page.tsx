import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";
import InquiryForm from "@/components/InquiryForm";

export async function generateMetadata({ params }: { params: { lang: Lang } }): Promise<Metadata> {
  return { title: getDict(params.lang).contact.title };
}

export default async function Contact({ params }: { params: { lang: Lang } }) {
  const lang = params.lang;
  const t = getDict(lang);
  const s = await getSettings();

  return (
    <div className="container">
      <div className="page-head"><h1>{t.contact.title}</h1></div>
      <div className="detail-layout" style={{ marginTop: 12 }}>
        <div>
          <div className="specs" style={{ marginBottom: 20 }}>
            {s.phone && <div><span>{t.contact.phone}</span><b><a href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></b>{s.phone2 && <div><a href={`tel:${s.phone2.replace(/\s/g, "")}`}>{s.phone2}</a></div>}</div>}
            {s.email && <div><span>{t.contact.email}</span><b><a href={`mailto:${s.email}`}>{s.email}</a></b></div>}
            <div><span>{t.contact.address}</span><b>{lang === "bg" ? s.addressBg : s.addressEn}</b></div>
            <div><span>{t.contact.hours}</span><b>{lang === "bg" ? s.hoursBg : s.hoursEn}</b></div>
          </div>
          <iframe
            className="map"
            style={{ height: 380 }}
            loading="lazy"
            title="Map"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(s.addressBg ? `${s.addressBg}, България` : `${s.mapLat},${s.mapLng}`)}&z=16&output=embed`}
          />
        </div>
        <aside className="card pad">
          <h3>{t.contact.write}</h3>
          <InquiryForm t={t} lang={lang} kind="GENERAL" />
        </aside>
      </div>
    </div>
  );
}

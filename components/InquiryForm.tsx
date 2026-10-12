"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";

type Props = {
  t: Dict;
  lang: string;
  propertyId?: string;
  kind?: "PROPERTY" | "GENERAL";
  defaultMessage?: string;
  showViewing?: boolean;
};

export default function InquiryForm({ t, lang, propertyId, kind = "GENERAL", defaultMessage = "", showViewing = false }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [viewing, setViewing] = useState(showViewing);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, propertyId, lang, kind: viewing ? "VIEWING" : kind }),
      });
      if (!res.ok) throw new Error();
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") return <div className="alert ok">{t.form.sent}</div>;

  return (
    <form onSubmit={onSubmit}>
      {state === "error" && <div className="alert">{t.form.error}</div>}
      <div className="field">
        <label>{t.form.name} *</label>
        <input name="name" required maxLength={100} autoComplete="name" />
      </div>
      <div className="field">
        <label>{t.form.phone} *</label>
        <input name="phone" type="tel" required maxLength={30} autoComplete="tel" />
      </div>
      <div className="field">
        <label>{t.form.email}</label>
        <input name="email" type="email" maxLength={120} autoComplete="email" />
      </div>
      {propertyId && (
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={viewing} onChange={(e) => setViewing(e.target.checked)} /> {t.form.wantViewing}
          </label>
        </div>
      )}
      {viewing && (
        <div className="field">
          <label>{t.form.preferredDate}</label>
          <input name="preferredDate" maxLength={80} />
        </div>
      )}
      <div className="field">
        <label>{t.form.message}</label>
        <textarea name="message" defaultValue={defaultMessage} maxLength={2000} />
      </div>
      {/* Honeypot against spam bots */}
      <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
      <div className="field">
        <label className="check">
          <input type="checkbox" required /> {t.form.consent}
        </label>
      </div>
      <button className="btn" style={{ width: "100%" }} disabled={state === "sending"}>
        {state === "sending" ? t.form.sending : t.form.send}
      </button>
    </form>
  );
}

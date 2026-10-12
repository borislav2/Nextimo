"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";

export default function SellForm({ t, lang }: { t: Dict; lang: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const kind = data.sellType === "valuation" ? "VALUATION" : "SELL";
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, kind, lang }),
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
        <label>{t.sell.kind}</label>
        <div className="row">
          <label className="check"><input type="radio" name="sellType" value="sale" defaultChecked /> {t.sell.sellOpt}</label>
          <label className="check"><input type="radio" name="sellType" value="rent" /> {t.sell.rentOpt}</label>
          <label className="check"><input type="radio" name="sellType" value="valuation" /> {t.sell.valuationOpt}</label>
        </div>
      </div>
      <div className="form-grid">
        <div><label>{t.form.name} *</label><input name="name" required maxLength={100} /></div>
        <div><label>{t.form.phone} *</label><input name="phone" type="tel" required maxLength={30} /></div>
        <div className="full"><label>{t.form.email}</label><input name="email" type="email" maxLength={120} /></div>
        <div className="full"><label>{t.sell.details}</label><textarea name="message" maxLength={2000} /></div>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
      <div className="field" style={{ marginTop: 14 }}>
        <label className="check"><input type="checkbox" required /> {t.form.consent}</label>
      </div>
      <button className="btn" disabled={state === "sending"}>{state === "sending" ? t.form.sending : t.form.send}</button>
    </form>
  );
}

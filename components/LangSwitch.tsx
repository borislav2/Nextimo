"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function LangSwitch({ lang, className = "" }: { lang: string; className?: string }) {
  const pathname = usePathname() || `/${lang}`;
  const search = useSearchParams()?.toString();
  const swap = (to: string) => pathname.replace(/^\/(bg|en)/, `/${to}`) + (search ? `?${search}` : "");
  return (
    <div className={`lang-switch ${className}`}>
      {["bg", "en"].map((l) => (
        <Link key={l} href={swap(l)} className={l === lang ? "active" : ""}>
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

import "../globals.css";
import type { Metadata } from "next";
import { mainFont } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "Админ панел", template: "%s | Nextimo Admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={mainFont.variable}>
      <body>{children}</body>
    </html>
  );
}

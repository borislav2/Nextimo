"use client";

export default function PrintButton() {
  return <button className="btn" onClick={() => window.print()}>Печат / Запази като PDF</button>;
}

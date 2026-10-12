"use client";

import { useRef } from "react";

type Props = {
  action: (fd: FormData) => Promise<void>;
  name: string;
  value: string;
  options: { value: string; label: string }[];
};

/** A select that saves itself as soon as it changes */
export default function AutoSubmitSelect({ action, name, value, options }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={ref} className="inline-form">
      <select name={name} defaultValue={value} onChange={() => ref.current?.requestSubmit()}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <noscript><button className="btn small">OK</button></noscript>
    </form>
  );
}

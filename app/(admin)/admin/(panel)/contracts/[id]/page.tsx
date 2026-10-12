import Link from "next/link";
import { notFound } from "next/navigation";
import { db, getSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteContract, updateContract, type Party } from "@/lib/actions/contracts";
import { contractFormOptions } from "@/lib/contracts";
import ContractForm from "@/components/admin/ContractForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageTop, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Договор" };

export default async function ContractPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const user = await requireUser();
  const c = await db.contract.findUnique({ where: { id: params.id } });
  if (!c) notFound();
  const [opts, settings] = await Promise.all([contractFormOptions(), getSettings()]);

  return (
    <>
      <PageTop title={`Договор ${c.number}`} back="/admin/contracts">
        <StatusBadge kind="contract" value={c.status} />
        <Link href={`/admin/contract-print/${c.id}`} target="_blank" className="btn small">Печат / PDF</Link>
      </PageTop>
      <Flash ok={searchParams.saved ? "Записано." : undefined} />
      <ContractForm
        action={updateContract.bind(null, c.id)}
        contract={{
          number: c.number, type: c.type, status: c.status, propertyId: c.propertyId,
          partyA: c.partyA as unknown as Party, partyB: c.partyB as unknown as Party,
          price: c.price, deposit: c.deposit, commissionPct: c.commissionPct, termMonths: c.termMonths,
          signedAt: c.signedAt ? c.signedAt.toISOString().slice(0, 10) : "", notes: c.notes ?? "", agentId: c.agentId,
        }}
        properties={opts.properties}
        clients={opts.clients}
        agents={opts.agents}
        defaults={{ agentId: user.id, commissionPct: settings.defaultCommissionPct }}
      />
      {user.role === "ADMIN" && (
        <form action={deleteContract.bind(null, c.id)} style={{ marginTop: 20 }}>
          <ConfirmButton message="Изтриване на договора?">Изтрий договора</ConfirmButton>
        </form>
      )}
    </>
  );
}

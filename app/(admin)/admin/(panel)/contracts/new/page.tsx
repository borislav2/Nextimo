import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { createContract } from "@/lib/actions/contracts";
import { contractFormOptions } from "@/lib/contracts";
import ContractForm from "@/components/admin/ContractForm";
import { Flash, PageTop } from "@/components/admin/ui";

export const metadata = { title: "Нов договор" };

export default async function NewContract({ searchParams }: { searchParams: { property?: string; client?: string; error?: string } }) {
  const user = await requireUser();
  const [opts, settings] = await Promise.all([contractFormOptions(), getSettings()]);

  return (
    <>
      <PageTop title="Нов договор" back="/admin/contracts" />
      <Flash error={searchParams.error ? "Изберете имот и попълнете имената на страните." : undefined} />
      <ContractForm
        action={createContract}
        properties={opts.properties}
        clients={opts.clients}
        agents={opts.agents}
        defaults={{ propertyId: searchParams.property, clientId: searchParams.client, agentId: user.id, commissionPct: settings.defaultCommissionPct }}
      />
    </>
  );
}

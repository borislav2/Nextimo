import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/actions/crm";
import ClientForm from "@/components/admin/ClientForm";
import { PageTop } from "@/components/admin/ui";

export const metadata = { title: "Нов клиент" };

export default async function NewClient() {
  const user = await requireUser();
  const agents = await db.user.findMany({ where: { active: true }, select: { id: true, name: true } });
  return (
    <>
      <PageTop title="Нов клиент" back="/admin/clients" />
      <ClientForm action={createClient} agents={agents} currentUserId={user.id} />
    </>
  );
}

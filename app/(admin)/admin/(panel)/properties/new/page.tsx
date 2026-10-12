import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createProperty } from "@/lib/actions/properties";
import PropertyForm from "@/components/admin/PropertyForm";
import { PageTop } from "@/components/admin/ui";

export const metadata = { title: "Нов имот" };

export default async function NewProperty() {
  const user = await requireUser();
  const [agents, owners] = await Promise.all([
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    db.client.findMany({ where: { type: { in: ["OWNER", "LANDLORD"] } }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageTop title="Нов имот" back="/admin/properties" />
      <PropertyForm action={createProperty} agents={agents} owners={owners} currentUserId={user.id} />
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { db, getSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteDeal, updateDeal } from "@/lib/actions/schedule";
import { formatPrice } from "@/lib/format";
import DealForm from "@/components/admin/DealForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageTop, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Сделка" };

export default async function DealPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const user = await requireUser();
  const d = await db.deal.findUnique({
    where: { id: params.id },
    include: { property: { include: { owner: true } }, client: true, agent: true },
  });
  if (!d) notFound();
  const [agents, settings] = await Promise.all([
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  const share = Math.round((d.commissionAmount * d.agentSharePct) / 100);

  return (
    <>
      <PageTop title={`Сделка ${d.property.refNo}`} back="/admin/deals">
        <StatusBadge kind="deal" value={d.status} />
      </PageTop>
      <Flash ok={searchParams.saved ? "Записано." : undefined} />
      <div className="two-col">
        <DealForm
          action={updateDeal.bind(null, d.id)}
          deal={d}
          agents={agents.map((a) => ({ id: a.id, label: a.name }))}
          defaults={{ agentId: user.id, commissionPct: settings.defaultCommissionPct }}
        />
        <aside className="grid" style={{ gap: 16 }}>
          <div className="card pad small">
            <h3>Страни</h3>
            <p><span className="muted">Имот:</span> <Link href={`/admin/properties/${d.property.id}`} style={{ color: "var(--red)" }}>{d.property.refNo}</Link> {d.property.titleBg}</p>
            <p><span className="muted">Клиент:</span> <Link href={`/admin/clients/${d.client.id}`} style={{ color: "var(--red)" }}>{d.client.name}</Link> {d.client.phone}</p>
            {d.property.owner && <p><span className="muted">Собственик:</span> <Link href={`/admin/clients/${d.property.owner.id}`} style={{ color: "var(--red)" }}>{d.property.owner.name}</Link> {d.property.owner.phone}</p>}
          </div>
          <div className="card pad small">
            <h3>Сметка</h3>
            <p><span className="muted">Цена:</span> <b>{formatPrice(d.price)}</b></p>
            <p><span className="muted">Комисиона:</span> <b>{formatPrice(d.commissionAmount)}</b> ({d.commissionPct}%)</p>
            <p><span className="muted">Брокер ({d.agent?.name ?? "—"}):</span> <b>{formatPrice(share)}</b> ({d.agentSharePct}%)</p>
            <p><span className="muted">Агенция:</span> <b>{formatPrice(d.commissionAmount - share)}</b></p>
            {d.depositAmount ? <p><span className="muted">Капаро:</span> <b>{formatPrice(d.depositAmount)}</b></p> : null}
          </div>
          {user.role === "ADMIN" && (
            <form action={deleteDeal.bind(null, d.id)}>
              <ConfirmButton message="Изтриване на сделката?">Изтрий сделката</ConfirmButton>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}

import { notFound } from "next/navigation";
import { db, getSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CONTRACT_TYPES, PROPERTY_TYPES, label } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import type { Party } from "@/lib/actions/contracts";
import PrintButton from "./PrintButton";

export const metadata = { title: "Договор" };

const DASH = "…………………………";

function PartyText({ p }: { p: Party }) {
  return (
    <>
      <b>{p.name || DASH}</b>
      {p.egn ? <>, ЕГН/ЕИК {p.egn}</> : null}
      {p.idCard ? <>, лична карта {p.idCard}</> : null}
      {p.address ? <>, с адрес {p.address}</> : null}
      {p.phone ? <>, тел. {p.phone}</> : null}
      {p.email ? <>, имейл {p.email}</> : null}
    </>
  );
}

function SignBox({ title, name }: { title: string; name: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 48, borderTop: "1px solid #000", paddingTop: 4, fontSize: 13 }}>{name || DASH}</div>
    </div>
  );
}

export default async function ContractPrint({ params }: { params: { id: string } }) {
  await requireUser();
  const c = await db.contract.findUnique({ where: { id: params.id }, include: { property: true, agent: { select: { name: true } } } });
  if (!c) notFound();
  const settings = await getSettings();
  const a = c.partyA as unknown as Party;
  const b = c.partyB as unknown as Party;
  const p = c.property;
  const date = (c.signedAt ?? c.createdAt).toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Sofia" });

  const propertyLine = (
    <>
      {label(PROPERTY_TYPES, p.type).toLowerCase()} {p.refNo} — {p.titleBg}, {p.city}, {p.district}
      {p.address ? `, ${p.address}` : ""}, със застроена площ {p.area} м²
      {p.floor != null ? `, етаж ${p.floor}${p.totalFloors ? ` от ${p.totalFloors}` : ""}` : ""}
    </>
  );

  let clauses: React.ReactNode[] = [];
  let partiesBlock: React.ReactNode;
  let signBlock: React.ReactNode;

  if (c.type === "PRELIMINARY_SALE") {
    partiesBlock = (
      <>
        <p>1. <PartyText p={a} />, наричан по-долу <b>ПРОДАВАЧ</b>, и</p>
        <p>2. <PartyText p={b} />, наричан по-долу <b>КУПУВАЧ</b>,</p>
        <p>се споразумяха за следното:</p>
      </>
    );
    clauses = [
      <>ПРОДАВАЧЪТ се задължава да продаде, а КУПУВАЧЪТ да купи следния недвижим имот: {propertyLine}.</>,
      <>Продажната цена на имота е <b>{formatPrice(c.price)}</b>.</>,
      c.deposit ? <>При подписване на договора КУПУВАЧЪТ заплаща на ПРОДАВАЧА капаро в размер на <b>{formatPrice(c.deposit)}</b>, което се счита за част от продажната цена. Остатъкът от <b>{formatPrice(c.price - c.deposit)}</b> се заплаща при изповядване на сделката пред нотариус.</> : <>Цената се заплаща изцяло при изповядване на сделката пред нотариус.</>,
      <>ПРОДАВАЧЪТ декларира, че е собственик на имота, че същият е свободен от тежести, възбрани, ипотеки и права на трети лица, освен ако не е изрично посочено друго.</>,
      <>Страните се задължават да изповядат сделката с нотариален акт в срок до ……………………… Разноските по прехвърлянето са за сметка на КУПУВАЧА, освен ако не е уговорено друго.</>,
      <>Ако ПРОДАВАЧЪТ откаже да сключи сделката, той дължи на КУПУВАЧА върнатото капаро в двоен размер. Ако КУПУВАЧЪТ откаже да сключи сделката, той губи платеното капаро.</>,
    ];
    signBlock = <><SignBox title="ПРОДАВАЧ" name={a.name} /><SignBox title="КУПУВАЧ" name={b.name} /></>;
  } else if (c.type === "RENT") {
    partiesBlock = (
      <>
        <p>1. <PartyText p={a} />, наричан по-долу <b>НАЕМОДАТЕЛ</b>, и</p>
        <p>2. <PartyText p={b} />, наричан по-долу <b>НАЕМАТЕЛ</b>,</p>
        <p>се споразумяха за следното:</p>
      </>
    );
    clauses = [
      <>НАЕМОДАТЕЛЯТ предоставя на НАЕМАТЕЛЯ за временно ползване следния имот: {propertyLine}.</>,
      <>Договорът се сключва за срок от <b>{c.termMonths ?? 12} месеца</b>, считано от {date}</>,
      <>Месечният наем е <b>{formatPrice(c.price)}</b> и се заплаща до 5-о число на текущия месец.</>,
      c.deposit ? <>НАЕМАТЕЛЯТ заплаща депозит в размер на <b>{formatPrice(c.deposit)}</b>, който се връща при прекратяване на договора, след приспадане на евентуални задължения и щети.</> : <>Страните не уговарят депозит.</>,
      <>Консумативите (ток, вода, топлинна енергия, интернет) са за сметка на НАЕМАТЕЛЯ, освен ако не е уговорено друго.</>,
      <>НАЕМАТЕЛЯТ се задължава да ползва имота с грижата на добър стопанин и да не го преотдава без писмено съгласие на НАЕМОДАТЕЛЯ. Договорът може да бъде прекратен с едномесечно писмено предизвестие.</>,
    ];
    signBlock = <><SignBox title="НАЕМОДАТЕЛ" name={a.name} /><SignBox title="НАЕМАТЕЛ" name={b.name} /></>;
  } else {
    partiesBlock = (
      <>
        <p>1. <PartyText p={a} />, наричан по-долу <b>ВЪЗЛОЖИТЕЛ</b>, и</p>
        <p>2. <b>{settings.companyName}</b>, с адрес {settings.addressBg}, тел. {settings.phone}, имейл {settings.email}, наричана по-долу <b>ПОСРЕДНИК</b>,</p>
        <p>се споразумяха за следното:</p>
      </>
    );
    clauses = [
      <>ВЪЗЛОЖИТЕЛЯТ възлага, а ПОСРЕДНИКЪТ се задължава да търси купувач/наемател и да съдейства при {p.dealType === "RENT" ? "отдаването под наем" : "продажбата"} на следния имот: {propertyLine}.</>,
      <>Обявената цена на имота е <b>{formatPrice(c.price)}</b>{p.dealType === "RENT" ? " месечно" : ""}.</>,
      <>За услугата ПОСРЕДНИКЪТ получава комисиона в размер на <b>{c.commissionPct ?? settings.defaultCommissionPct}%</b> от цената на сделката, или {formatPrice(Math.round((c.price * (c.commissionPct ?? settings.defaultCommissionPct)) / 100))} при обявената цена, дължима при подписване на предварителен договор или нотариален акт.</>,
      <>ПОСРЕДНИКЪТ има право да рекламира имота и да организира огледи. ВЪЗЛОЖИТЕЛЯТ се задължава да не води преговори по сделката през срока на договора, заобикаляйки ПОСРЕДНИКА.</>,
      <>Договорът е със срок от ……………………… месеца и важи от {date}.</>,
    ];
    signBlock = <><SignBox title="ВЪЗЛОЖИТЕЛ" name={a.name} /><SignBox title="ПОСРЕДНИК" name={settings.companyName} /></>;
  }

  if (c.notes) clauses.push(<>Допълнителни уговорки: {c.notes}</>);
  clauses.push(<>Договорът е съставен в два еднообразни екземпляра — по един за всяка от страните.</>);

  return (
    <div className="contract-doc">
      <style>{`
        body { background: #fff; }
        .contract-doc { max-width: 780px; margin: 0 auto; padding: 32px 24px 80px; font-family: "Times New Roman", serif; font-size: 15px; line-height: 1.55; color: #000; }
        .contract-doc h1 { text-align: center; font-size: 22px; margin: 0 0 4px; }
        .contract-doc .sub { text-align: center; margin-bottom: 24px; }
        .contract-doc p { margin: 8px 0; }
        .contract-doc ol { padding-left: 22px; }
        .contract-doc li { margin-bottom: 8px; text-align: justify; }
        .contract-bar { max-width: 780px; margin: 0 auto; padding: 16px 24px 0; font-family: sans-serif; }
        @media print { .contract-bar { display: none; } .contract-doc { padding: 0; } }
      `}</style>
      <div className="contract-bar"><PrintButton /></div>
      <h1>{label(CONTRACT_TYPES, c.type).toUpperCase()}</h1>
      <div className="sub">№ {c.number} / {date}, гр. Пловдив</div>
      <p>Днес, {date}, в гр. Пловдив, между:</p>
      {partiesBlock}
      <ol>
        {clauses.map((cl, i) => <li key={i}>{cl}</li>)}
      </ol>
      <div style={{ display: "flex", gap: 48, marginTop: 40 }}>{signBlock}</div>
      {c.agent && <p style={{ marginTop: 32, fontSize: 12, color: "#555" }}>Съставил: {c.agent.name}, {settings.companyName}</p>}
    </div>
  );
}

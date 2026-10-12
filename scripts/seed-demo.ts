/**
 * Fills the database with realistic (fictional) demo data for presentations:
 * agents, clients with contract details, inquiries, viewings, deals and contracts.
 *
 *   npm run seed:demo          # (re)creates the demo data
 *   npm run seed:demo -- --clear   # removes the demo data again
 *
 * Everything it creates is marked with an @demo.nextimo.bg e-mail, so it can be re-run
 * safely and removed without touching real data. Run `npm run import:imot` first so there are listings.
 */
import "./env";
import { PrismaClient, type DealStatus, type DealType, type InquiryKind, type InquiryStatus, type ClientType, type ContractType, type ContractStatus, type ViewingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DOMAIN = "@demo.nextimo.bg";
const CLEAR = process.argv.includes("--clear");

const DAY = 86400000;
const now = new Date();
const daysAgo = (n: number, hour = 11) => { const d = new Date(now.getTime() - n * DAY); d.setHours(hour, 0, 0, 0); return d; };
const inDays = (n: number, hour: number, min = 0) => { const d = new Date(now.getTime() + n * DAY); d.setHours(hour, min, 0, 0); return d; };

async function clearDemo() {
  const clients = await db.client.findMany({ where: { email: { endsWith: DOMAIN } }, select: { id: true } });
  const ids = clients.map((c) => c.id);
  const deals = await db.deal.findMany({ where: { clientId: { in: ids } }, select: { propertyId: true } });
  await db.contract.deleteMany({ where: { number: { startsWith: "ДЕМО-" } } });
  await db.deal.deleteMany({ where: { clientId: { in: ids } } });
  await db.viewing.deleteMany({ where: { clientId: { in: ids } } });
  await db.inquiry.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await db.property.updateMany({ where: { id: { in: deals.map((d) => d.propertyId) } }, data: { status: "ACTIVE" } });
  await db.property.updateMany({ where: { ownerId: { in: ids } }, data: { ownerId: null } });
  await db.client.deleteMany({ where: { id: { in: ids } } });
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
}

const CLIENTS: {
  key: string; name: string; type: ClientType; phone: string; egn: string; idCard: string; address: string;
  source: string; budgetMin?: number; budgetMax?: number; districts?: string[]; wanted?: string[]; summary?: string;
}[] = [
  { key: "ivan", name: "Иван Георгиев Петров", type: "BUYER", phone: "0888 410 201", egn: "8203154512", idCard: "645123987, МВР Пловдив, 12.03.2021", address: "гр. Пловдив, ул. „Княз Александър I“ 14", source: "Сайт", budgetMin: 90000, budgetMax: 150000, districts: ["Тракия", "Кършияка"], wanted: ["TWO_BED", "THREE_BED"], summary: "Семейство с дете, търсят тристаен до 150 000 €, предпочитат асансьор и паркомясто." },
  { key: "elena", name: "Елена Стоянова Колева", type: "BUYER", phone: "0877 320 118", egn: "9007236618", idCard: "652004411, МВР Пловдив, 04.09.2022", address: "гр. Пловдив, бул. „Марица“ 87", source: "imot.bg", budgetMin: 55000, budgetMax: 80000, districts: ["Изгрев", "Гагарин"], wanted: ["STUDIO", "ONE_BED"], summary: "Първо жилище, ипотечен кредит одобрен до 80 000 €." },
  { key: "dimitar", name: "Димитър Николов Атанасов", type: "BUYER", phone: "0899 554 760", egn: "7611085544", idCard: "638220019, МВР София, 20.01.2020", address: "гр. София, ж.к. Лозенец, ул. „Хайдушка поляна“ 3", source: "Препоръка", budgetMin: 250000, budgetMax: 350000, districts: ["Христо Смирненски", "Център"], wanted: ["MULTI_BED", "MAISONETTE"], summary: "Инвестиция и собствено ползване, плащане в брой." },
  { key: "svetla", name: "Светла Христова Маринова", type: "TENANT", phone: "0878 112 903", egn: "9503127730", idCard: "660781234, МВР Пловдив, 15.06.2023", address: "гр. Асеновград, ул. „Цар Иван Асен II“ 22", source: "Facebook", budgetMin: 400, budgetMax: 650, districts: ["Мараша", "Център"], wanted: ["ONE_BED"], summary: "Работи в IT компания в центъра, търси обзаведено, може да започне веднага." },
  { key: "plamen", name: "Пламен Василев Йорданов", type: "TENANT", phone: "0886 701 245", egn: "8809196612", idCard: "649555320, МВР Пловдив, 08.11.2021", address: "гр. Пловдив, ж.к. Тракия, бл. 214, вх. Б", source: "Сайт", budgetMin: 500, budgetMax: 750, districts: ["Остромила", "Тракия"], wanted: ["TWO_BED"], summary: "Търси тристаен под наем за 12 месеца, има домашен любимец." },
  { key: "maria_owner", name: "Мария Иванова Тодорова", type: "OWNER", phone: "0889 330 417", egn: "6805217745", idCard: "611904456, МВР Пловдив, 02.02.2019", address: "гр. Пловдив, ул. „Райко Даскалов“ 41", source: "Обаждане", summary: "Продава наследствен апартамент, желае бърза сделка." },
  { key: "krasimir_owner", name: "Красимир Петров Донев", type: "OWNER", phone: "0898 641 280", egn: "7204158899", idCard: "624017733, МВР Пловдив, 19.07.2020", address: "с. Марково, ул. „Родопи“ 5", source: "Препоръка", summary: "Притежава къщи и парцели в Марково, готов да сключи договор за посредничество." },
  { key: "stefka_landlord", name: "Стефка Александрова Кирилова", type: "LANDLORD", phone: "0877 905 662", egn: "6309302211", idCard: "605118890, МВР Пловдив, 11.04.2018", address: "гр. Пловдив, ул. „Васил Априлов“ 9", source: "Офис", summary: "Отдава два апартамента под наем, иска коректни наематели." },
  { key: "georgi", name: "Георги Ангелов Вълчев", type: "BUYER", phone: "0887 018 339", egn: "8512044466", idCard: "655300811, МВР Пловдив, 29.05.2022", address: "гр. Пловдив, ул. „Богомил“ 18", source: "Instagram", budgetMin: 150000, budgetMax: 220000, districts: ["Каменица 2", "Остромила"], wanted: ["THREE_BED"], summary: "Огледа два имота, чака обратна връзка от банката." },
  { key: "nikolina", name: "Николина Борисова Динева", type: "BUYER", phone: "0879 233 670", egn: "9201035577", idCard: "661240098, МВР Пловдив, 10.08.2023", address: "гр. Пловдив, ул. „Цар Борис III Обединител“ 60", source: "Сайт", budgetMin: 60000, budgetMax: 120000, districts: ["Тракия"], wanted: ["ONE_BED", "TWO_BED"], summary: "" },
  { key: "firma", name: "Ем Ти Груп ЕООД, представлявано от Тодор Маринов", type: "BUYER", phone: "0884 450 100", egn: "203456789", idCard: "Управител: Тодор Маринов, ЕГН 7101123344", address: "гр. Пловдив, бул. „Копривщица“ 31", source: "Препоръка", budgetMin: 30000, budgetMax: 120000, districts: ["Пловдивска област"], wanted: ["LAND"], summary: "Търси парцели за строителство на жилищна сграда." },
  { key: "anna", name: "Анна Любенова Пенева", type: "TENANT", phone: "0897 612 881", egn: "9708220033", idCard: "662771205, МВР Пловдив, 22.10.2023", address: "гр. Карлово, ул. „Васил Левски“ 11", source: "Facebook", budgetMin: 350, budgetMax: 500, districts: ["Център", "Капана"], wanted: ["STUDIO", "ONE_BED"], summary: "Студентка, търси гарсониера близо до университета." },
];

async function main() {
  await clearDemo();
  if (CLEAR) { console.log("Demo data removed."); return; }

  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("No admin user — run `npm run db:seed` first.");

  // ---- agents ----
  const pass = await bcrypt.hash("Demo123!", 10);
  const maria = await db.user.create({ data: { email: `maria.petrova${DOMAIN}`, name: "Мария Петрова", phone: "0899 100 201", role: "AGENT", passwordHash: pass, showOnSite: true, bioBg: "Брокер с 8 години опит в жилищни имоти в Пловдив. Специалист по Тракия и Кършияка.", bioEn: "Real estate agent with 8 years of experience in Plovdiv residential property." } });
  const georgi = await db.user.create({ data: { email: `georgi.dimitrov${DOMAIN}`, name: "Георги Димитров", phone: "0899 100 202", role: "AGENT", passwordHash: pass, showOnSite: true, bioBg: "Консултант по инвестиционни имоти, къщи и парцели в област Пловдив.", bioEn: "Consultant for investment properties, houses and land in the Plovdiv region." } });
  const agents = [admin, maria, georgi];

  // ---- properties: assign agents, featured, views ----
  const all = await db.property.findMany({ where: { status: "ACTIVE" }, include: { images: { select: { id: true }, take: 1 } }, orderBy: { refNo: "asc" } });
  if (all.length < 12) throw new Error("Not enough listings — run `npm run import:imot` first.");
  for (const [i, p] of all.entries()) {
    await db.property.update({ where: { id: p.id }, data: { agentId: agents[i % 3].id, views: 15 + ((i * 37) % 380) } });
  }
  const withPhotos = all.filter((p) => p.images.length > 0);
  const pool = withPhotos.length >= 12 ? withPhotos : all;
  const sale = pool.filter((p) => p.dealType === "SALE" && p.type !== "LAND");
  const rent = pool.filter((p) => p.dealType === "RENT");
  const land = all.filter((p) => p.type === "LAND");
  const houses = all.filter((p) => p.type === "HOUSE");
  await db.property.updateMany({ where: { id: { in: sale.slice(0, 6).map((p) => p.id) } }, data: { featured: true } });

  // ---- clients ----
  const c: Record<string, string> = {};
  for (const [i, x] of CLIENTS.entries()) {
    const row = await db.client.create({
      data: {
        name: x.name, type: x.type, phone: x.phone, email: `${x.key}${DOMAIN}`, egn: x.egn, idCard: x.idCard, address: x.address,
        source: x.source, budgetMin: x.budgetMin ?? null, budgetMax: x.budgetMax ?? null, preferredDistricts: x.districts ?? [],
        wantedTypes: x.wanted ?? [], notesSummary: x.summary || null, agentId: agents[i % 3].id,
        createdAt: daysAgo(40 - i * 3),
      },
    });
    c[x.key] = row.id;
  }

  // owners of listings
  const owners: [string, (typeof all)[number] | undefined][] = [
    ["maria_owner", sale[2]], ["krasimir_owner", houses[0]], ["krasimir_owner", land[0]], ["stefka_landlord", rent[0]], ["stefka_landlord", rent[1]],
  ];
  for (const [k, p] of owners) if (p) await db.property.update({ where: { id: p.id }, data: { ownerId: c[k] } });

  // ---- notes ----
  const notes: [string, string, number][] = [
    ["ivan", "Първи разговор: търсят тристаен в Тракия, важно им е да има асансьор и паркомясто. Бюджет до 150 000 €.", 9],
    ["ivan", "Огледа два имота. Хареса втория, мисли за оферта. Следващ контакт в петък.", 3],
    ["elena", "Одобрение за кредит от банка до 80 000 €. Търси гарсониера или двустаен, готова да купува до месец.", 12],
    ["dimitar", "Интересува се от мезонет с терасa. Предпочита да огледа в събота сутрин.", 6],
    ["svetla", "Може да се нанесе от 1-во число на следващия месец. Желае обзаведен двустаен.", 5],
    ["maria_owner", "Собственикът желае 140 000 €, но е склонна на преговори до 132 000 €. Ключове има в офиса.", 18],
    ["georgi", "Банката иска оценка на имота. Изпратихме документите за собственост.", 2],
    ["krasimir_owner", "Подписахме договор за посредничество за къщата и парцела. Ще снимаме в четвъртък.", 15],
  ];
  for (const [k, text, ago] of notes) await db.clientNote.create({ data: { clientId: c[k], authorId: admin.id, text, createdAt: daysAgo(ago, 14) } });

  // ---- inquiries ----
  const inq: { name: string; kind: InquiryKind; status: InquiryStatus; ago: number; msg: string; key?: string; prop?: (typeof all)[number]; hour?: number }[] = [
    { name: "Петя Георгиева", kind: "PROPERTY", status: "NEW", ago: 0, hour: 9, msg: "Здравейте, актуална ли е още обявата? Може ли да уговорим оглед в края на седмицата?", prop: sale[0] },
    { name: "Мартин Колев", kind: "VIEWING", status: "NEW", ago: 0, hour: 8, msg: "Бих искал да огледам имота в събота преди обяд.", prop: sale[1] },
    { name: "Теодора Ненова", kind: "SELL", status: "NEW", ago: 1, hour: 17, msg: "[sell] Искам да продам двустаен апартамент в Кършияка, 70 кв.м., 4-ти етаж. Може ли безплатна оценка?" },
    { name: "Иван Георгиев Петров", kind: "PROPERTY", status: "VIEWING", ago: 6, msg: "Интересува ме имотът. Каква е най-ниската цена?", key: "ivan", prop: sale[3] },
    { name: "Светла Христова Маринова", kind: "PROPERTY", status: "NEGOTIATION", ago: 8, msg: "Добър ден, може ли да се уговорим за оглед на наема?", key: "svetla", prop: rent[2] ?? rent[0] },
    { name: "Борис Тончев", kind: "VALUATION", status: "CONTACTED", ago: 3, msg: "Искам оценка на къща в Първенец, за продажба през пролетта." },
    { name: "Силвия Райкова", kind: "GENERAL", status: "CONTACTED", ago: 4, msg: "Работите ли с имоти в Асеновград? Търся двустаен до 70 000 €." },
    { name: "Калоян Митев", kind: "PROPERTY", status: "LOST", ago: 20, msg: "Благодаря, купихме друг имот." , prop: sale[4] },
    { name: "Анна Любенова Пенева", kind: "PROPERTY", status: "VIEWING", ago: 5, msg: "Обявата за гарсониерата още ли е свободна?", key: "anna", prop: rent[0] },
    { name: "Ивайло Стефанов", kind: "SELL", status: "WON", ago: 25, msg: "[rent] Искам да отдам апартамент в Тракия под наем." },
  ];
  for (const q of inq) {
    await db.inquiry.create({
      data: {
        name: q.name, kind: q.kind, status: q.status, message: q.msg, lang: "bg",
        phone: `088${String(7000000 + Math.floor(Math.random() * 999999)).slice(0, 7)}`.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3"),
        email: q.key ? `${q.key}${DOMAIN}` : `${q.name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "") || "client"}${Math.floor(Math.random() * 90 + 10)}${DOMAIN}`,
        propertyId: q.prop?.id ?? null, clientId: q.key ? c[q.key] : null, agentId: q.status === "NEW" ? null : agents[1 + (q.ago % 2)].id,
        createdAt: daysAgo(q.ago, q.hour ?? 12),
      },
    });
  }

  // ---- viewings ----
  const V: { key: string; prop?: (typeof all)[number]; start: Date; status: ViewingStatus; fb?: string }[] = [
    { key: "ivan", prop: sale[3], start: inDays(1, 10), status: "SCHEDULED" },
    { key: "elena", prop: sale[5], start: inDays(1, 15, 30), status: "SCHEDULED" },
    { key: "dimitar", prop: sale[6], start: inDays(2, 11), status: "SCHEDULED" },
    { key: "georgi", prop: sale[7], start: inDays(3, 17), status: "SCHEDULED" },
    { key: "svetla", prop: rent[0], start: inDays(2, 13), status: "SCHEDULED" },
    { key: "anna", prop: rent[1] ?? rent[0], start: inDays(4, 16), status: "SCHEDULED" },
    { key: "nikolina", prop: sale[8], start: inDays(5, 12), status: "SCHEDULED" },
    { key: "plamen", prop: rent[2] ?? rent[0], start: inDays(6, 18), status: "SCHEDULED" },
    { key: "ivan", prop: sale[9], start: daysAgo(4, 11), status: "DONE", fb: "Хареса разпределението, но иска по-ниска цена. Ще мисли." },
    { key: "georgi", prop: sale[10], start: daysAgo(7, 16), status: "DONE", fb: "Харесва локацията. Чака оценка от банката." },
    { key: "elena", prop: sale[11], start: daysAgo(9, 10), status: "DONE", fb: "Прекалено малък за нея, търси с по-голяма кухня." },
    { key: "dimitar", prop: sale[12] ?? sale[0], start: daysAgo(11, 14), status: "NO_SHOW", fb: "Не се яви, не вдига телефона." },
    { key: "svetla", prop: rent[1] ?? rent[0], start: daysAgo(3, 17), status: "CANCELLED", fb: "Отложен, клиентката е извън града." },
  ];
  for (const [i, v] of V.entries()) {
    if (!v.prop) continue;
    await db.viewing.create({ data: { propertyId: v.prop.id, clientId: c[v.key], agentId: agents[i % 3].id, startsAt: v.start, durationMin: 30, status: v.status, feedback: v.fb ?? null } });
  }

  // ---- deals (also drives property statuses) ----
  type D = { key: string; prop?: (typeof all)[number]; type: DealType; status: DealStatus; price?: number; pct: number; deposit?: number; closedDaysAgo?: number; notes?: string; agent: number };
  const closedMonthsAgo = (m: number) => { const d = new Date(now.getFullYear(), now.getMonth() - m, 12 + m, 12); return Math.max(1, Math.round((now.getTime() - d.getTime()) / DAY)); };
  const DEALS: D[] = [
    { key: "ivan", prop: sale[3], type: "SALE", status: "DEPOSIT", pct: 3, deposit: 5000, notes: "Капаро 5 000 €, нотариален акт до края на месеца.", agent: 1 },
    { key: "georgi", prop: sale[10], type: "SALE", status: "PENDING", pct: 3, notes: "Чакаме решение на банката за кредита.", agent: 2 },
    { key: "dimitar", prop: sale[6], type: "SALE", status: "CLOSED", pct: 2.5, closedDaysAgo: 6, agent: 0 },
    { key: "elena", prop: sale[13] ?? sale[1], type: "SALE", status: "CLOSED", pct: 3, closedDaysAgo: closedMonthsAgo(1), agent: 1 },
    { key: "nikolina", prop: sale[14] ?? sale[2], type: "SALE", status: "CLOSED", pct: 3, closedDaysAgo: closedMonthsAgo(2), agent: 2 },
    { key: "firma", prop: land[1], type: "SALE", status: "CLOSED", pct: 3, closedDaysAgo: closedMonthsAgo(3), agent: 0 },
    { key: "plamen", prop: rent[2] ?? rent[0], type: "RENT", status: "CLOSED", price: undefined, pct: 100, closedDaysAgo: closedMonthsAgo(1) + 4, agent: 1 },
    { key: "anna", prop: rent[3] ?? rent[1], type: "RENT", status: "DEPOSIT", pct: 100, deposit: 400, agent: 1 },
    { key: "svetla", prop: sale[15] ?? sale[4], type: "SALE", status: "CANCELLED", pct: 3, notes: "Клиентът се отказа заради условията на банката.", agent: 2 },
  ];
  const usedProps = new Set<string>();
  for (const d of DEALS) {
    if (!d.prop || usedProps.has(d.prop.id)) continue;
    usedProps.add(d.prop.id);
    const price = d.price ?? d.prop.price;
    const commissionAmount = Math.round((price * d.pct) / 100);
    const closedAt = d.status === "CLOSED" ? daysAgo(d.closedDaysAgo ?? 5, 12) : null;
    await db.deal.create({
      data: {
        type: d.type, status: d.status, propertyId: d.prop.id, clientId: c[d.key], agentId: agents[d.agent].id,
        price, commissionPct: d.pct, commissionAmount, agentSharePct: 50, depositAmount: d.deposit ?? null, closedAt, notes: d.notes ?? null,
        createdAt: daysAgo((d.closedDaysAgo ?? 10) + 14),
      },
    });
    if (d.status === "CLOSED") await db.property.update({ where: { id: d.prop.id }, data: { status: d.type === "RENT" ? "RENTED" : "SOLD" } });
    if (d.status === "DEPOSIT") await db.property.update({ where: { id: d.prop.id }, data: { status: "RESERVED" } });
  }

  // ---- contracts ----
  const party = (key: string) => {
    const x = CLIENTS.find((k) => k.key === key)!;
    return { clientId: c[key], name: x.name, egn: x.egn, idCard: x.idCard, address: x.address, phone: x.phone, email: `${key}${DOMAIN}` };
  };
  const CONTRACTS: { n: number; type: ContractType; status: ContractStatus; a: string; b?: string; prop?: (typeof all)[number]; deposit?: number; term?: number; pct?: number; ago: number }[] = [
    { n: 1, type: "PRELIMINARY_SALE", status: "SIGNED", a: "maria_owner", b: "ivan", prop: sale[3], deposit: 5000, ago: 5 },
    { n: 2, type: "RENT", status: "SIGNED", a: "stefka_landlord", b: "plamen", prop: rent[2] ?? rent[0], deposit: 600, term: 12, ago: 18 },
    { n: 3, type: "BROKERAGE", status: "SIGNED", a: "krasimir_owner", prop: houses[0], pct: 3, ago: 15 },
    { n: 4, type: "RENT", status: "DRAFT", a: "stefka_landlord", b: "anna", prop: rent[3] ?? rent[1], deposit: 400, term: 12, ago: 1 },
  ];
  for (const k of CONTRACTS) {
    if (!k.prop) continue;
    await db.contract.create({
      data: {
        number: `ДЕМО-${new Date().getFullYear()}-${String(k.n).padStart(3, "0")}`, type: k.type, status: k.status, propertyId: k.prop.id,
        partyA: party(k.a), partyB: k.b ? party(k.b) : { clientId: "", name: "", egn: "", idCard: "", address: "", phone: "", email: "" },
        price: k.prop.price, deposit: k.deposit ?? null, commissionPct: k.pct ?? null, termMonths: k.term ?? null,
        signedAt: k.status === "SIGNED" ? daysAgo(k.ago, 12) : null, agentId: agents[k.n % 3].id, createdAt: daysAgo(k.ago + 1, 10),
      },
    });
  }

  const [nClients, nInq, nView, nDeal, nCon] = await Promise.all([
    db.client.count({ where: { email: { endsWith: DOMAIN } } }), db.inquiry.count({ where: { email: { endsWith: DOMAIN } } }),
    db.viewing.count({ where: { client: { email: { endsWith: DOMAIN } } } }), db.deal.count({ where: { client: { email: { endsWith: DOMAIN } } } }),
    db.contract.count({ where: { number: { startsWith: "ДЕМО-" } } }),
  ]);
  console.log(`Demo data ready: 2 agents, ${nClients} clients, ${nInq} inquiries, ${nView} viewings, ${nDeal} deals, ${nCon} contracts.`);
  console.log("Demo agents log in with Demo123!  (maria.petrova / georgi.dimitrov @demo.nextimo.bg)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

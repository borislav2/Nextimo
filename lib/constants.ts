// Labels for database enums and fixed option lists (BG/EN)

type L = { bg: string; en: string };
export type Lang = "bg" | "en";

export const PROPERTY_TYPES: Record<string, L> = {
  STUDIO: { bg: "Едностаен", en: "Studio" },
  ONE_BED: { bg: "Двустаен", en: "1-bedroom" },
  TWO_BED: { bg: "Тристаен", en: "2-bedroom" },
  THREE_BED: { bg: "Четиристаен", en: "3-bedroom" },
  MULTI_BED: { bg: "Многостаен", en: "Multi-bedroom" },
  MAISONETTE: { bg: "Мезонет", en: "Maisonette" },
  HOUSE: { bg: "Къща", en: "House" },
  OFFICE: { bg: "Офис", en: "Office" },
  SHOP: { bg: "Магазин", en: "Shop" },
  LAND: { bg: "Парцел", en: "Land plot" },
  GARAGE: { bg: "Гараж", en: "Garage" },
  BUSINESS: { bg: "Бизнес имот", en: "Commercial property" },
};

export const DEAL_TYPES: Record<string, L> = {
  SALE: { bg: "Продажба", en: "For sale" },
  RENT: { bg: "Наем", en: "For rent" },
};

export const PROPERTY_STATUS: Record<string, L> = {
  DRAFT: { bg: "Чернова", en: "Draft" },
  ACTIVE: { bg: "Активна", en: "Active" },
  RESERVED: { bg: "Резервирана", en: "Reserved" },
  SOLD: { bg: "Продадена", en: "Sold" },
  RENTED: { bg: "Отдадена", en: "Rented" },
  ARCHIVED: { bg: "Архив", en: "Archived" },
};

export const FURNISHING: Record<string, L> = {
  UNFURNISHED: { bg: "Необзаведен", en: "Unfurnished" },
  PARTIAL: { bg: "Частично обзаведен", en: "Partly furnished" },
  FURNISHED: { bg: "Обзаведен", en: "Furnished" },
};

export const CLIENT_TYPES: Record<string, L> = {
  BUYER: { bg: "Купувач", en: "Buyer" },
  TENANT: { bg: "Наемател", en: "Tenant" },
  OWNER: { bg: "Собственик (продава)", en: "Owner (selling)" },
  LANDLORD: { bg: "Наемодател", en: "Landlord" },
};

export const INQUIRY_KINDS: Record<string, L> = {
  PROPERTY: { bg: "Запитване за имот", en: "Property inquiry" },
  VIEWING: { bg: "Заявка за оглед", en: "Viewing request" },
  SELL: { bg: "Иска да продаде/отдаде", en: "Wants to sell/let" },
  VALUATION: { bg: "Оценка на имот", en: "Valuation" },
  GENERAL: { bg: "Общо", en: "General" },
};

export const INQUIRY_STATUS: Record<string, L> = {
  NEW: { bg: "Ново", en: "New" },
  CONTACTED: { bg: "Свързахме се", en: "Contacted" },
  VIEWING: { bg: "Оглед", en: "Viewing" },
  NEGOTIATION: { bg: "Преговори", en: "Negotiation" },
  WON: { bg: "Сделка", en: "Won" },
  LOST: { bg: "Загубено", en: "Lost" },
};

export const VIEWING_STATUS: Record<string, L> = {
  SCHEDULED: { bg: "Насрочен", en: "Scheduled" },
  DONE: { bg: "Проведен", en: "Done" },
  CANCELLED: { bg: "Отменен", en: "Cancelled" },
  NO_SHOW: { bg: "Не се яви", en: "No-show" },
};

export const DEAL_STATUS: Record<string, L> = {
  PENDING: { bg: "В процес", en: "Pending" },
  DEPOSIT: { bg: "Капаро", en: "Deposit paid" },
  CLOSED: { bg: "Приключена", en: "Closed" },
  CANCELLED: { bg: "Отказана", en: "Cancelled" },
};

export const CONTRACT_TYPES: Record<string, L> = {
  PRELIMINARY_SALE: { bg: "Предварителен договор за продажба", en: "Preliminary sale agreement" },
  RENT: { bg: "Договор за наем", en: "Rental agreement" },
  BROKERAGE: { bg: "Договор за посредничество", en: "Brokerage agreement" },
};

export const CONTRACT_STATUS: Record<string, L> = {
  DRAFT: { bg: "Чернова", en: "Draft" },
  SIGNED: { bg: "Подписан", en: "Signed" },
  CANCELLED: { bg: "Анулиран", en: "Cancelled" },
};

export const PLOVDIV_DISTRICTS = [
  "Център", "Старият град", "Капана", "Кършияка", "Тракия", "Смирненски", "Каменица 1", "Каменица 2",
  "Кючук Париж", "Младежки хълм", "Мараша", "Остромила", "Беломорски", "Западен", "Южен", "Гагарин",
  "Коматево", "Прослав", "Съдийски", "Захарна фабрика", "Изгрев", "Въстанически", "Гребна база",
  "Хипподрума", "Христо Смирненски", "Отдих и култура", "Коматевско шосе", "Пловдивска област", "Друг",
];

export const CONSTRUCTION = ["Тухла", "Панел", "ЕПК", "ПК", "Гредоред"];
export const HEATING = ["ТЕЦ", "Газ", "Климатици", "Ток", "Термопомпа", "Локално (камина/печка)"];

export const FEATURES: Record<string, L> = {
  balcony: { bg: "Балкон / тераса", en: "Balcony / terrace" },
  parking: { bg: "Паркомясто", en: "Parking space" },
  garage: { bg: "Гараж", en: "Garage" },
  elevator: { bg: "Асансьор", en: "Elevator" },
  ac: { bg: "Климатик", en: "Air conditioning" },
  storage: { bg: "Мазе / таван", en: "Storage / basement" },
  newBuild: { bg: "Ново строителство", en: "New build" },
  act16: { bg: "Акт 16", en: "Act 16 (completed)" },
  security: { bg: "Видеонаблюдение / охрана", en: "Security" },
  view: { bg: "Гледка", en: "View" },
  pets: { bg: "Подходящ за домашни любимци", en: "Pet friendly" },
  furnitureNew: { bg: "Нови мебели", en: "New furniture" },
};

export function label(map: Record<string, L>, key: string | null | undefined, lang: Lang = "bg") {
  if (!key) return "";
  return map[key]?.[lang] ?? key;
}

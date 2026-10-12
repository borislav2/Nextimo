import "../scripts/env";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@nextimo.bg";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const admin = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Администратор",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 10),
      showOnSite: false,
    },
  });

  await db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      phone: "089 916 3240",
      email: "office@nextimo.bg",
      addressBg: "бул. Дунав 68, Пловдив 4000",
      addressEn: "68 Dunav Blvd, Plovdiv 4000, Bulgaria",
      facebook: "https://www.facebook.com/share/1Dszx1FPFo/",
    },
  });

  // Demo listings so the site isn't empty on first run. Delete them from the admin panel.
  const count = await db.property.count();
  if (count === 0) {
    const demo = [
      {
        slug: "dvustaen-tsentar-demo", refNo: "NX-1001", titleBg: "Луксозен двустаен апартамент в Център",
        titleEn: "Luxury 1-bedroom apartment in the centre", dealType: "SALE" as const, type: "ONE_BED" as const,
        price: 128000, area: 68, rooms: 2, bathrooms: 1, floor: 4, totalFloors: 7, yearBuilt: 2022,
        construction: "Тухла", heating: "Климатици", furnishing: "FURNISHED" as const, district: "Център",
        features: ["balcony", "elevator", "ac", "newBuild", "act16"], featured: true,
      },
      {
        slug: "tristaen-karshiyaka-demo", refNo: "NX-1002", titleBg: "Тристаен с гледка в Кършияка",
        titleEn: "2-bedroom with a view in Karshiyaka", dealType: "SALE" as const, type: "TWO_BED" as const,
        price: 165000, area: 95, rooms: 3, bathrooms: 2, floor: 6, totalFloors: 8, yearBuilt: 2021,
        construction: "Тухла", heating: "Термопомпа", furnishing: "PARTIAL" as const, district: "Кършияка",
        features: ["balcony", "parking", "elevator", "view"], featured: true,
      },
      {
        slug: "dvustaen-naem-trakiya-demo", refNo: "NX-1003", titleBg: "Обзаведен двустаен под наем в Тракия",
        titleEn: "Furnished 1-bedroom for rent in Trakia", dealType: "RENT" as const, type: "ONE_BED" as const,
        price: 550, area: 62, rooms: 2, bathrooms: 1, floor: 3, totalFloors: 8, yearBuilt: 1985,
        construction: "Панел", heating: "ТЕЦ", furnishing: "FURNISHED" as const, district: "Тракия",
        features: ["balcony", "ac", "furnitureNew"], featured: false,
      },
    ];
    for (const p of demo) {
      await db.property.create({
        data: {
          ...p,
          status: "ACTIVE",
          descriptionBg: "Демо обява – заменете с истински имот от админ панела.",
          descriptionEn: "Demo listing – replace it with a real property from the admin panel.",
          agentId: admin.id,
        },
      });
    }
  }

  console.log(`Seed done. Admin login: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const tb = users.find((u) => u.email === "test@prosjekt.no")!;
  const kari = users.find((u) => u.email === "kari@prosjekt.no")!;
  const lars = users.find((u) => u.email === "lars@prosjekt.no")!;

  const projects = [
    {
      title: "Kundeportal v2",
      description: "Ny versjon av kundeportalen med forbedret brukeropplevelse og mobilstøtte.",
      status: "ACTIVE" as const,
      order: 2,
      memberIds: [tb.id, kari.id],
    },
    {
      title: "Årsregnskap 2025",
      description: "Ferdigstilling av årsregnskap og revisjonsklargjøring.",
      status: "COMPLETED" as const,
      order: 3,
      memberIds: [lars.id],
    },
    {
      title: "Internopplæring — ny ansatt",
      description: "Onboarding og opplæringsplan for nye teammedlemmer.",
      status: "PAUSED" as const,
      order: 4,
      memberIds: [kari.id, lars.id],
    },
    {
      title: "Servermigrering",
      description: "Flytte infrastruktur fra on-prem til sky. Planlagt nedetid: helg uke 28.",
      status: "ACTIVE" as const,
      order: 5,
      memberIds: [tb.id, lars.id],
    },
    {
      title: "Salgsstrategi Q3",
      description: "Utarbeide salgsstrategi og målsettinger for tredje kvartal.",
      status: "ACTIVE" as const,
      order: 6,
      memberIds: [kari.id],
    },
    {
      title: "GDPR-gjennomgang",
      description: "Gjennomgang av datahåndtering og oppdatering av personvernerklæring.",
      status: "PAUSED" as const,
      order: 7,
      memberIds: [tb.id, kari.id, lars.id],
    },
  ];

  for (const { memberIds, ...data } of projects) {
    await prisma.project.create({
      data: {
        ...data,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
    });
  }

  console.log(`Seeded ${projects.length} projects.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

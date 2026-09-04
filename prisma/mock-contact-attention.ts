import "dotenv/config";
import { ContactType, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const marker = "MOCK_ATTENTION_VAVIVE";

const demos = [
  {
    key: "em-dia",
    name: "[DEMO] Fernanda em dia",
    unitName: "Unidade teste · 03 dias",
    days: 3,
    attendedLives: 3,
  },
  {
    key: "atencao",
    name: "[DEMO] Marcos atenção",
    unitName: "Unidade teste · 15 dias",
    days: 15,
    attendedLives: 2,
  },
  {
    key: "critico",
    name: "[DEMO] Paula atenção máxima",
    unitName: "Unidade teste · 25 dias",
    days: 25,
    attendedLives: 1,
  },
  {
    key: "urgente",
    name: "[DEMO] Ricardo urgente",
    unitName: "Unidade teste · 35 dias",
    days: 35,
    attendedLives: 0,
  },
] as const;

const liveDates = [7, 18, 28] as const;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

async function ensureContact(
  franchiseeId: string,
  userId: string,
  type: ContactType,
  contactedAt: Date,
  notes: string,
) {
  const existing = await prisma.contact.findFirst({
    where: { franchiseeId, notes },
    select: { id: true },
  });
  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: { type, contactedAt, userId },
    });
  }
  return prisma.contact.create({
    data: { franchiseeId, userId, type, contactedAt, notes },
  });
}

async function main() {
  const host = await prisma.user.findFirst({
    where: {
      active: true,
      role: { in: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT] },
    },
    select: { id: true },
  });
  if (!host) {
    throw new Error(
      "Crie ou ative um usuário SUPERADMIN, ADMIN ou SUPPORT antes de inserir os mocks.",
    );
  }

  const franchisees = await Promise.all(
    demos.map(async (demo) => {
      const existing = await prisma.franchisee.findFirst({
        where: { name: demo.name, unitName: demo.unitName },
      });
      const franchisee =
        existing ??
        (await prisma.franchisee.create({
          data: {
            name: demo.name,
            unitName: demo.unitName,
            active: true,
            moment: "INAUGURADA",
          },
        }));

      await ensureContact(
        franchisee.id,
        host.id,
        ContactType.TELEFONE,
        daysAgo(demo.days),
        `${marker}:status:${demo.key}`,
      );
      return { ...demo, id: franchisee.id };
    }),
  );

  for (const [index, days] of liveDates.entries()) {
    const title = `[DEMO] Live de presença ${index + 1}`;
    const live =
      (await prisma.live.findFirst({
        where: { title, notes: marker },
      })) ??
      (await prisma.live.create({
        data: {
          title,
          notes: marker,
          scheduledAt: daysAgo(days),
          hostUserId: host.id,
          createdByUserId: host.id,
        },
      }));

    for (const franchisee of franchisees) {
      const attended = franchisee.attendedLives > index;
      const existing = await prisma.liveParticipant.findUnique({
        where: {
          liveId_franchiseeId: {
            liveId: live.id,
            franchiseeId: franchisee.id,
          },
        },
        select: { id: true, contactId: true },
      });

      if (attended) {
        const contact = await ensureContact(
          franchisee.id,
          host.id,
          ContactType.LIVE,
          daysAgo(days),
          `${marker}:live:${index + 1}:${franchisee.key}`,
        );
        if (existing) {
          await prisma.liveParticipant.update({
            where: { id: existing.id },
            data: { attended: true, contactId: contact.id },
          });
        } else {
          await prisma.liveParticipant.create({
            data: {
              liveId: live.id,
              franchiseeId: franchisee.id,
              attended: true,
              contactId: contact.id,
            },
          });
        }
      } else if (!existing) {
        await prisma.liveParticipant.create({
          data: {
            liveId: live.id,
            franchiseeId: franchisee.id,
            attended: false,
          },
        });
      } else if (existing.contactId) {
        await prisma.liveParticipant.update({
          where: { id: existing.id },
          data: { attended: false, contactId: null },
        });
      }
    }
  }

  console.log("Mocks de atenção criados/atualizados.");
  console.log(
    "3 dias: Em dia | 15 dias: Atenção | 25 dias: Atenção máxima | 35 dias: Urgente",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

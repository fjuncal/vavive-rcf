import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const franchisees: Array<{
  name: string;
  unitName: string;
  photoUrl: string;
  moment: "IMPLANTACAO" | "INAUGURADA";
  active: boolean;
}> = [
  { name: "João Silva", unitName: "Barra da Tijuca", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80", moment: "INAUGURADA", active: true },
  { name: "Maria Souza", unitName: "Niterói", photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80", moment: "IMPLANTACAO", active: true },
  { name: "Carlos Mendes", unitName: "Recreio", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80", moment: "INAUGURADA", active: true },
  { name: "Ana Paula", unitName: "São Paulo", photoUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=500&q=80", moment: "IMPLANTACAO", active: true },
  { name: "Rafael Costa", unitName: "Recife", photoUrl: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=80", moment: "INAUGURADA", active: true },
  { name: "Fernanda Lima", unitName: "Belo Horizonte", photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80", moment: "IMPLANTACAO", active: true },
  { name: "Paulo Rocha", unitName: "Curitiba", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80", moment: "INAUGURADA", active: true },
  { name: "Belinda Santos", unitName: "Brasília", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80", moment: "IMPLANTACAO", active: true },
  { name: "Thiago Alves", unitName: "Campinas", photoUrl: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=80", moment: "INAUGURADA", active: true },
  { name: "Larissa Nunes", unitName: "Porto Alegre", photoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80", moment: "IMPLANTACAO", active: true },
];

const contactTypes = ["WHATSAPP", "TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL"] as const;

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "admin@vavive.local";
  const adminPlainPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPlainPassword) {
    throw new Error("ADMIN_SEED_PASSWORD deve ser definido para executar o seed.");
  }
  const adminPassword = await bcrypt.hash(adminPlainPassword, 10);

  await prisma.contact.deleteMany();
  await prisma.franchisee.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Administrador VAVIVÊ",
      email: adminEmail,
      passwordHash: adminPassword,
      role: "SUPERADMIN",
      active: true,
    },
  });
  await prisma.user.create({ data: { name: "TV Operação", email: "tv@vavive.local", passwordHash: await bcrypt.hash(process.env.TV_SEED_PASSWORD ?? "VaviveTV@2026", 10), role: "TV", active: true } });

  const createdFranchisees = await Promise.all(
    franchisees.map((franchisee) =>
      prisma.franchisee.create({
        data: franchisee,
      }),
    ),
  );

  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  for (let i = 0; i < createdFranchisees.length; i += 1) {
    const franchisee = createdFranchisees[i];
    const monthBase = i % 2 === 0 ? 0 : 1;

    for (let j = 0; j < 6; j += 1) {
      const contactDate = new Date(today.getFullYear(), today.getMonth(), 2 + j + monthBase);
      const type = contactTypes[(i + j) % contactTypes.length];
      await prisma.contact.create({
        data: {
          franchiseeId: franchisee.id,
          userId: admin.id,
          type,
          contactedAt: contactDate,
          notes: `Contato ${type.toLowerCase()} no mês atual`,
        },
      });
    }

    for (let j = 0; j < 3; j += 1) {
      const prevDate = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 4 + j + i % 2);
      const type = contactTypes[(i + j + 1) % contactTypes.length];
      await prisma.contact.create({
        data: {
          franchiseeId: franchisee.id,
          userId: admin.id,
          type,
          contactedAt: prevDate,
          notes: `Contato ${type.toLowerCase()} no mês anterior`,
        },
      });
    }
  }

  console.log("Seed executado com sucesso.");
  console.log("Superadmin seed:", { email: adminEmail });
  console.log("TV seed: tv@vavive.local /", process.env.TV_SEED_PASSWORD ?? "VaviveTV@2026");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

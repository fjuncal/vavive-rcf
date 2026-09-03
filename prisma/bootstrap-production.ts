import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} deve ser definido para executar o bootstrap de produção.`);
  }
  return value;
}

async function main() {
  const adminEmail = requiredEnvironment("ADMIN_SEED_EMAIL");
  const adminPassword = requiredEnvironment("ADMIN_SEED_PASSWORD");
  const tvPassword = requiredEnvironment("TV_SEED_PASSWORD");

  const [adminPasswordHash, tvPasswordHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(tvPassword, 10),
  ]);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: "Administrador VAVIVÊ",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "SUPERADMIN",
      active: true,
    },
    update: {
      name: "Administrador VAVIVÊ",
      passwordHash: adminPasswordHash,
      role: "SUPERADMIN",
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "tv@vavive.local" },
    create: {
      name: "TV Suporte",
      email: "tv@vavive.local",
      passwordHash: tvPasswordHash,
      role: "TV",
      active: true,
    },
    update: {
      name: "TV Suporte",
      passwordHash: tvPasswordHash,
      role: "TV",
      active: true,
    },
  });

  console.log("Bootstrap de produção concluído: SUPERADMIN e TV estão prontos.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

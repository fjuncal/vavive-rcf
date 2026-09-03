import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() { const email = process.env.ADMIN_SEED_EMAIL ?? "admin@vavive.local"; await prisma.user.updateMany({ where: { email }, data: { role: "SUPERADMIN", active: true } }); console.log(`Conta ${email} promovida para SUPERADMIN.`); }
main().finally(async () => { await prisma.$disconnect(); });

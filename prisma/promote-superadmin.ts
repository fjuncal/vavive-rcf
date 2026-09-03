import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() { const email = process.env.ADMIN_SEED_EMAIL; if (!email) throw new Error("ADMIN_SEED_EMAIL deve ser definido."); await prisma.user.updateMany({ where: { email }, data: { role: "SUPERADMIN", active: true } }); console.log(`Conta ${email} promovida para SUPERADMIN.`); }
main().finally(async () => { await prisma.$disconnect(); });

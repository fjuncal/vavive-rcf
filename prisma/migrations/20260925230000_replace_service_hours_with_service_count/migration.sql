-- Corrige Atendimentos: passa a ser QUANTIDADE manual (INTEGER nullable),
-- não texto de horário. A coluna service_hours foi criada na migration
-- 20260925220000 e todos os registros estavam NULL (feature ainda fora de
-- produção), então ela é removida e substituída por service_count.
-- A migration 220000 é preservada intacta (histórico imutável): no deploy
-- futuro a produção executará 220000 e depois esta migration.
-- AlterTable
ALTER TABLE "franchisees" DROP COLUMN "service_hours";

-- AlterTable
ALTER TABLE "franchisees" ADD COLUMN "service_count" INTEGER;

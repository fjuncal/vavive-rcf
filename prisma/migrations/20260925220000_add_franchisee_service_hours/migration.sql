-- Atendimento da UNIDADE (texto livre, opcional, SUPERADMIN).
-- Nullable sem backfill: registros existentes permanecem válidos com NULL.
-- AlterTable
ALTER TABLE "franchisees" ADD COLUMN "service_hours" TEXT;

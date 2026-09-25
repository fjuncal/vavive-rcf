-- Datas civis da UNIDADE (entrada na rede e inauguração).
-- Colunas DATE (sem hora/timezone): 10/06/2024 permanece 10/06/2024.
-- Nullable: unidades existentes ficam NULL até o SUPERADMIN preencher;
-- nenhum dado existente é alterado ou inventado.
-- AlterTable
ALTER TABLE "franchisees" ADD COLUMN "joined_network_at" DATE;

-- AlterTable
ALTER TABLE "franchisees" ADD COLUMN "inaugurated_at" DATE;

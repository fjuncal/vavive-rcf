-- Ajuste manual passa a pertencer a um canal (enum ContactType reutilizado).
-- Coluna nullable por compatibilidade histórica: ajustes legados existentes
-- permanecem com NULL (sem canal inventado) e contam apenas no total geral.
-- Novos ajustes exigem type via validação da API.
-- AlterTable
ALTER TABLE "interaction_adjustments" ADD COLUMN "type" "ContactType";

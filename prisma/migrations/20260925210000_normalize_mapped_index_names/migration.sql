-- Normaliza nomes de índices auto-gerados para a convenção canônica do
-- Prisma (nome da tabela mapeada): somente metadados, sem tocar dados.
-- RenameIndex
ALTER INDEX "FranchiseeMember_franchiseeId_idx" RENAME TO "franchisee_members_franchiseeId_idx";

-- RenameIndex
ALTER INDEX "InteractionAdjustment_franchiseeId_createdAt_idx" RENAME TO "interaction_adjustments_franchiseeId_createdAt_idx";

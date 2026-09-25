-- Múltiplos franqueados (pessoas) por unidade.
-- Franchisee continua representando a UNIDADE (1 linha = 1 unidade):
-- name/photoUrl antigos foram preservados e cada unidade existente ganha
-- automaticamente uma pessoa principal correspondente (backfill abaixo).
-- Contact.memberId e LiveParticipant.memberId são OPCIONAIS:
-- registros antigos e fluxo rápido da TV continuam com NULL (unidade).
-- CreateTable
CREATE TABLE "franchisee_members" (
    "id" TEXT NOT NULL,
    "franchiseeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "franchisee_members_pkey" PRIMARY KEY ("id")
);

-- Backfill: uma pessoa principal por unidade existente, preservando
-- Franchisee.name e Franchisee.photoUrl. Nenhum dado existente é alterado.
INSERT INTO "franchisee_members" ("id", "franchiseeId", "name", "photoUrl", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "name", "photo_url", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "franchisees";

-- CreateIndex
CREATE INDEX "FranchiseeMember_franchiseeId_idx" ON "franchisee_members"("franchiseeId");

-- AddForeignKey
ALTER TABLE "franchisee_members" ADD CONSTRAINT "franchisee_members_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "franchisees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Contact passa a aceitar pessoa opcional (NULL = unidade).
ALTER TABLE "Contact" ADD COLUMN "memberId" TEXT;

-- CreateIndex
CREATE INDEX "Contact_memberId_idx" ON "Contact"("memberId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "franchisee_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: LiveParticipant passa a aceitar pessoa opcional (NULL = unidade).
-- A unicidade evolui de (live, unidade) para (live, unidade, pessoa),
-- permitindo 2+ participações por unidade sem duplicar unidades.
ALTER TABLE "LiveParticipant" ADD COLUMN "memberId" TEXT;

-- AlterIndex: o índice único antigo era somente (liveId, franchiseeId).
DROP INDEX "LiveParticipant_liveId_franchiseeId_key";

-- CreateIndex
CREATE UNIQUE INDEX "LiveParticipant_liveId_franchiseeId_memberId_key" ON "LiveParticipant"("liveId", "franchiseeId", "memberId");

-- CreateIndex
CREATE INDEX "LiveParticipant_memberId_idx" ON "LiveParticipant"("memberId");

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "franchisee_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

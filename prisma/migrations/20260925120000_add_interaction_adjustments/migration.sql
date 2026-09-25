-- Ajustes manuais de interações por franqueado (somente SUPERADMIN).
-- Não cria contatos falsos: o total de interações passa a ser derivado de
-- Contact (registros reais) + SUM(InteractionAdjustment.amount).
-- CreateTable
CREATE TABLE "interaction_adjustments" (
    "id" TEXT NOT NULL,
    "franchiseeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InteractionAdjustment_franchiseeId_createdAt_idx" ON "interaction_adjustments"("franchiseeId", "createdAt");

-- AddForeignKey
ALTER TABLE "interaction_adjustments" ADD CONSTRAINT "interaction_adjustments_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "franchisees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_adjustments" ADD CONSTRAINT "interaction_adjustments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

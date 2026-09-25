-- Atendimentos MENSAIS manuais por unidade (1 linha por franquia/mês).
-- Substitui Franchisee.service_count: a coluna foi criada na migration
-- 20260925230000, todos os registros estavam NULL e a feature ainda não
-- foi para produção, então ela é removida sem perda de dados.
-- As migrations 220000 e 230000 são preservadas intactas (histórico
-- imutável): no deploy futuro a produção executará 220000, 230000 e esta.
-- AlterTable
ALTER TABLE "franchisees" DROP COLUMN "service_count";

-- CreateTable
CREATE TABLE "franchisee_monthly_service_counts" (
    "id" TEXT NOT NULL,
    "franchiseeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "franchisee_monthly_service_counts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unicidade de 1 registro por franquia/mês (também indexa
-- consultas por franquia pelo prefixo franchiseeId; sem índice redundante).
CREATE UNIQUE INDEX "franchisee_monthly_service_counts_franchiseeId_year_month_key" ON "franchisee_monthly_service_counts"("franchiseeId", "year", "month");

-- CreateIndex: consultas agregadas por competência (todas as unidades).
CREATE INDEX "franchisee_monthly_service_counts_year_month_idx" ON "franchisee_monthly_service_counts"("year", "month");

-- AddForeignKey: histórico pertence à unidade (Cascade, como Contact e membros).
ALTER TABLE "franchisee_monthly_service_counts" ADD CONSTRAINT "franchisee_monthly_service_counts_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "franchisees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraints: segunda barreira no banco (validação principal no backend).
ALTER TABLE "franchisee_monthly_service_counts" ADD CONSTRAINT "franchisee_monthly_service_counts_month_check" CHECK ("month" BETWEEN 1 AND 12);
ALTER TABLE "franchisee_monthly_service_counts" ADD CONSTRAINT "franchisee_monthly_service_counts_count_check" CHECK ("count" >= 0);
ALTER TABLE "franchisee_monthly_service_counts" ADD CONSTRAINT "franchisee_monthly_service_counts_year_check" CHECK ("year" BETWEEN 2000 AND 2100);

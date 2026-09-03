-- AlterEnum
ALTER TYPE "ContactType" ADD VALUE 'LIVE';

-- CreateTable
CREATE TABLE "Live" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "hostUserId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Live_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveParticipant" (
    "id" TEXT NOT NULL,
    "liveId" TEXT NOT NULL,
    "franchiseeId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Live_scheduledAt_idx" ON "Live"("scheduledAt");

-- CreateIndex
CREATE INDEX "Live_hostUserId_idx" ON "Live"("hostUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveParticipant_contactId_key" ON "LiveParticipant"("contactId");

-- CreateIndex
CREATE INDEX "LiveParticipant_franchiseeId_idx" ON "LiveParticipant"("franchiseeId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveParticipant_liveId_franchiseeId_key" ON "LiveParticipant"("liveId", "franchiseeId");

-- AddForeignKey
ALTER TABLE "Live" ADD CONSTRAINT "Live_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Live" ADD CONSTRAINT "Live_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "franchisees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

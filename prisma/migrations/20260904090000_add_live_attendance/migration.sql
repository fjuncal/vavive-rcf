-- Existing Live participants were originally created together with a LIVE contact,
-- so they represent confirmed attendance and must remain marked as present.
ALTER TABLE "LiveParticipant"
ADD COLUMN "attended" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "LiveParticipant"
ALTER COLUMN "contactId" DROP NOT NULL;

ALTER TABLE "LiveParticipant"
DROP CONSTRAINT "LiveParticipant_contactId_fkey";

ALTER TABLE "LiveParticipant"
ADD CONSTRAINT "LiveParticipant_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

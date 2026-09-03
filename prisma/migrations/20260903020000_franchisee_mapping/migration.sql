ALTER TABLE "Franchisee" RENAME TO "franchisees";
ALTER TABLE "franchisees" RENAME COLUMN "photoUrl" TO "photo_url";
CREATE INDEX "Contact_franchiseeId_contactedAt_idx" ON "Contact"("franchiseeId", "contactedAt");
CREATE INDEX "Contact_contactedAt_type_idx" ON "Contact"("contactedAt", "type");

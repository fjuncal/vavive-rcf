-- Optional civil birth date belongs to person, not unit.
ALTER TABLE "franchisee_members"
ADD COLUMN "birthDate" DATE;

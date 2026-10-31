import assert from "node:assert/strict";
import {
  getPrimaryMemberId,
  getPrimarySwapDates,
  getTransferredSecondaryCreatedAt,
  validatePrimaryMemberSelection,
  validateSecondaryMemberTransfer,
} from "@/domain/franchisee-members";
import { getBirthdayMonthWindow } from "@/domain/birthdays";
import { hasAnyRole, OPERATIONS_ROLES } from "@/services/auth";

const members = [
  { id: "secondary", createdAt: "2026-02-02T00:00:00.000Z" },
  { id: "primary", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "secondary-2", createdAt: "2026-03-02T00:00:00.000Z" },
];

assert.equal(getPrimaryMemberId(members), "primary");
assert.equal(
  validatePrimaryMemberSelection({
    memberExists: true,
    memberFranchiseeId: "unit-origin",
    franchiseeId: "unit-origin",
    memberActive: true,
  }),
  null,
);
assert.equal(
  validatePrimaryMemberSelection({
    memberExists: true,
    memberFranchiseeId: "unit-other",
    franchiseeId: "unit-origin",
    memberActive: true,
  }),
  "member_not_in_unit",
);
assert.equal(
  validatePrimaryMemberSelection({
    memberExists: true,
    memberFranchiseeId: "unit-origin",
    franchiseeId: "unit-origin",
    memberActive: false,
  }),
  "member_inactive",
);
assert.equal(
  validatePrimaryMemberSelection({
    memberExists: false,
    memberFranchiseeId: null,
    franchiseeId: "unit-origin",
    memberActive: false,
  }),
  "member_not_found",
);
const swapDates = getPrimarySwapDates(
  { id: "primary", createdAt: "2026-01-02T00:00:00.000Z" },
  { id: "secondary", createdAt: "2026-02-02T00:00:00.000Z" },
);
assert.equal(
  getPrimaryMemberId([
    { id: "primary", createdAt: swapDates.demotedCreatedAt },
    { id: "secondary", createdAt: swapDates.promotedCreatedAt },
  ]),
  "secondary",
);
const movedCreatedAt = getTransferredSecondaryCreatedAt(
  [{ id: "destination-primary", createdAt: "2026-12-01T00:00:00.000Z" }],
  new Date("2026-01-01T00:00:00.000Z"),
);
assert.equal(
  getPrimaryMemberId([
    { id: "destination-primary", createdAt: "2026-12-01T00:00:00.000Z" },
    { id: "secondary", createdAt: movedCreatedAt! },
  ]),
  "destination-primary",
);
assert.equal(
  validateSecondaryMemberTransfer({
    memberId: "secondary",
    originFranchiseeId: "unit-origin",
    memberFranchiseeId: "unit-origin",
    primaryMemberId: "primary",
    destinationFranchiseeId: "unit-destination",
    destinationHasMember: false,
  }),
  null,
);
assert.equal(
  validateSecondaryMemberTransfer({
    memberId: "primary",
    originFranchiseeId: "unit-origin",
    memberFranchiseeId: "unit-origin",
    primaryMemberId: "primary",
    destinationFranchiseeId: "unit-destination",
    destinationHasMember: false,
  }),
  "primary_member_protected",
);
assert.equal(
  validateSecondaryMemberTransfer({
    memberId: "secondary",
    originFranchiseeId: "unit-origin",
    memberFranchiseeId: "unit-origin",
    primaryMemberId: "primary",
    destinationFranchiseeId: "unit-destination",
    destinationHasMember: true,
  }),
  "member_already_in_destination",
);
assert.equal(
  validateSecondaryMemberTransfer({
    memberId: "secondary",
    originFranchiseeId: "unit-origin",
    memberFranchiseeId: "unit-other",
    primaryMemberId: "primary",
    destinationFranchiseeId: "unit-destination",
    destinationHasMember: false,
  }),
  "member_not_in_origin",
);
assert.equal(
  validateSecondaryMemberTransfer({
    memberId: "secondary",
    originFranchiseeId: "unit-origin",
    memberFranchiseeId: "unit-origin",
    primaryMemberId: "primary",
    destinationFranchiseeId: null,
    destinationHasMember: false,
  }),
  "destination_not_found",
);
assert.equal(
  validateSecondaryMemberTransfer({
    memberId: "secondary",
    originFranchiseeId: "unit-origin",
    memberFranchiseeId: "unit-origin",
    primaryMemberId: "primary",
    destinationFranchiseeId: "unit-origin",
    destinationHasMember: false,
  }),
  "same_destination",
);
assert.equal(hasAnyRole({ role: "TV" }, OPERATIONS_ROLES), false);
assert.equal(hasAnyRole({ role: "SUPPORT" }, OPERATIONS_ROLES), true);

const birthdayCandidate = (franchiseeId: string) => ({
  memberId: "secondary",
  memberName: "Responsável secundário",
  photoUrl: null,
  birthDate: "1990-11-15",
  franchiseeId,
  unitName: franchiseeId,
});

const beforeTransfer = getBirthdayMonthWindow(
  [
    {
      memberId: "primary",
      memberName: "Responsável principal",
      photoUrl: null,
      birthDate: "1980-11-10",
      franchiseeId: "unit-origin",
      unitName: "Origem",
    },
    birthdayCandidate("unit-origin"),
  ],
  "2026-11-01",
);
assert.deepEqual(
  beforeTransfer.current.birthdays.map((item) => [item.memberId, item.franchiseeId]),
  [
    ["primary", "unit-origin"],
    ["secondary", "unit-origin"],
  ],
);

const afterTransfer = getBirthdayMonthWindow(
  [
    {
      memberId: "primary",
      memberName: "Responsável principal",
      photoUrl: null,
      birthDate: "1980-11-10",
      franchiseeId: "unit-origin",
      unitName: "Origem",
    },
    birthdayCandidate("unit-destination"),
  ],
  "2026-11-01",
);
assert.deepEqual(
  afterTransfer.current.birthdays.map((item) => [item.memberId, item.franchiseeId]),
  [
    ["primary", "unit-origin"],
    ["secondary", "unit-destination"],
  ],
);

console.log("franchisee member domain tests passed");

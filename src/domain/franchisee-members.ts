export type MemberOrderValue = {
  id: string;
  createdAt: Date | string;
};

/** Principal continua sendo a pessoa criada primeiro na unidade. */
export function getPrimaryMemberId(members: MemberOrderValue[]) {
  return [...members]
    .sort((left, right) => {
      const dateOrder =
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return dateOrder || left.id.localeCompare(right.id);
    })
    .at(0)?.id ?? null;
}

export type PrimaryMemberSelection = {
  memberExists: boolean;
  memberFranchiseeId: string | null;
  franchiseeId: string;
  memberActive: boolean;
};

export function validatePrimaryMemberSelection(input: PrimaryMemberSelection) {
  if (!input.memberExists) return "member_not_found" as const;
  if (input.memberFranchiseeId !== input.franchiseeId)
    return "member_not_in_unit" as const;
  if (!input.memberActive) return "member_inactive" as const;
  return null;
}

export function getPrimarySwapDates(
  currentPrimary: MemberOrderValue,
  nextPrimary: MemberOrderValue,
) {
  return {
    promotedCreatedAt: new Date(new Date(currentPrimary.createdAt).getTime() - 1),
    demotedCreatedAt: new Date(nextPrimary.createdAt),
  };
}

/** Keeps transferred secondary members after existing destination members. */
export function getTransferredSecondaryCreatedAt(
  destinationMembers: MemberOrderValue[],
  now = new Date(),
) {
  if (!destinationMembers.length) return undefined;
  const latestDestinationMember = Math.max(
    ...destinationMembers.map((member) => new Date(member.createdAt).getTime()),
  );
  return new Date(Math.max(now.getTime(), latestDestinationMember + 1));
}

export type MemberTransferValidation = {
  memberId: string;
  originFranchiseeId: string;
  memberFranchiseeId: string | null;
  primaryMemberId: string | null;
  destinationFranchiseeId: string | null;
  destinationHasMember: boolean;
};

/** Returns stable API error key. Empty string means transfer is valid. */
export function validateSecondaryMemberTransfer(
  input: MemberTransferValidation,
) {
  if (input.memberFranchiseeId !== input.originFranchiseeId)
    return "member_not_in_origin" as const;
  if (input.primaryMemberId === input.memberId)
    return "primary_member_protected" as const;
  if (!input.destinationFranchiseeId) return "destination_not_found" as const;
  if (input.destinationFranchiseeId === input.originFranchiseeId)
    return "same_destination" as const;
  if (input.destinationHasMember) return "member_already_in_destination" as const;
  return null;
}

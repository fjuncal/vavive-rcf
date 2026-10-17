export type BirthdayStatus = "today" | "week" | "month";

export type BirthdayMember = {
  day: number;
  month: number;
  status: BirthdayStatus;
};

export type TVBirthday = {
  memberId: string;
  memberName: string;
  photoUrl: string | null;
  franchiseeId: string;
  unitName: string;
  day: number;
  month: number;
  status: BirthdayStatus;
};

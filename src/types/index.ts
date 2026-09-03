export type UserRole = "ADMIN" | "SUPPORT";
export type FranchiseMoment = "IMPLANTACAO" | "INAUGURADA";
export type ContactType = "WHATSAPP" | "TELEFONE" | "VIDEO_CHAMADA" | "PRESENCIAL";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Franchisee = {
  id: string;
  name: string;
  unitName: string;
  photoUrl?: string | null;
  moment: FranchiseMoment;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Contact = {
  id: string;
  franchiseeId: string;
  userId: string;
  type: ContactType;
  contactedAt: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

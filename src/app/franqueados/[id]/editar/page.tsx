import { notFound } from "next/navigation";
import { OPERATIONS_ROLES, requireAnyRole } from "@/services/auth";
import { prisma } from "@/lib/db";
import { EditFranchiseeForm } from "@/components/franchisees/edit-form";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyRole(OPERATIONS_ROLES);
  const { id } = await params;
  const [franchisee, primaryMember] = await Promise.all([
    prisma.franchisee.findUnique({ where: { id } }),
    prisma.franchiseeMember.findFirst({
      where: { franchiseeId: id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { birthDate: true },
    }),
  ]);
  if (!franchisee) notFound();
  return (
    <EditFranchiseeForm
      franchisee={{ ...franchisee, primaryMemberBirthDate: primaryMember?.birthDate ?? null }}
      isSuperAdmin={user.role === "SUPERADMIN"}
    />
  );
}

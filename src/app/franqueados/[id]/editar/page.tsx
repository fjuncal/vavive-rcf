import { notFound } from "next/navigation";
import { OPERATIONS_ROLES, requireAnyRole } from "@/services/auth";
import { prisma } from "@/lib/db";
import { toDateInputValue } from "@/lib/utils";
import { EditFranchiseeForm } from "@/components/franchisees/edit-form";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyRole(OPERATIONS_ROLES);
  const { id } = await params;
  const [franchisee, members] = await Promise.all([
    prisma.franchisee.findUnique({ where: { id } }),
    prisma.franchiseeMember.findMany({
      where: { franchiseeId: id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        photoUrl: true,
        birthDate: true,
        active: true,
        createdAt: true,
      },
    }),
  ]);
  if (!franchisee) notFound();
  return (
    <EditFranchiseeForm
      franchisee={{ ...franchisee, primaryMemberBirthDate: members[0]?.birthDate ?? null }}
      members={members.map((member) => ({
        id: member.id,
        name: member.name,
        photoUrl: member.photoUrl,
        birthDate: toDateInputValue(member.birthDate) || null,
        active: member.active,
      }))}
      isSuperAdmin={user.role === "SUPERADMIN"}
    />
  );
}

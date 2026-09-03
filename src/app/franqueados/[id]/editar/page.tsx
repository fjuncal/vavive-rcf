import { notFound } from "next/navigation";
import { OPERATIONS_ROLES, requireAnyRole } from "@/services/auth";
import { prisma } from "@/lib/db";
import { EditFranchiseeForm } from "@/components/franchisees/edit-form";
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) { await requireAnyRole(OPERATIONS_ROLES); const { id } = await params; const franchisee = await prisma.franchisee.findUnique({ where: { id } }); if (!franchisee) notFound(); return <EditFranchiseeForm franchisee={franchisee} />; }

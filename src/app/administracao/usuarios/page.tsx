import { requireRole } from "@/services/auth";
import { UsersAdmin } from "@/components/admin/users-admin";
export default async function UsersPage(){await requireRole("SUPERADMIN");return <UsersAdmin/>;}

import { AdminShell } from "@/components/layout/admin-shell";

export default function LivesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}

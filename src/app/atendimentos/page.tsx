import { getSessionUser } from "@/services/auth";
import { getMonthlyOverview } from "@/services/monthly-service-counts";
import { MonthlyOverview } from "@/components/franchisees/monthly-overview";

type PageParams = { year?: string; month?: string };

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const [user, params] = await Promise.all([getSessionUser(), searchParams]);
  const now = new Date();
  const parsedYear = Number.parseInt(params.year ?? "", 10);
  const parsedMonth = Number.parseInt(params.month ?? "", 10);
  const year =
    Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : now.getFullYear();
  const month =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : now.getMonth() + 1;

  const initial = await getMonthlyOverview(year, month);
  return (
    <MonthlyOverview initial={initial} isSuperAdmin={user?.role === "SUPERADMIN"} />
  );
}

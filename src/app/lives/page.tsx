import { requireAnyRole, OPERATIONS_ROLES } from "@/services/auth";
import {
  getLiveFormOptions,
  getLivesSummary,
  listLives,
} from "@/services/lives";
import { LivesList } from "@/components/lives/lives-list";

type Params = {
  search?: string;
  period?: "current_month" | "previous_month" | "last_30_days" | "all";
  hostUserId?: string;
  status?: "scheduled" | "completed" | "all";
};

export default async function LivesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await requireAnyRole(OPERATIONS_ROLES);
  const filters = await searchParams;
  const [lives, allLives, options, summary] = await Promise.all([
    listLives(filters),
    listLives(),
    getLiveFormOptions(),
    getLivesSummary(filters),
  ]);
  const now = new Date();
  const future = allLives
    .filter((live) => live.scheduledAt > now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
  return (
    <LivesList
      lives={lives.map((live) => ({
        id: live.id,
        title: live.title,
        scheduledAt: live.scheduledAt.toISOString(),
        hostName: live.hostUser.name,
        guestCount: live.participants.length,
        attendeeCount: live.participants.filter((item) => item.attended).length,
        notes: live.notes,
        status: live.scheduledAt > now ? "scheduled" : "completed",
      }))}
      hosts={options.hosts}
      franchisees={options.franchisees}
      filters={filters}
      summary={{
        ...summary,
        next: future
          ? {
              title: future.title,
              scheduledAt: future.scheduledAt.toISOString(),
            }
          : null,
      }}
    />
  );
}

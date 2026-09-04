import { notFound } from "next/navigation";
import { requireAnyRole, OPERATIONS_ROLES } from "@/services/auth";
import { getLive, getLiveFormOptions } from "@/services/lives";
import { LiveDetails } from "@/components/lives/live-details";

export default async function LiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAnyRole(OPERATIONS_ROLES);
  const { id } = await params;
  const [live, options] = await Promise.all([
    getLive(id),
    getLiveFormOptions(),
  ]);
  if (!live) notFound();
  return (
    <LiveDetails
      live={{
        id: live.id,
        title: live.title,
        scheduledAt: live.scheduledAt.toISOString(),
        hostUserId: live.hostUserId,
        hostName: live.hostUser.name,
        hostRole: live.hostUser.role,
        createdByName: live.createdByUser.name,
        createdAt: live.createdAt.toISOString(),
        updatedAt: live.updatedAt.toISOString(),
        guestIds: live.participants.map((item) => item.franchiseeId),
        attendeeIds: live.participants
          .filter((item) => item.attended)
          .map((item) => item.franchiseeId),
        notes: live.notes ?? "",
        participants: live.participants.map((item) => ({
          id: item.franchisee.id,
          name: item.franchisee.name,
          unitName: item.franchisee.unitName,
          photoUrl: item.franchisee.photoUrl,
          moment: item.franchisee.moment,
          attended: item.attended,
        })),
      }}
      hosts={options.hosts}
      franchisees={options.franchisees}
      canDelete={user.role === "SUPERADMIN" || user.role === "ADMIN"}
    />
  );
}

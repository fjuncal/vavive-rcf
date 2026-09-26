import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageSquarePlus } from "lucide-react";
import { formatCivilDate, formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { FRANCHISE_MOMENT_LABELS, CONTACT_TYPE_LABELS } from "@/lib/constants";
import { getSessionUser, hasAnyRole, OPERATIONS_ROLES } from "@/services/auth";
import { getInteractionBreakdown } from "@/services/interaction-adjustments";
import { getMonthlyServiceCounts } from "@/services/monthly-service-counts";
import { InteractionAdjustmentsPanel } from "@/components/franchisees/interaction-adjustments-panel";
import { FranchiseeMembersPanel } from "@/components/franchisees/franchisee-members-panel";
import { MonthlyServiceCountsPanel } from "@/components/franchisees/monthly-service-counts-panel";
import { EditContactDialog } from "@/components/contacts/edit-contact-dialog";

const HISTORY_PAGE_SIZE = 25;

function historyHref(id: string, page: number) {
  return `/franqueados/${id}?page=${page}`;
}

export default async function FranchiseeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const requestedPage = Math.max(
    1,
    Number.parseInt(query.page ?? "1", 10) || 1,
  );
  const [franchisee, totalContacts, sessionUser] = await Promise.all([
      prisma.franchisee.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          unitName: true,
          photoUrl: true,
          moment: true,
          active: true,
          joinedNetworkAt: true,
          inauguratedAt: true,
        },
      }),
    prisma.contact.count({ where: { franchiseeId: id } }),
    getSessionUser(),
  ]);

  if (!franchisee) {
    notFound();
  }

  const isSuperAdmin = sessionUser?.role === "SUPERADMIN";
  const canManageMembers =
    !!sessionUser && hasAnyRole(sessionUser, OPERATIONS_ROLES);
  // Total derivado: registros reais (Contact) + SUM(ajustes manuais).
  // Ajustes NÃO alteram último contato, status, nem freshness/attention.
  // Por canal: Contacts do tipo + ajustes do mesmo tipo (legados só no total).
  const [breakdown, adjustments, members, monthlyServiceCounts] =
    await Promise.all([
    getInteractionBreakdown(id),
    isSuperAdmin
      ? prisma.interactionAdjustment.findMany({
          where: { franchiseeId: id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            type: true,
            notes: true,
            createdAt: true,
            createdByUser: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    canManageMembers
      ? prisma.franchiseeMember.findMany({
          where: { franchiseeId: id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            photoUrl: true,
            active: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    canManageMembers ? getMonthlyServiceCounts(id) : Promise.resolve([]),
  ]);

  const pages = Math.max(1, Math.ceil(totalContacts / HISTORY_PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const contacts = await prisma.contact.findMany({
    where: { franchiseeId: id },
    orderBy: [{ contactedAt: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * HISTORY_PAGE_SIZE,
    take: HISTORY_PAGE_SIZE,
    select: {
      id: true,
      type: true,
      contactedAt: true,
      notes: true,
      memberId: true,
      user: { select: { name: true } },
      member: { select: { name: true } },
      liveParticipant: {
        select: { live: { select: { id: true, title: true } } },
      },
    },
  });

  // Contagens por canal EFETIVAS: registradas + manuais do mesmo tipo.
  // Regra de qualificados preservada (TELEFONE+VIDEO+PRESENCIAL).
  const summary = {
    WHATSAPP: breakdown.byType.WHATSAPP,
    TELEFONE: breakdown.byType.TELEFONE,
    VIDEO_CHAMADA: breakdown.byType.VIDEO_CHAMADA,
    PRESENCIAL: breakdown.byType.PRESENCIAL,
    LIVE: breakdown.byType.LIVE,
  };

  const qualifiedCount =
    summary.TELEFONE.total +
    summary.VIDEO_CHAMADA.total +
    summary.PRESENCIAL.total;
  const qualifiedManual =
    summary.TELEFONE.manual +
    summary.VIDEO_CHAMADA.manual +
    summary.PRESENCIAL.manual;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Detalhe
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            {franchisee.name}
          </h1>
        </div>

        <Link
          href={`/franqueados/${franchisee.id}/contato`}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Registrar contato
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-6">
          <img
            src={
              franchisee.photoUrl ||
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80"
            }
            alt={franchisee.name}
            className="h-28 w-28 rounded-[20px] object-cover"
          />

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">
              {franchisee.unitName}
            </h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                {FRANCHISE_MOMENT_LABELS[franchisee.moment]}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 ${franchisee.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
              >
                {franchisee.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>
                Entrada na rede:{" "}
                <b className="text-slate-900">
                  {formatCivilDate(franchisee.joinedNetworkAt) || "Não informada"}
                </b>
              </span>
              <span>
                Inauguração:{" "}
                <b className="text-slate-900">
                  {formatCivilDate(franchisee.inauguratedAt) || "Não informada"}
                </b>
              </span>
            </div>
          </div>
        </div>
      </div>

      <FranchiseeMembersPanel
        franchiseeId={franchisee.id}
        initialMembers={members.map((item) => ({
          id: item.id,
          name: item.name,
          photoUrl: item.photoUrl,
          active: item.active,
          createdAt: item.createdAt.toISOString(),
        }))}
        canManage={canManageMembers}
      />

      <MonthlyServiceCountsPanel
        franchiseeId={franchisee.id}
        initialRecords={monthlyServiceCounts.map((item) => ({
          id: item.id,
          year: item.year,
          month: item.month,
          count: item.count,
        }))}
        isSuperAdmin={isSuperAdmin}
      />

      <div className="grid gap-4 md:grid-cols-6">
        {Object.entries(summary).map(([key, channel]) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {CONTACT_TYPE_LABELS[key as keyof typeof CONTACT_TYPE_LABELS]}
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {channel.total}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {channel.registered} registradas
              {channel.manual > 0 ? (
                <span className="font-semibold text-[#0b8f45]">
                  {" "}
                  +{channel.manual} manuais
                </span>
              ) : null}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Qualificados
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {qualifiedCount}
          </p>
          {qualifiedManual > 0 ? (
            <p className="mt-1 text-xs font-semibold text-[#0b8f45]">
              +{qualifiedManual} manuais
            </p>
          ) : null}
        </div>
      </div>

      <InteractionAdjustmentsPanel
        franchiseeId={franchisee.id}
        initialTotals={{
          registeredInteractions: breakdown.registeredInteractions,
          manualAdjustments: breakdown.manualAdjustments,
          totalInteractions: breakdown.totalInteractions,
        }}
        initialAdjustments={adjustments.map((item) => ({
          id: item.id,
          amount: item.amount,
          type: item.type,
          notes: item.notes,
          createdAt: item.createdAt.toISOString(),
          createdBy: { name: item.createdByUser.name },
        }))}
        isSuperAdmin={isSuperAdmin}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Histórico de contatos
        </h3>
        <div className="space-y-4">
          {contacts.length ? (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {CONTACT_TYPE_LABELS[contact.type]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(contact.contactedAt)}
                    </p>
                    {contact.member ? (
                      <p className="mt-0.5 text-xs font-semibold text-[#1f5d8c]">
                        com {contact.member.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
                      {contact.user?.name ?? "Conta removida"}
                    </span>
                    {isSuperAdmin ? (
                      <EditContactDialog
                        contact={{
                          id: contact.id,
                          type: contact.type,
                          contactedAt: contact.contactedAt.toISOString(),
                          notes: contact.notes,
                          memberId: contact.memberId,
                        }}
                        members={members.map((member) => ({
                          id: member.id,
                          name: member.name,
                        }))}
                        lockTypeAndDate={!!contact.liveParticipant}
                      />
                    ) : null}
                  </div>
                </div>
                {contact.notes ? (
                  <p className="mt-3 text-sm text-slate-600">
                    “{contact.notes}”
                  </p>
                ) : null}
                {contact.liveParticipant ? (
                  <Link
                    href={`/lives/${contact.liveParticipant.live.id}`}
                    className="mt-3 inline-flex text-sm font-semibold text-[#0b8f45] hover:underline"
                  >
                    Ver Live: {contact.liveParticipant.live.title}
                  </Link>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum contato registrado até o momento.
            </p>
          )}
        </div>
        {totalContacts > HISTORY_PAGE_SIZE ? (
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
            <span>
              Mostrando {(page - 1) * HISTORY_PAGE_SIZE + 1}–
              {Math.min(page * HISTORY_PAGE_SIZE, totalContacts)} de{" "}
              {totalContacts}
            </span>
            <div className="flex gap-2">
              <Link
                aria-disabled={page === 1}
                href={historyHref(id, Math.max(1, page - 1))}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium ${page === 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700"}`}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Link>
              <Link
                aria-disabled={page === pages}
                href={historyHref(id, Math.min(pages, page + 1))}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium ${page === pages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700"}`}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

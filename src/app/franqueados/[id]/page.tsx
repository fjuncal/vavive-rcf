import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageSquarePlus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { FRANCHISE_MOMENT_LABELS, CONTACT_TYPE_LABELS } from "@/lib/constants";

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
  const [franchisee, totalContacts, contactGroups] = await Promise.all([
    prisma.franchisee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        unitName: true,
        photoUrl: true,
        moment: true,
        active: true,
      },
    }),
    prisma.contact.count({ where: { franchiseeId: id } }),
    prisma.contact.groupBy({
      by: ["type"],
      where: { franchiseeId: id },
      _count: { _all: true },
    }),
  ]);

  if (!franchisee) {
    notFound();
  }

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
      user: { select: { name: true } },
      liveParticipant: {
        select: { live: { select: { id: true, title: true } } },
      },
    },
  });

  const counts = new Map(
    contactGroups.map((group) => [group.type, group._count._all]),
  );

  const summary = {
    WHATSAPP: counts.get("WHATSAPP") ?? 0,
    TELEFONE: counts.get("TELEFONE") ?? 0,
    VIDEO_CHAMADA: counts.get("VIDEO_CHAMADA") ?? 0,
    PRESENCIAL: counts.get("PRESENCIAL") ?? 0,
    LIVE: counts.get("LIVE") ?? 0,
  };

  const qualifiedCount =
    summary.TELEFONE + summary.VIDEO_CHAMADA + summary.PRESENCIAL;

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
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        {Object.entries(summary).map(([key, value]) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {CONTACT_TYPE_LABELS[key as keyof typeof CONTACT_TYPE_LABELS]}
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {value}
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
        </div>
      </div>

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
                  </div>
                  <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    {contact.user?.name ?? "Conta removida"}
                  </span>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { FRANCHISE_MOMENT_LABELS, CONTACT_TYPE_LABELS } from "@/lib/constants";

export default async function FranchiseeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const franchisee = await prisma.franchisee.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: { contactedAt: "desc" },
        include: {
          user: { select: { name: true } },
          liveParticipant: {
            include: { live: { select: { id: true, title: true } } },
          },
        },
      },
    },
  });

  if (!franchisee) {
    notFound();
  }

  const summary = {
    WHATSAPP: franchisee.contacts.filter(
      (contact) => contact.type === "WHATSAPP",
    ).length,
    TELEFONE: franchisee.contacts.filter(
      (contact) => contact.type === "TELEFONE",
    ).length,
    VIDEO_CHAMADA: franchisee.contacts.filter(
      (contact) => contact.type === "VIDEO_CHAMADA",
    ).length,
    PRESENCIAL: franchisee.contacts.filter(
      (contact) => contact.type === "PRESENCIAL",
    ).length,
    LIVE: franchisee.contacts.filter((contact) => contact.type === "LIVE")
      .length,
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
          {franchisee.contacts.length ? (
            franchisee.contacts.map((contact) => (
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
      </div>
    </div>
  );
}

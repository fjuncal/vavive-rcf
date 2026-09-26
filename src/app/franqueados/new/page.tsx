"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { FRANCHISE_MOMENT_LABELS, MONTH_LABELS } from "@/lib/constants";

type Mode = "NEW" | "EXISTING";

type UnitOption = {
  id: string;
  unitName: string;
  name: string;
  moment: "IMPLANTACAO" | "INAUGURADA";
  active: boolean;
  members: { id: string; name: string }[];
};

function normalizeUnitName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export default function NewFranchiseePage() {
  const router = useRouter();

  // Seletor de fluxo. Padrão: Nova unidade.
  const [mode, setMode] = useState<Mode>("NEW");

  // Campos comuns aos dois modos (foto + nome da pessoa).
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // Campos exclusivos do modo Nova unidade (fluxo atual preservado).
  const [unitName, setUnitName] = useState("");
  const [moment, setMoment] = useState<"IMPLANTACAO" | "INAUGURADA">(
    "IMPLANTACAO",
  );
  const [active, setActive] = useState(true);
  const [joinedNetworkAt, setJoinedNetworkAt] = useState("");
  const [inauguratedAt, setInauguratedAt] = useState("");
  const [serviceMonth, setServiceMonth] = useState(new Date().getMonth() + 1);
  const [serviceYear, setServiceYear] = useState(new Date().getFullYear());
  const [serviceQuantity, setServiceQuantity] = useState("");

  // Estado exclusivo do modo Unidade existente.
  const [selectedId, setSelectedId] = useState("");
  const [unitSearch, setUnitSearch] = useState("");

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setIsSuperAdmin(d?.user?.role === "SUPERADMIN");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Carrega as Franchisee já cadastradas (ativas primeiro, A–Z por unidade).
  // A ordenação vem do backend (GET /api/franchisees); aqui só filtramos.
  useEffect(() => {
    let alive = true;
    fetch("/api/franchisees", { cache: "no-store" })
      .then(async (r) => {
        const payload = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(
            payload?.message || "Não foi possível carregar as unidades.",
          );
        }
        if (alive) {
          setUnits(Array.isArray(payload) ? payload : []);
          setUnitsError("");
        }
      })
      .catch((reason) => {
        if (alive)
          setUnitsError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar as unidades.",
          );
      })
      .finally(() => {
        if (alive) setUnitsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filteredUnits = useMemo(() => {
    const term = normalizeUnitName(unitSearch);
    if (!term) return units;
    return units.filter((unit) =>
      `${unit.unitName} ${unit.name}`
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [units, unitSearch]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedId) ?? null,
    [units, selectedId],
  );

  // Aviso amigável de duplicidade EXATA (trim + case-insensitive) no modo
  // Nova unidade. Não é fuzzy: só igualdade normalizada. O backend (409) é
  // a autoridade; isto é apenas ajuda visual antes do submit.
  const duplicateHint = useMemo(() => {
    if (mode !== "NEW") return null;
    const normalized = normalizeUnitName(unitName);
    if (!normalized) return null;
    return units.some(
      (unit) => normalizeUnitName(unit.unitName) === normalized,
    )
      ? "Já existe uma unidade com este nome. Você pode adicionar o franqueado à unidade existente."
      : null;
  }, [mode, unitName, units]);

  function switchMode(next: Mode) {
    // Troca de modo: limpa apenas o feedback. Os estados de cada modo são
    // mantidos separados e o payload é construído explicitamente no submit,
    // então campos ocultos nunca vazam (não depende só de esconder inputs).
    setMode(next);
    setError("");
  }

  async function upload(file?: File) {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message || "Não foi possível enviar a foto.");
      setPhotoUrl(payload.url);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitNewUnit() {
    if (joinedNetworkAt && inauguratedAt && inauguratedAt < joinedNetworkAt)
      throw new Error("A inauguração não pode ser anterior à entrada na rede.");
    // Payload explícito do modo Nova unidade: cria Franchisee + membro
    // principal (+ MonthlyServiceCount opcional p/ SUPERADMIN). Nenhum
    // franchiseeId é enviado aqui.
    const data: Record<string, unknown> = {
      name,
      unitName,
      photoUrl,
      moment,
      active,
    };
    if (isSuperAdmin) {
      data.joinedNetworkAt = joinedNetworkAt;
      data.inauguratedAt = inauguratedAt;
      if (serviceQuantity !== "") {
        data.monthlyServiceCount = {
          year: Number(serviceYear),
          month: Number(serviceMonth),
          count: serviceQuantity,
        };
      }
    }
    const response = await fetch("/api/franchisees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.message || "Não foi possível salvar o franqueado.");
    router.push(`/franqueados/${payload.id}`);
    router.refresh();
  }

  async function submitExistingUnit() {
    if (!selectedId) throw new Error("Selecione a unidade existente.");
    // Payload explícito do modo Unidade existente: cria SOMENTE o
    // FranchiseeMember via /api/franchisees/[id]/members. Nenhum dado da
    // unidade (momento, datas, active, competência) é enviado — a unidade
    // existente não é modificada.
    const response = await fetch(
      `/api/franchisees/${selectedId}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, photoUrl }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(payload.message || "Não foi possível salvar o franqueado.");
    router.push(`/franqueados/${selectedId}`);
    router.refresh();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (mode === "NEW") await submitNewUnit();
      else await submitExistingUnit();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar o franqueado.",
      );
    } finally {
      setSaving(false);
    }
  }

  const visibleMembers = selectedUnit ? selectedUnit.members.slice(0, 5) : [];
  const hiddenMembersCount = selectedUnit
    ? Math.max(0, selectedUnit.members.length - visibleMembers.length)
    : 0;

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--brand-primary)]">
        Novo cadastro
      </p>
      <h1 className="mt-1 text-3xl font-semibold text-[var(--brand-secondary)]">
        Adicionar franqueado
      </h1>
      <p className="mt-2 text-slate-500">
        {mode === "NEW"
          ? "Preencha os dados iniciais da nova unidade."
          : "Adicione uma nova pessoa a uma unidade que já existe."}
      </p>

      {/* 1. Seletor de fluxo: controles separados, sem misturar texto+select. */}
      <div
        role="tablist"
        aria-label="Tipo de cadastro"
        className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "NEW"}
          onClick={() => switchMode("NEW")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            mode === "NEW"
              ? "bg-white text-[var(--brand-secondary)] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Nova unidade
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "EXISTING"}
          onClick={() => switchMode("EXISTING")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            mode === "EXISTING"
              ? "bg-white text-[var(--brand-secondary)] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Unidade existente
        </button>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-[var(--brand-primary)]">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Prévia"
              className="h-20 w-20 rounded-xl object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#eef7ef] text-[var(--brand-primary)]">
              <ImagePlus className="h-8 w-8" />
            </span>
          )}
          <span>
            <b className="block text-[var(--brand-secondary)]">Selecionar foto</b>
            <small className="mt-1 block text-slate-500">
              JPG, PNG ou WebP — até 5 MB
            </small>
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do novo franqueado"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
              required
            />
          </label>

          {mode === "NEW" ? (
            <label className="text-sm font-semibold text-slate-700">
              Unidade
              <input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                required
              />
            </label>
          ) : null}
        </div>

        {mode === "NEW" ? (
          <>
            {duplicateHint ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {duplicateHint}
              </p>
            ) : null}
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Momento
                <select
                  value={moment}
                  onChange={(e) => setMoment(e.target.value as typeof moment)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                >
                  <option value="IMPLANTACAO">Implantação</option>
                  <option value="INAUGURADA">Inaugurada</option>
                </select>
              </label>
              <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Unidade ativa
              </label>
            </div>
            {isSuperAdmin ? (
              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Data de entrada na rede
                  <input
                    type="date"
                    value={joinedNetworkAt}
                    onChange={(e) => setJoinedNetworkAt(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Data de inauguração
                  <input
                    type="date"
                    value={inauguratedAt}
                    onChange={(e) => setInauguratedAt(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Mês de referência
                  <select
                    value={serviceMonth}
                    onChange={(e) => setServiceMonth(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                  >
                    {MONTH_LABELS.map((label, index) => (
                      <option key={index + 1} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Ano
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    step={1}
                    value={serviceYear}
                    onChange={(e) => setServiceYear(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Atendimentos do mês (opcional)
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    value={serviceQuantity}
                    onChange={(e) => setServiceQuantity(e.target.value)}
                    placeholder="Ex.: 35"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                  />
                </label>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Buscar unidade
                <input
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Digite para filtrar por unidade ou pessoa"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Unidade existente
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                  required
                  disabled={unitsLoading || !!unitsError}
                >
                  <option value="">
                    {unitsLoading
                      ? "Carregando unidades..."
                      : "Selecione a unidade"}
                  </option>
                  {filteredUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unitName}
                      {unit.active ? "" : " (inativa)"}
                    </option>
                  ))}
                </select>
              </label>
              {unitsError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {unitsError}
                </p>
              ) : null}
              {!unitsLoading && !unitsError && !filteredUnits.length ? (
                <p className="text-sm text-slate-500">
                  {units.length
                    ? "Nenhuma unidade encontrada para esta busca."
                    : "Nenhuma unidade cadastrada."}
                </p>
              ) : null}
            </div>

            {selectedUnit ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">
                  Unidade selecionada
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedUnit.unitName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Momento:{" "}
                  <b className="text-slate-800">
                    {FRANCHISE_MOMENT_LABELS[selectedUnit.moment]}
                  </b>{" "}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      selectedUnit.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {selectedUnit.active ? "Ativa" : "Inativa"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Franqueados atuais:{" "}
                  {selectedUnit.members.length ? (
                    <span className="font-medium text-slate-800">
                      {visibleMembers.map((m) => m.name).join(", ")}
                      {hiddenMembersCount > 0
                        ? ` +${hiddenMembersCount} outro${hiddenMembersCount === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500">nenhum vinculado</span>
                  )}
                </p>
              </div>
            ) : null}
          </>
        )}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : mode === "NEW" ? (
            "Cadastrar franqueado"
          ) : (
            "Adicionar à unidade"
          )}
        </button>
      </form>
    </div>
  );
}

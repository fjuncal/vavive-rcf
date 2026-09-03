"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Tv,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";

type Role = "SUPERADMIN" | "ADMIN" | "SUPPORT" | "TV";
type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

const roles: Role[] = ["SUPERADMIN", "ADMIN", "SUPPORT", "TV"];
const creatableRoles: Role[] = ["SUPPORT", "ADMIN", "TV"];
const empty = {
  name: "",
  email: "",
  password: "",
  role: "SUPPORT" as Role,
  active: true,
};
const roleInfo: Record<
  Role,
  { label: string; description: string; color: string }
> = {
  SUPERADMIN: {
    label: "Superadmin",
    description: "Acesso total",
    color: "bg-violet-100 text-violet-700",
  },
  ADMIN: {
    label: "Administrador",
    description: "Gestão operacional",
    color: "bg-blue-100 text-blue-700",
  },
  SUPPORT: {
    label: "Suporte",
    description: "Franqueados e contatos",
    color: "bg-emerald-100 text-emerald-700",
  },
  TV: {
    label: "TV",
    description: "Modo operacional",
    color: "bg-amber-100 text-amber-700",
  },
};

async function json(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Não foi possível concluir a solicitação.");
  }
  return data;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const input =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0b8f45] focus:ring-4 focus:ring-[#0b8f45]/10";

  async function load() {
    try {
      setUsers(await json(await fetch("/api/users")));
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar usuários.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () =>
      users.filter((user) =>
        `${user.name} ${user.email} ${user.role}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [users, query],
  );

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await json(
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
      );
      setForm(empty);
      setCreating(false);
      setFeedback({ type: "success", text: "Conta criada com sucesso." });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a conta.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setFeedback(null);
    try {
      await json(
        await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editing, password }),
        }),
      );
      setEditing(null);
      setPassword("");
      setFeedback({ type: "success", text: "Alterações salvas com sucesso." });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar as alterações.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(user: User) {
    try {
      await json(
        await fetch("/api/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id }),
        }),
      );
      if (editing?.id === user.id) setEditing(null);
      setFeedback({ type: "success", text: "Conta removida com sucesso." });
      await load();
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Não foi possível remover a conta.";
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#003b71] p-7 text-white shadow-xl shadow-[#003b71]/15">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[#b8ee35]">
              Administração do sistema
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Usuários e permissões
            </h1>
            <p className="mt-3 max-w-2xl text-white/70">
              Gerencie os acessos da equipe e mantenha o controle da operação em
              um só lugar.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3">
              <p className="text-2xl font-semibold">
                {users.filter((user) => user.active).length}
              </p>
              <p className="text-xs text-white/65">contas ativas</p>
            </div>
            <button
              onClick={() => {
                setForm(empty);
                setFeedback(null);
                setCreating(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#b8ee35] px-4 py-3 text-sm font-bold text-[#003b71] transition hover:bg-[#d0fa68]"
            >
              <UserPlus className="h-4 w-4" />
              Criar conta
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {roles.map((role) => (
          <div
            key={role}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-xl p-2 ${roleInfo[role].color}`}>
                {role === "TV" ? (
                  <Tv className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
              </span>
              <b className="text-2xl text-[var(--brand-secondary)]">
                {users.filter((user) => user.role === role).length}
              </b>
            </div>
            <p className="mt-4 font-semibold text-[var(--brand-secondary)]">
              {roleInfo[role].label}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {roleInfo[role].description}
            </p>
          </div>
        ))}
      </div>

      {feedback ? (
        <p
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {feedback.text}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-semibold text-[var(--brand-secondary)]">
              Contas cadastradas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Edite dados, permissões, status e senha.
            </p>
          </div>
          <label className="flex min-w-60 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-[#0b8f45] focus-within:bg-white">
            <Search className="h-4 w-4 text-[var(--brand-primary)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar usuário"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <div className="divide-y divide-slate-100">
          {visible.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center gap-4 px-6 py-5"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${user.active ? "bg-[#eef7ef] text-[var(--brand-primary)]" : "bg-slate-100 text-slate-400"}`}
              >
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-48 flex-1">
                <b className="text-[var(--brand-secondary)]">{user.name}</b>
                <p className="mt-1 text-sm text-slate-500">{user.email}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${roleInfo[user.role].color}`}
              >
                {roleInfo[user.role].label}
              </span>
              <span
                className={`text-xs font-semibold ${user.active ? "text-emerald-600" : "text-slate-400"}`}
              >
                {user.active ? "Ativa" : "Inativa"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(user);
                    setPassword("");
                    setFeedback(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[var(--brand-secondary)] transition hover:border-[var(--brand-primary)]"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                {user.id !== currentUserId ? (
                  <DestructiveConfirmDialog
                    title="Remover conta de usuário?"
                    description="A conta perderá o acesso imediatamente. Os contatos já registrados serão preservados na auditoria como feitos por uma conta removida."
                    subject={`${user.name} — ${user.email}`}
                    triggerLabel="Remover"
                    onConfirm={() => removeUser(user)}
                  />
                ) : (
                  <span className="px-2 text-xs font-semibold text-slate-400">
                    Sua conta
                  </span>
                )}
              </div>
            </div>
          ))}
          {visible.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              Nenhum usuário encontrado.
            </p>
          ) : null}
        </div>
      </section>

      {creating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#003b71]/50 p-5 backdrop-blur-sm">
          <form
            onSubmit={create}
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-[#003b71] to-[#145987] px-7 py-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex rounded-xl bg-[#b8ee35] p-3 text-[#003b71]">
                    <UserPlus className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-[#b8ee35]">
                    Novo acesso
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    Criar conta de usuário
                  </h2>
                  <p className="mt-2 text-sm text-white/70">
                    Defina os dados iniciais e o nível de acesso.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <X />
                </button>
              </div>
            </div>
            <div className="space-y-5 p-7">
              <Field label="Nome completo">
                <input
                  autoFocus
                  className={input}
                  placeholder="Ex.: Ana Silva"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="E-mail">
                <input
                  className={input}
                  placeholder="ana@vavive.com.br"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Senha inicial">
                <input
                  className={input}
                  placeholder="Mínimo de 8 caracteres"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  required
                />
                <small className="mt-2 block text-xs font-normal text-slate-500">
                  A pessoa poderá alterar a senha posteriormente.
                </small>
              </Field>
              <Field label="Nível de acesso">
                <select
                  className={input}
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value as Role })
                  }
                >
                  {creatableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleInfo[role].label} — {roleInfo[role].description}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b8f45] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#0b8f45]/20 transition hover:bg-[#08773a] disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? "Criando..." : "Criar conta"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#003b71]/45 p-6 backdrop-blur-sm">
          <section className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex rounded-xl bg-[#eef7ef] p-3 text-[var(--brand-primary)]">
                  <UserRound className="h-5 w-5" />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-[var(--brand-primary)]">
                  Editar acesso
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-[var(--brand-secondary)]">
                  {editing.name}
                </h2>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X />
              </button>
            </div>
            <div className="mt-7 space-y-4">
              <Field label="Nome">
                <input
                  className={input}
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
                />
              </Field>
              <Field label="E-mail">
                <input
                  className={input}
                  type="email"
                  value={editing.email}
                  onChange={(event) =>
                    setEditing({ ...editing, email: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Permissão">
                  <select
                    className={input}
                    value={editing.role}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        role: event.target.value as Role,
                      })
                    }
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {roleInfo[role].label}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(event) =>
                      setEditing({ ...editing, active: event.target.checked })
                    }
                  />
                  Conta ativa
                </label>
              </div>
              <label className="block rounded-2xl border border-[#b8ee35]/60 bg-[#eef7ef] p-4 text-sm font-semibold text-[#003b71]">
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Nova senha
                </span>
                <input
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal text-slate-700"
                  type="password"
                  minLength={8}
                  placeholder="Deixe em branco para manter a senha atual"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <small className="mt-2 block font-normal text-slate-500">
                  Caso informe uma senha, use pelo menos 8 caracteres.
                </small>
              </label>
              <button
                disabled={saving}
                onClick={save}
                className="w-full rounded-xl bg-[var(--brand-primary)] py-3 font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

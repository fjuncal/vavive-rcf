"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MonitorPlay,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { VaviveLogo } from "@/components/brand/vavive-logo";

const highlights = [
  {
    icon: BarChart3,
    label: "Visão da rede",
    detail: "Indicadores e histórico em um só lugar",
  },
  {
    icon: MonitorPlay,
    label: "Modo TV",
    detail: "Interação rápida, feita para o touch",
  },
  {
    icon: ShieldCheck,
    label: "Acesso protegido",
    detail: "Permissões adequadas a cada papel",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "Não foi possível entrar. Tente novamente.");
        return;
      }

      router.push(data.role === "TV" ? "/tv/modo" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "O acesso está demorando mais que o esperado. Verifique a conexão e tente novamente."
          : "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef6ef] p-3 sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_7%_5%,rgba(184,238,53,.34),transparent_27%),radial-gradient(circle_at_96%_92%,rgba(11,143,69,.14),transparent_28%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1540px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-2xl shadow-[#003b71]/15 sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[36px] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-[#003b71] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-[#b8ee35]/20 blur-3xl" />
          <div className="absolute -bottom-52 -left-24 h-[30rem] w-[30rem] rounded-full bg-[#00a76f]/25 blur-3xl" />
          <div className="absolute inset-0 opacity-[.14] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:44px_44px]" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[24px] border border-white/20 bg-white/95 p-1.5 shadow-xl shadow-black/15">
              <VaviveLogo className="h-full w-full" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.32em] text-[#b8ee35]">
                Central de relacionamento
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-[.16em]">
                VAVIVÊ
              </p>
            </div>
          </div>

          <div className="relative max-w-[590px] py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b8ee35]/30 bg-[#b8ee35]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#d5ff70]">
              <Sparkles className="h-4 w-4" />
              Rede mais próxima
            </div>
            <h1 className="mt-7 text-5xl font-semibold leading-[1.04] tracking-tight xl:text-6xl">
              Cada contato revela uma nova oportunidade.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-white/72">
              Um ambiente simples e inteligente para cuidar da experiência de
              cada franqueado VAVIVÊ.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            {highlights.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/15 bg-white/[.08] p-4 backdrop-blur-sm"
              >
                <Icon className="h-5 w-5 text-[#b8ee35]" />
                <p className="mt-5 text-sm font-semibold">{label}</p>
                <p className="mt-1 text-xs leading-5 text-white/60">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex items-center justify-center bg-white px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#b8ee35]/15 blur-3xl" />
          <div className="relative w-full max-w-md">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#003b71]/10 bg-white p-1 shadow-lg shadow-[#003b71]/10">
                <VaviveLogo className="h-full w-full" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.26em] text-[#0b8f45]">
                  Central de relacionamento
                </p>
                <p className="mt-1 text-lg font-bold tracking-[.16em] text-[#003b71]">
                  VAVIVÊ
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-[#003b71]/[.08] sm:p-9">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#0b8f45]">
                    Acesso seguro
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#062e54] sm:text-4xl">
                    Bem-vindo de volta
                  </h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef8ef] text-[#0b8f45]">
                  <LockKeyhole className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Entre para acompanhar sua rede ou operar a experiência da TV.
              </p>

              <form onSubmit={submit} className="mt-8 space-y-5">
                <label className="block text-sm font-semibold text-slate-700">
                  E-mail
                  <span className="mt-2.5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 transition focus-within:border-[#0b8f45] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0b8f45]/10">
                    <Mail className="h-5 w-5 shrink-0 text-[#0b8f45]" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="voce@vavive.com.br"
                      className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                      required
                    />
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Senha
                  <span className="mt-2.5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 transition focus-within:border-[#0b8f45] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0b8f45]/10">
                    <LockKeyhole className="h-5 w-5 shrink-0 text-[#0b8f45]" />
                    <input
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Sua senha"
                      className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-[#003b71] focus:outline-none focus:ring-2 focus:ring-[#0b8f45]/30"
                    >
                      {show ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </span>
                </label>

                {loading ? (
                  <p className="flex items-center gap-2.5 rounded-xl border border-[#0b8f45]/10 bg-[#eef8ef] px-4 py-3 text-sm font-medium text-[#075f31]">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Validando seu acesso...
                  </p>
                ) : null}

                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0b8f45] px-5 py-4 font-semibold text-white shadow-lg shadow-[#0b8f45]/25 transition hover:bg-[#087638] hover:shadow-xl hover:shadow-[#0b8f45]/30 focus:outline-none focus:ring-4 focus:ring-[#0b8f45]/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Aguarde..." : "Entrar na plataforma"}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Acesso exclusivo para pessoas autorizadas da VAVIVÊ.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

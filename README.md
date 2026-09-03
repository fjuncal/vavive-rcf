# VAVIVÊ Televisão

Sistema interno de franqueados com painel administrativo e TV touch para registro rápido de contatos.

## Início local

```bash
cp .env.example .env
docker compose up -d postgres
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

O seed exige `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` e `TV_SEED_PASSWORD`; ele cria o superadmin informado e a conta operacional `tv@vavive.local`. Senhas não ficam no código-fonte.

## Ambiente

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vavive_televisao?schema=public"
ADMIN_SEED_EMAIL="admin@vavive.local"
ADMIN_SEED_PASSWORD="change-me"
TV_SEED_PASSWORD="change-me"
```

## Autenticação e permissões

Sessões ficam no PostgreSQL e usam cookie HttpOnly, SameSite=Lax e Secure em produção. Sessões administrativas duram 8 horas; a TV, 180 dias. `SUPERADMIN` administra usuários; `ADMIN` e `SUPPORT` administram franqueados e contatos; `TV` acessa somente a experiência `/tv` e registra contatos.

A TV é interativa: seleciona franqueados, mostra indicadores e grava WhatsApp, Telefone, Videochamada ou Presencial. O autor é sempre o usuário autenticado da sessão, portanto a auditoria mostra `TV Suporte` quando o registro veio da TV. Contatos qualificados: Telefone, Videochamada e Presencial.

## Fotos e deploy

Em desenvolvimento, as fotos são gravadas em `public/uploads`. Isso não é persistente na Vercel; em produção o upload é bloqueado até que `src/lib/storage.ts` seja conectado a um storage persistente, como Vercel Blob. Apenas a URL deve ser salva no PostgreSQL. Use PostgreSQL gerenciado em produção.

## Validação

```bash
npm run lint
npm run typecheck
npx prisma validate
npx prisma generate
npm run build
```

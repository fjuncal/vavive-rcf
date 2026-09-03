# VAVIVÊ Televisão

Sistema interno de acompanhamento de franqueados da VAVIVÊ, com área administrativa para registro de contatos e uma tela de TV para monitoramento em tempo real.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- React Server Components
- Server Actions e API Routes internas
- Recharts
- Lucide React

## Requisitos

- Node.js 20+
- PostgreSQL 15+
- npm

## Variáveis de ambiente

Crie um arquivo `.env` na raiz com o conteúdo abaixo:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vavive_televisao?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_SEED_EMAIL="admin@vavive.local"
ADMIN_SEED_PASSWORD="Vavive@2026"
```

## Banco de dados

Suba apenas o PostgreSQL de desenvolvimento com Docker:

```bash
docker compose up -d postgres
```

Para parar o banco (os dados permanecem no volume):

```bash
docker compose stop postgres
```

1. Crie o banco PostgreSQL:

```bash
createdb vavive_televisao
```

2. Gera schema Prisma:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

3. Execute seed local:

```bash
npm run db:seed
```

## Credenciais de desenvolvimento

- E-mail: admin@vavive.local
- Senha: Vavive@2026

## Como iniciar

```bash
npm install
npm run dev
```

A aplicação estará disponível em: http://localhost:3000

## Rotas principais

- `/login` — autenticação interna
- `/dashboard` — painel de indicadores
- `/franqueados` — listagem e busca
- `/franqueados/[id]` — detalhe do franqueado e histórico
- `/franqueados/[id]/contato` — registrar novo contato
- `/tv` — tela de monitoramento para TV

## Arquitetura

- `src/app` — rotas e páginas do app
- `src/components` — layout, UI e blocos reutilizáveis
- `src/domain` — validações e regras de input
- `src/lib` — constantes, utilitários e conexão com banco
- `src/services` — regras de negócio e consultas
- `src/types` — tipos de domínio
- `prisma` — schema e seed

## Banco (modelo inicial)

- `User`: perfil interno do suporte
- `Franchisee`: unidade/franqueado
- `Contact`: histórico de contatos com tipo, data e observações

## Observações

- A tela `/tv` é somente leitura e não exige login administrativo.
- Contatos de WhatsApp ficam no histórico, mas não entram no indicador principal da TV.
- O cálculo mensal usa `contactedAt`, respeitando o intervalo do mês atual vs. anterior.
- O projeto foi estruturado para permitir futura segmentação de permissões e metas por franqueado.

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

Em desenvolvimento (`NODE_ENV=development`), as fotos são gravadas em `public/uploads` e a URL relativa é salva em `Franchisee.photoUrl`.

Em produção (`NODE_ENV=production`), o upload é feito no servidor com [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) e apenas a URL pública retornada pelo Blob é salva em `Franchisee.photoUrl`. Crie/conecte um Blob Store ao projeto Vercel e configure a variável de ambiente abaixo no painel da Vercel (Production):

```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_seu_token"
```

O token nunca é enviado ao navegador: ele é usado somente no handler de upload do servidor. Os formatos aceitos continuam sendo JPG, PNG e WebP, com limite de 5 MB. Em produção, não use o filesystem da Vercel para uploads, pois ele não é persistente.

## Database migrations

Em desenvolvimento, altere o schema e crie uma nova migration:

```bash
npx prisma migrate dev --name nome_da_migration
```

Em produção, configure o Build Command da Vercel como `npm run vercel-build`. Ele executa `prisma generate`, aplica somente migrations pendentes com `prisma migrate deploy` e, por fim, executa o build do Next.js. Para aplicar somente migrations em um ambiente autorizado, use `npx prisma migrate deploy`.

Migrations já aplicadas em produção são histórico imutável: não as edite, renomeie ou remova. `npm run db:seed` usa dados de desenvolvimento e nunca deve ser executado em produção.

## Validação

```bash
npm run lint
npm run typecheck
npx prisma validate
npx prisma generate
npm run build
```

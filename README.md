# Shod Flow — Fleet & Safety Platform

SHOD Express uchun ichki operatsion tizim: Fleet (trucks, trailers, services, expenses, documents) va Safety (drivers, insurance, accidents, cargo claims, inspections) bo'limlari bitta bazada, rol/bo'lim bo'yicha kirish nazorati bilan.

**Stack:** Next.js 16 (App Router) · React 19 · Prisma 7 + PostgreSQL · NextAuth v5 (Credentials) · Tailwind CSS v4 · AWS S3 (yoki lokal disk) fayl saqlash.

## Ishga tushirish (lokal)

```bash
# 1. PostgreSQL 17 (Docker) — prod'dagi Neon bilan bir xil versiya
docker compose up -d

# 2. Muhit o'zgaruvchilari
cp .env.example .env
# DATABASE_URL allaqachon lokal Docker bazasiga ishora qiladi.
# AUTH_SECRET ni to'ldiring: npx auth secret

# 3. Bog'liqliklar + baza + demo ma'lumot
npm install
npx prisma migrate deploy
npm run db:seed

# 4. Dev server
npm run dev   # http://localhost:3000
```

> Baza hostda **5433** portida turadi (5432 ni boshqa loyihalar band qilishi mumkin).
> `docker compose down` — to'xtatadi, ma'lumot saqlanadi; `down -v` — ma'lumotni ham o'chiradi.

Seed 3 ta demo foydalanuvchi yaratadi (parol: `password123`, faqat dev uchun):

| Rol | Email | Landing |
|---|---|---|
| Admin | admin@shodflow.com | /admin |
| Fleet | fleet@shodflow.com | /fleet/dashboard |
| Safety | safety@shodflow.com | /safety/dashboard |

## Skriptlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Prisma generate + production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit testlar |
| `npm run db:migrate` | Migratsiyalarni deploy qilish (prod) |
| `npm run db:seed` | Demo ma'lumot |
| `npm run db:reset` | Bazani qayta yaratish (dev) |
| `docker compose up -d` | Lokal PostgreSQL'ni ishga tushirish |
| `docker compose down` | Lokal PostgreSQL'ni to'xtatish |

## Muhit o'zgaruvchilari

`.env.example` dagi izohlarga qarang: `DATABASE_URL`, `AUTH_SECRET` majburiy; `S3_*` bo'sh bo'lsa fayllar `.uploads/` lokal papkada saqlanadi; `CRON_SECRET` production'da `/api/cron/notifications` endpointini himoya qiladi.

## Arxitektura qisqacha

- **Server actions** (`src/app/actions/*`) — barcha CRUD; har biri `requirePermission`/`requireModule` bilan himoyalangan va `AuditLog`ga (diff `details` bilan) yozadi.
- **Kirish nazorati** — `src/proxy.ts` (route darajasida) + `src/lib/auth-guard.ts` (server action ichida, defense-in-depth). Granular ruxsatlar `src/lib/modules.ts` reyestri orqali.
- **Fayllar** — `src/lib/storage.ts`: S3 yoki lokal; DB'da barqaror `storageKey`, havola doim `/api/files/{id}` (S3 uchun har so'rovda yangi presigned URL). Versiya zanjiri `Document.replacesId`.
- **Bildirishnomalar** — qoidalar `src/lib/notification-rules.ts`; dashboard renderida va Vercel cron (`vercel.json` → `/api/cron/notifications`, har kuni 06:00 UTC) orqali generatsiya qilinadi.

## Deploy (Vercel)

1. Repo'ni Vercel'ga ulang; Postgres (masalan Neon, Marketplace orqali) yarating.
2. Env: `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, (ixtiyoriy) `S3_*`.
3. Migratsiya: deploy'dan keyin `npx prisma migrate deploy` (yoki CI bosqichi sifatida).
4. `vercel.json` dagi cron avtomatik ulanadi.

CI (GitHub Actions, `.github/workflows/ci.yml`): lint → typecheck → test → build har push/PR'da.

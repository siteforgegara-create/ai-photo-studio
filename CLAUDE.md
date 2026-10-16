# AI Photo Studio — CLAUDE.md

Ты — Claude Code, исполнитель. Технический лид и владелец ставят задачи этапами (`docs/04-roadmap.md`).
Этот файл — главная инструкция; подробности лежат в `docs/`, утверждённые макеты — в `design/references/`.

Документы написаны на русском, а **интерфейс сайта полностью на английском**. Код, имена файлов и коммиты тоже на английском.

---

## 1. Что строим

**Премиальный сервис AI-портретов (headshots)**, который выигрывает у конкурентов не количеством кадров, а тем, что **каждый кадр похож на человека**.

Пользователь загружает 4–8 селфи, бесплатно получает 4 превью с водяным знаком, покупает «съёмку» (разовый пакет) и получает отобранные 4K-портреты в выбранных стилях. Дальше любой кадр можно доработать в **Studio**: фон, одежда, ретушь, креативный стиль, «помести меня в сцену», кадрирование и экспорт.

Отличия от рынка (HeadshotPro, Aragon, BetterPic и др.) — они должны быть видны в продукте, а не только в маркетинге:

| Боль рынка | Наш ответ |
|---|---|
| «Не похож на меня» | автоматический фильтр сходства: клиент видит только прошедшие проверку кадры |
| платишь, не видя результата | бесплатное превью из 4 кадров до оплаты |
| из 100 кадров годных 15 | обещаем N **отобранных** кадров, брак отсеивается автоматически |
| нужно 10–15 селфи | 4–8 селфи с проверкой качества в браузере |
| стиль не исправить после генерации | Studio: правки входят в пакет |
| низкое разрешение | 4K на всех тарифах, коммерческая лицензия |
| фото хранятся неизвестно сколько | селфи удаляются через 24 ч после съёмки, результаты — через 30 дней, кнопка «удалить сейчас» |
| мутный возврат | полный возврат до первого скачивания в полном размере |

Плюс **бесплатные инструменты без регистрации** (удаление фона и фоторедактор, оба работают в браузере) — источник SEO-трафика, ведущий к headshot.

## 2. Стек (зафиксирован)

- **Next.js** (актуальная стабильная, App Router) + **TypeScript strict**
- **Tailwind CSS v4** + **shadcn/ui** (Radix)
- **Motion for React** (`motion/react`) с поддержкой `prefers-reduced-motion`
- **lucide-react** — единственный набор иконок
- **next-themes** — Light/Dark, по умолчанию Light, без мигания
- **zustand** (состояние мастера и Studio), **react-hook-form + zod** (формы)
- **Inter** через `next/font` — единственный шрифт
- **Vitest** + **Playwright**; пакетный менеджер **npm**

Позже, НЕ на этапах фронтенда: Supabase (Auth + Google, Storage, Postgres + RLS), fal.ai, Lemon Squeezy, Resend, PostHog, Sentry, Vercel.

## 3. Жёсткие правила

1. **Нет** `/dashboard` и публичной галереи. Съёмки пользователя открываются через `/shoot/[id]`, список — в меню аккаунта (`My Shoots`).
2. **Никаких выдуманных фактов в маркетинге:** отзывов, числа пользователей, рейтингов, логотипов клиентов, «as seen in», значков SOC 2, времени генерации, процента сходства. Сравнения — только с «typical AI headshot apps», без названий конкурентов. Утверждения про приватность — только из `docs/00-decisions.md`.
3. **Деньги и кредиты тратятся только после явного подтверждения.** Выбор стиля, инструмента или опции никогда ничего не списывает.
4. **Демо честное.** Демо-картинки подписаны `Example`; демо-режим не делает сетевых запросов к генерации — это обеспечено структурой кода.
5. **Бесплатные инструменты работают без входа и не отправляют файл на сервер.**
6. **Post-MVP не делаем и не рисуем:** Teams-функциональность (только лендинг с формой ожидания), Outfit Transfer по фото одежды, Restoration, видео.
7. **Цифры с макетов — заглушки** (балансы, имена, цены `Price to be confirmed`).

Все продуктовые решения собраны в `docs/00-decisions.md`. Если макет ему противоречит, прав документ.

## 4. Источники и приоритет

1. Этот файл и `docs/*`
2. `design/references/*` вместе с `design/references/README.md` (что брать и что игнорировать)
3. `design/prototypes/*.html` — только поведение и анимации

У части экранов нет макетов: мастер съёмки, страница съёмки, инструменты, Teams, SEO-страницы. Строй их **в той же дизайн-системе** (`docs/01-design-system.md`), опираясь на ближайшие утверждённые экраны (Studio, Pricing, Settings). Чего нет в документах — не придумывай: оставь `TODO(owner)` и упомяни в отчёте.

## 5. Архитектура: mock-first

Бэкенда пока нет. Всё серверное — за интерфейсами в `src/services/`; UI работает только через них:

```
src/services/
  types.ts      // User, Shoot, ShootPhoto, Pack, CreditBalance, LedgerEntry, EditJob, Preview, SelfieCheck...
  auth.ts       // AuthService
  shoots.ts     // ShootsService: createDraft, uploadSelfie, requestPreview, checkout, get, list, subscribe, favorite, download, deleteNow, refundEligibility
  edits.ts      // EditsService: quote, create(input, idempotencyKey), subscribe
  credits.ts    // CreditsService: getBalance, getLedger, getCreditPacks
  billing.ts    // BillingService: getShootPacks, startCheckout(packId|creditPackId) -> url
  waitlist.ts   // WaitlistService: join(email, teamSize) — для Teams
  index.ts      // mock сейчас, supabase позже
  mock/         // реализации с задержками и сценариями (dev-панель)
```

- Dev-панель (только development) переключает сценарии: Guest / New user (без съёмок, превью не использовано) / Has shoot (Professional, готова) / Shoot generating / Preview used; ошибки генерации и правок.
- Демо-контент: `src/config/demo-manifest.ts` + `public/demo/`. Демо-код не импортирует `EditsService` и `ShootsService`.
- Конфиги: `src/config/brand.ts` (имя продукта — **рабочее**, только отсюда), `packs.ts` (тарифы), `styles.ts` (каталог стилей съёмки), `edit-tools.ts` (инструменты Studio), `use-cases.ts` (SEO-страницы).
- Тяжёлые клиентские вещи — через динамический импорт: HEIC-конвертер, модель удаления фона, детектор лица.

## 6. Маршруты

```
src/app/
  (marketing)/layout.tsx           // MarketingHeader + Footer
    page.tsx                       // /                — headshot-first лендинг
    pricing/page.tsx               // /pricing         — тарифы съёмок + докупка кредитов
    headshots/[useCase]/page.tsx   // /headshots/linkedin и т. д. (SSG из use-cases.ts)
    tools/background-remover/      // бесплатно, без входа
    tools/photo-editor/            // бесплатно, без входа
    teams/page.tsx                 // лендинг + waitlist
    settings/page.tsx              // только для вошедших
    privacy/  terms/
  (auth)/login/ signup/ forgot-password/ reset-password/
  shoot/new/page.tsx               // мастер: селфи → превью → тариф → стили → оплата → генерация
  shoot/[id]/page.tsx              // страница съёмки: отбор, избранное, скачивание
  studio/page.tsx                  // редактирование кадра (?photo=<id>) или демо для гостя
  not-found.tsx
```

`/credits` → редирект на `/pricing#credits`. После входа: есть съёмка → последняя `/shoot/[id]`; нет → `/shoot/new` (или `next`, если он задан).

## 7. Как работать

- Этапы — из `docs/04-roadmap.md`, по одному. Внутри этапа работай самостоятельно.
- В конце этапа:
  1. проходят `lint`, `typecheck`, `test`, `build`;
  2. Playwright-скриншоты затронутых экранов (Light/Dark × 1440/390, Studio ещё 1024) в `screenshots/stage-N/`;
  3. сравнение с референсами: сознательные отличия и недоделки;
  4. коммит `stage-N: <summary>` и push;
  5. отчёт `reports/stage-N.md`.
- Потом жди ревью; правки — отдельными коммитами.
- Никаких платных сервисов, облачных ресурсов и ключей API на этапах фронтенда.
- Доступность — часть готовности: семантика, видимый фокус, ARIA, контраст AA, клавиатура.

## 8. Документы

| Файл | О чём |
|---|---|
| `docs/00-decisions.md` | все решения владельца — приоритетнее макетов |
| `docs/01-design-system.md` | токены, типографика, компоненты, motion |
| `docs/02-studio.md` | `/studio` — редактор кадра: раскладка, инструменты, состояния, демо, mobile |
| `docs/03-pages.md` | Homepage, Pricing, SEO-страницы, Free tools, Teams, Settings, Auth, Legal |
| `docs/04-roadmap.md` | этапы и критерии приёмки |
| `docs/05-backend-outline.md` | будущая модель данных и потоки (для согласования mock-типов) |
| `docs/06-shoot-flow.md` | мастер `/shoot/new` и страница `/shoot/[id]` |
| `design/references/README.md` | макеты: что брать и что игнорировать |

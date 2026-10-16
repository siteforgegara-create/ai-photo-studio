# 04 — Этапы

После каждого этапа — проверки, скриншоты, коммит, отчёт (CLAUDE.md §7), затем ревью. Следующий этап начинается по команде владельца.

---

## Фронтенд (mock-first)

### Stage 1 — Фундамент
- **Каркас.** В папке уже лежат `CLAUDE.md`, `docs/`, `design/`, `public/demo/`, а `create-next-app` в непустую папку не пойдёт. Создай проект в `_scaffold` (TypeScript, App Router, Tailwind, ESLint, `src/`, алиас `@/*`), перенеси в корень, удали `_scaffold`, существующие файлы не перезаписывай.
- `git init`, `.gitignore`, первый коммит; скрипты `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `screenshots`.
- Зависимости (CLAUDE.md §2); shadcn/ui — только используемые компоненты.
- Токены (`01-design-system.md`) → `globals.css`; Inter; next-themes без вспышки.
- Конфиги: `brand.ts`, `packs.ts`, `styles.ts`, `edit-tools.ts`, `use-cases.ts`, `demo-manifest.ts`, `selfie-check.ts`.
- `src/services/*`: типы (`05-backend-outline.md`) и mock-реализации; dev-панель сценариев.
- Компоненты из `01-design-system.md` §4, `MarketingHeader`, App-шапка, `Footer`, `AccountMenu` (с dropdown `My Shoots`).
- Заготовки всех маршрутов (CLAUDE.md §6), редирект `/credits`, `not-found`.
- `/dev/ui` (только development) — все компоненты во всех вариантах и темах.
- Playwright: конфигурация и скрипт скриншотов.

**Приёмка:** все маршруты открываются в обеих темах; шапки соответствуют V2 для гостя и вошедшего; тема не мигает при перезагрузке; `/dev/ui` по стилю совпадает с макетами.

### Stage 2 — Съёмка: мастер и страница съёмки
- `/shoot/new` полностью (`06-shoot-flow.md` §1): селфи с проверкой качества в браузере (MediaPipe, резкость, яркость, dHash), согласие, IndexedDB-черновик, вход посреди мастера с сохранением селфи, Your look, Free preview с водяным знаком, Package и выбор стилей, mock-checkout, генерация со счётчиком.
- `/shoot/[id]` (§2): шапка с сроком, фильтры, избранное, сетка, лайтбокс, загрузка в форматах (обрезка по лицу на клиенте), ZIP (на клиенте — `fflate` или `client-zip`), гарантия и диалог возврата, `Delete now`.
- Unit-тесты selfie-check и обрезки; e2e полного пути «гость → селфи → вход → превью → покупка → съёмка готова».

**Приёмка:** путь проходит на desktop и mobile без потери данных при входе посреди мастера; селфи без лица и с двумя лицами корректно отклоняются; страница съёмки работает с 100 кадрами без подтормаживаний (виртуализация не обязательна, но lazy-loading и `sizes` обязательны).

### Stage 3 — Studio
- Раскладка, инструменты, вкладки Options / Shoot / Edits, состояния и модалки (`02-studio.md`), Before/After, демо-режим, Crop & Export (общий модуль `src/features/editor/`), Place Me Here со своей сценой, Custom-поля, селектор вариантов.
- Mobile и tablet.

**Приёмка:** в демо-режиме `EditsService.create` вызывается 0 раз (e2e); сворачивание панели сохраняет состояние; Before/After работает мышью, touch и клавиатурой; экспорт из редактора даёт файл без EXIF; скриншоты 1440/1024/768/390.

### Stage 4 — Маркетинг, Pricing, SEO, Free tools, Auth, Settings
- Homepage со всеми секциями, Pricing, 7 SEO-страниц (тексты полноценные), Teams + waitlist.
- `/tools/background-remover` (выбор модели с коммерческой лицензией — зафиксировать в отчёте), `/tools/photo-editor`.
- 4 auth-экрана, Settings со всеми диалогами, Legal-заготовки.
- SEO-гигиена: метаданные, OG-картинки, `sitemap.xml`, `robots.txt`, canonical, JSON-LD (Organization, Product/Offer для тарифов, FAQPage).

**Приёмка:** визуально соответствует референсам на 1440 и 390 в обеих темах; free tools не отправляют изображения в сеть (e2e проверяет запросы); axe без critical/serious.

### Stage 5 — Полировка и QA
- axe по всем страницам; Lighthouse mobile на `/`, `/pricing`, `/headshots/linkedin`, `/tools/background-remover`: Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95.
- Итоговые скриншоты всех экранов × тем × ширин в `screenshots/final/`, таблица в `reports/stage-5.md`.

---

## Бэкенд (отдельные ТЗ на каждый этап)

| Этап | Суть |
|---|---|
| **B0 Бенчмарк (до всего бэкенда)** | на 10–15 согласившихся взрослых (включая разные возраст, пол, цвет кожи) сравнить 3–4 подхода через fal.ai: zero-shot edit-модели по 4–8 селфи против быстрой LoRA. Метрики: сходство (сервис сравнения лиц с коммерческой лицензией + слепая оценка людьми), доля брака, время, себестоимость кадра. Итог: выбор пайплайна, порог фильтра, окончательные цены M2–M4 |
| B1 Auth | Supabase Auth, email + Google, Resend SMTP, middleware, реальный `AuthService` |
| B2 Storage и данные | приватные бакеты, таблицы, RLS, signed URL, cron очистки (P8), письма-напоминания |
| B3 Генерация съёмки | очередь задач fal.ai + webhook, фильтр сходства и брака с добором, превью с водяным знаком, лимиты превью (аккаунт, IP, устройство) |
| B4 Кредиты и правки | ledger, атомарные reserve/charge/release (Postgres-функции), `EditsService` на fal.ai, модерация |
| B5 Lemon Squeezy | товары для тарифов и кредитов, overlay checkout, webhooks (`order_created`, `order_refunded`), правило возврата «до первого скачивания» |
| B6 Запуск | PostHog (воронка: лендинг → превью → покупка), Sentry, legal-тексты, финальный демо-набор, бренд и домен, Vercel production |
| Post-launch | Teams, расширение SEO-страниц, реферальная программа |

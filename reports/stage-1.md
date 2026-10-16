# Stage 1 — Фундамент: отчёт

Дата: 17.10.2026 · Коммит: `stage-1: foundation — tokens, mock services, layout shells, route stubs, dev tools`

## 1. Проверки (CLAUDE.md §7.1)

| Проверка | Результат |
|---|---|
| `npm run lint` | ✅ 0 ошибок, 0 предупреждений |
| `npm run typecheck` | ✅ (`next typegen && tsc --noEmit`, strict) |
| `npm test` (Vitest) | ✅ 5 файлов, 36 тестов |
| `npm run build` | ✅ Next.js 16.4.2 (Turbopack), 27 страниц |
| `npm run test:e2e` (Playwright, desktop 1440 + mobile 390) | ✅ 51 пройдено, 1 пропущен намеренно (sign-out только на desktop) |
| `npm run screenshots` | ✅ 96 скриншотов в `screenshots/stage-1/`, ни на одном нет горизонтального скролла |

## 2. Что сделано

**Каркас.** `create-next-app@16.4.2` (TypeScript, App Router, Tailwind v4, ESLint, `src/`, `@/*`) собран во временной папке, перенесён в корень, временная папка удалена, существующие файлы не тронуты. `git init`, `.gitignore` и первый коммит со scaffold и документами. Скрипты: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `screenshots`.

**Зависимости (§2).** next 16.4.2 / react 19.3, tailwindcss 4, `radix-ui` (основа shadcn), class-variance-authority, tailwind-merge, tw-animate-css, motion, lucide-react, next-themes, zustand, react-hook-form, zod, @hookform/resolvers. Для разработки: vitest + Testing Library + jsdom, @playwright/test.

**Токены и тема.** Все цвета из `01-design-system.md` §1 заданы CSS-переменными в `globals.css` и проброшены в Tailwind (`bg-surface`, `text-muted`, `border-border`…). Типографика §2 — утилиты `text-display/h1/h2/h3/body/small/overline/button`. Радиусы, тени (в Dark теней нет), фокус `2px var(--brand)`. Inter подключён через `next/font/local` (self-host, OFL). Тема: next-themes, `class`, по умолчанию Light, ключ `aps-theme`, без вспышки (e2e проверяет класс `dark` ещё до гидратации). Переключение — только цвета, 180 ms, фото не анимируются, `prefers-reduced-motion` учитывается (CSS + `MotionConfig reducedMotion="user"`).

**Конфиги (`src/config/`).** `brand.ts`, `packs.ts` (M2–M4, `quoteEdit`), `styles.ts` (12 стилей), `edit-tools.ts` (7 инструментов, категории и опции из 02-studio §3, пресеты кропа, форматы скачивания), `use-cases.ts` (7 SEO-страниц), `demo-manifest.ts` (как в 02-studio §5 + пары для hero и auth), `selfie-check.ts` (пороги и тексты причин).

**Сервисы (`src/services/`).** Типы по 05-backend-outline (дополнения помечены `// ext`), интерфейсы `AuthService`, `ShootsService`, `EditsService`, `CreditsService`, `BillingService`, `WaitlistService`, реестр `index.ts`. Mock: хранилище в localStorage, задержки, подписки (генерация съёмки по счётчику, превью, правки), идемпотентность правок, reserve/release кредитов, правило возврата M6, одно превью на аккаунт M5. Сценарии dev-панели: Guest / New user / Has shoot / Shoot generating / Preview used; ошибки: генерация, правка, блокировка модерацией.

**Компоненты (`01-design-system.md` §4).** `Button`, `Chip`, `SegmentedThemeToggle`, `CreditsPill`, `AccountMenu` (с подменю `My Shoots`), `Card/Panel`, `Tabs`, `ThumbTile`, `StatusBadge`, `BeforeAfter` (slider + diagonal), `Dropzone`, `ConfirmDialog`, `Logo` (собственный знак), `Stepper`, `SelfieTile`, `PackCard`, `ComparisonTable`, `Lightbox`, `Watermark`, `ProgressCount` + вспомогательные `Input/Label/FieldError`, `Checkbox`, `Tooltip`, `DropdownMenu`, `Dialog`, `Avatar`. Шапки: `MarketingHeader` (с мобильным меню), `AppHeader`, `Footer`.

**Маршруты (§6).** Все маршруты созданы: `/`, `/pricing`, `/headshots/[useCase]` (SSG ×7, метаданные), `/tools/*`, `/teams`, `/settings` (только для вошедших, гость → `/login?next=…`), `/privacy`, `/terms` (оглавление + `TODO(owner)`), 4 auth-экрана в общей раскладке с диагональной Before/After, `/shoot/new`, `/shoot/[id]` (живой счётчик генерации), `/studio`, `not-found`, `/credits → /pricing#credits`. Экраны следующих этапов помечены карточкой «Placeholder · built in Stage N» со списком того, что придёт.

**`/dev/ui`.** Все компоненты во всех вариантах, каждый блок в двух панелях — Light и Dark. Доступна в `next dev`; в production — 404 (проверено e2e). Для скриншотов production-сборка запускается с `NEXT_PUBLIC_ENABLE_DEV_TOOLS=1`.

**Playwright.** `playwright.config.ts` (e2e, desktop 1440 + mobile 390), `playwright.screenshots.config.ts` + `e2e/screenshots.spec.ts` (Light/Dark × 1440/390, Studio ещё 1024; сценарий и тема подставляются через localStorage; выход `screenshots/stage-$STAGE/`).

## 3. Приёмка (04-roadmap)

| Критерий | Статус |
|---|---|
| Все маршруты открываются в обеих темах | ✅ e2e по каждому маршруту + 96 скриншотов |
| Шапки соответствуют V2 для гостя и вошедшего | ✅ e2e: гость (Log In + `Get your headshots →`), вошедший (credits pill, avatar ▾, `New shoot`), меню аккаунта, `My Shoots` → переход в съёмку, App-шапка с `← Back to shoot` и `Buy credits` |
| Тема не мигает при перезагрузке | ✅ e2e фиксирует `html.dark` на `DOMContentLoaded`, до гидратации |
| `/dev/ui` по стилю совпадает с макетами | ✅ см. `screenshots/stage-1/dev-ui--*.png` и §4 ниже |

## 4. Сравнение с референсами

**Совпадает:** шапка и сегментный переключатель темы по Pricing; карточки тарифов (градиентная полоса, выделенная средняя карточка, градиентная кнопка); карточки Settings (иконка в мягкой плашке, заголовок, подзаголовок); плитки 4:5 с чек-бейджем и рамкой `--brand`; плашки Before/After и `Drag to compare` поверх фото; диагональная арт-панель auth со стрелкой в градиентном круге; тёмная тема по Retouch_Dark (поверхности, рамки без теней).

**Сознательные отличия:**
1. Состав шапки — по V2, а не по картинкам (у макетов разный набор пунктов).
2. В карточке Professional overline и бейдж совпадали бы (`MOST POPULAR` дважды), поэтому бейдж показывается только если отличается от overline. Выделение даёт градиентная полоса и рамка.
3. Логотип — собственный знак (искра в градиентном квадрате), без копирования чужого.
4. `My Shoots` — подменю в меню аватара (dropdown-список с миниатюрой, тарифом и датой), отдельной страницы нет.
5. В мобильной App-шапке переключатель темы перенесён в меню аватара: в 390 px он не помещается рядом с `‹ Shoot` и credits pill. В MarketingHeader на мобильном он в выезжающем меню.
6. Пока сессия mock загружается, место под блок входа в шапке занято скелетоном: шапка не «прыгает» и не показывает гостевые кнопки вошедшему.

## 5. Отклонения от плана и почему

- **Временная папка.** `create-next-app` не принимает имя `_scaffold` (npm запрещает подчёркивание в начале имени пакета), поэтому проект создан в `_scaffold/ai-photo-studio`. Итог тот же: перенесён в корень, `_scaffold` удалён.
- **shadcn/ui.** Реестр `ui.shadcn.com` недоступен из среды сборки, поэтому компоненты написаны вручную в стиле shadcn (`radix-ui` + cva + `cn`), только используемые. Лежит `components.json`, так что `npx shadcn add …` на твоей машине будет работать.
- **Шрифт.** Google Fonts недоступен из среды сборки, поэтому Inter подключён через `next/font/local` из файлов `@fontsource-variable/inter` (OFL, лицензия в `src/fonts/`). Это тот же `next/font` и без внешних запросов, что заодно лучше для приватности.
- **Cache Components.** Next 16.4 по умолчанию включает `cacheComponents` + `partialPrefetching`; оставил. Следствие: `dynamicParams` недоступен, неизвестный `/headshots/<slug>` отдаёт страницу 404 и `noindex` через `notFound()`, но первый on-demand рендер может прийти с HTTP 200 (стриминг). Если для SEO нужен строгий 404 — в Stage 4 добавлю проверку slug в `proxy.ts`.

## 6. Доступность

Семантика (landmarks, один H1 на странице, skip-link), видимый фокус, ARIA у слайдера Before/After (стрелки ±2, Shift ±10, Home/End), radiogroup у переключателя темы, Radix-диалоги и меню с ловушкой фокуса и Esc, касательные цели ≥ 40–48 px.

**Контраст — нужно решение владельца.** Проверка токенов по WCAG AA (4.5:1 для мелкого текста):
- `--brand #F25C54` на белом — 3.26, на `--brand-soft` — 2.95; `--success #12A37A` на `--success-soft` — 2.87; `--danger #E5484D` на белом — 3.91. **Сделано:** добавлены текстовые варианты `--brand-text #C8372F`, `--success-text #0B7A5A`, `--danger-text #C4363B`, `--warning-text #B54708` (все ≥ 4.7:1). Мелкий цветной текст использует их; в Dark они равны основным токенам. Палитра макетов не изменена.
- **Не исправлено (меняет утверждённый вид):** белый текст на градиенте основного CTA — 3.45 на `#F94471` и 2.47 на `#FE824C`. Для кнопки 14/600 это ниже AA. Варианты: затемнить правый конец градиента (например, `#E8663A`) или поднять кнопку до 18 px bold. Жду решения.
- `--text-muted` на `--bg` — 4.25 (чуть ниже 4.5); на `--surface` — 4.64, норма. Вторичный текст в основном стоит на карточках.

## 7. TODO(owner) и открытые вопросы

1. `brand.ts`: финальный домен и email поддержки.
2. Тексты `Tips` для инструментов Studio: в 02-studio упомянута карточка Tips, но текста нет.
3. `selfie-check.ts`: формулировка для пересвеченного селфи (`Too bright`) — в документах есть только `Too dark`.
4. Кредиты общие на аккаунт (ledger по `user_id`) или по съёмке (`Shoot.editCreditsLeft`, «30 edit credits left» на странице съёмки)? В mock баланс аккаунтный, а `editCreditsLeft` — копия на съёмке. Нужно решение до Stage 2.
5. Legal: тексты и дата `Last updated`.
6. Контраст основного CTA (см. §6).

## 8. Как запустить

```bash
npm install
npx playwright install chromium
npm run dev            # Dev-кнопка слева внизу переключает сценарии; /dev/ui — галерея
npm run test:e2e
npm run screenshots    # STAGE=2 для следующего этапа
```

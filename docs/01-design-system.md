# 01 — Дизайн-система

Характер: спокойный премиальный photo-SaaS. Много воздуха, фото — главный герой, тонкие рамки, мягкие тени, один акцентный градиент coral→orange. Light и Dark отличаются **только** цветовыми токенами: раскладка, подписи и логика одинаковые.

Значения ниже сняты пипеткой с утверждённых макетов и округлены. Задай их как CSS-переменные в `globals.css` (`@theme` Tailwind v4) и используй только через токены, без хардкода hex в компонентах.

## 1. Цвета

| Токен | Light | Dark | Где |
|---|---|---|---|
| `--bg` | `#F3F5F8` | `#0D131B` | фон страницы |
| `--surface` | `#FFFFFF` | `#18212B` | карточки, панели, шапка |
| `--surface-2` | `#F6F7F9` | `#1F2933` | инпуты, вложенные блоки, empty state |
| `--border` | `#E4E7EC` | `#2A3440` | тонкие рамки 1px |
| `--text` | `#1E2431` | `#EFF3F9` | основной текст |
| `--text-muted` | `#6B7588` | `#A3ADBB` | подписи, вторичный текст |
| `--brand-from` | `#F94471` | `#F94471` | начало градиента |
| `--brand-to` | `#FE824C` | `#FE824C` | конец градиента |
| `--brand` | `#F25C54` | `#FF6B63` | одноцветный акцент: активная вкладка, ссылки, рамка выбранной карточки |
| `--brand-soft` | `#FFF0EE` | `#34282F` | фон активного инструмента, мягкие плашки |
| `--success` | `#12A37A` | `#3FCF9F` | `DEMO MODE · 0 CREDITS`, «Ready», «+100» |
| `--success-soft` | `#E6F6F0` | `#173229` | фон бейджей success |
| `--danger` | `#E5484D` | `#FF6369` | Delete, ошибки, «−8» в ledger |
| `--warning-soft` | `#FFF4E8` | `#33281C` | `Price to be confirmed` |
| `--overlay-chip` | `rgba(17,24,39,.72)` | `rgba(17,24,39,.72)` | плашки поверх фото (Before/After, «Pre-generated demo example») |

`--cta-gradient: linear-gradient(100deg, #DB2F5C, #CF4A26)` — фон **кнопок с белым текстом** (контраст ≥ 4.5:1, решение V8); hover — на 6% светлее. `--brand-gradient: linear-gradient(100deg, var(--brand-from), var(--brand-to))` — яркий, **только декор без текста** (полоса тарифа, градиентное слово, логотип, ручка слайдера). Главный CTA на экране (Generate, Sign In, Select Creator Pack, Save changes, Buy Credits) и акцента в заголовке Pricing («Pay your way.»). Disabled-состояние основного CTA: тот же градиент с `opacity .35`, текст белый, курсор `not-allowed`.

## 2. Типографика (Inter)

| Роль | Размер / line-height / вес |
|---|---|
| Display (hero, Pricing H1) | 56/60, 800, letter-spacing −0.02em (mobile 36/40) |
| H1 страницы | 36/42, 800 |
| H2 секции | 28/34, 700 |
| H3 карточки / название инструмента в Studio | 22/28, 700 |
| Body | 15/24, 400 |
| Small / подписи | 13/18, 500 |
| Overline (`AI TOOLS`, `ACCOUNT / PREFERENCES`) | 11/16, 600, uppercase, letter-spacing .12em |
| Кнопка | 14/20, 600 |

## 3. Форма, отступы, тени

- Радиусы: карточки и панели `16px`; кнопки, инпуты, чипы `10px`; плитки миниатюр `12px`; pill-бейджи `999px`.
- Шаг отступов 4px. Внутренние отступы карточки 24px (mobile 16px); зазор между панелями Studio 16px.
- Тень карточки Light: `0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.04)`. В Dark теней нет, только `--border`.
- Высота кнопок: 40px (обычная), 48px (основной CTA внизу Studio и в формах). Касательные цели на mobile ≥ 44px.
- Фокус: `outline: 2px solid var(--brand); outline-offset: 2px` на всех интерактивных элементах.

## 4. Базовые компоненты (`src/components/ui/`)

| Компонент | Варианты / заметки |
|---|---|
| `Button` | `primary` (градиент), `secondary` (surface + border), `ghost`, `danger-outline`; размеры `md` и `lg`; `loading` со спиннером |
| `Chip` | выбранный: `--brand-soft` фон + `--brand` рамка и текст; обычный: surface + border |
| `SegmentedThemeToggle` | `☀ Light | ☾ Dark`, активный сегмент — surface с тенью |
| `CreditsPill` | точка `--brand-to` + `N credits`; ведёт на `/pricing#credits` |
| `AccountMenu` | аватар с инициалами на градиенте; меню: My Shoots (список съёмок), Studio, Account Settings, Buy credits, Sign out |
| `Card` / `Panel` | surface, border, radius 16 |
| `Tabs` | подчёркивание 2px `--brand` у активной; используется в правой панели и mobile sheet |
| `ThumbTile` | изображение 4:5, подпись снизу, выбранная: рамка 2px `--brand` + чек-бейдж в углу |
| `StatusBadge` | demo/success, info, warning, neutral |
| `BeforeAfter` | см. `02-studio.md` §5 |
| `Dropzone` | пунктирная рамка, иконка, заголовок, подсказка с форматами |
| `ConfirmDialog` | Radix Dialog, фокус на основной кнопке, Esc закрывает |
| `Logo` | знак (4-лучевая искра в градиентном скруглённом квадрате, как на макетах Studio) + wordmark из `brand.ts`. Нарисуй **свой** SVG-знак по мотивам, без копирования чужих логотипов |
| `Stepper` | шаги мастера: номер в круге, активный — градиент, пройденный — ✓ `--success`; на mobile — `Step 2 of 5` + полоса |
| `SelfieTile` | 1:1, статус-бейдж ✓ / ⚠ / ✕ в углу + причина под плиткой, кнопка удаления |
| `PackCard` | карточка тарифа по макету Pricing; вариант `highlighted` (градиентная полоса сверху + бейдж) |
| `ComparisonTable` | две колонки «Typical apps / Us», в нашей колонке галочки `--success`, на mobile — карточки |
| `Lightbox` | полноэкранный просмотр, стрелки, Esc, свайп, панель действий снизу |
| `Watermark` | диагональный повторяющийся текст `PREVIEW`, белый с opacity .35, поверх изображения |
| `ProgressCount` | `18 of 50 photos ready` + полоса прогресса по реальному счётчику |

Иконки только из lucide, outline, 18–20px. Инструменты Studio: Background `Image`, Outfit `Shirt`, Retouch `Wand2`, Relight `SunMedium`, Creative Style `Palette`, Place Me Here `MapPin`, Crop & Export `Crop`. Free tools: Background Remover `Eraser`, Photo Editor `SlidersHorizontal`.

## 5. Motion (Motion for React)

| Переход | Длительность | Easing |
|---|---|---|
| Правая панель 300 ↔ 48 px | 240 ms | `cubic-bezier(.22,.8,.25,1)` |
| Смена фото / demo-пары (crossfade) | 180 ms | ease-out |
| Demo ON ↔ OFF | 200 ms | ease-out |
| Контент вкладок | 160 ms | ease-out (fade) |
| Hover / pressed | 120 ms | ease-out |
| Появление карточки результата | 220 ms | ease-out (fade + 4px y) |
| Тема Light/Dark | 180 ms | только цвета; фото не анимируются |
| Bottom sheet (mobile) | 260 ms | spring без отскока (`bounce: 0`) |
| Перетаскивание Before/After | без анимации, разделитель строго следует за курсором |

Правила:
- `useReducedMotion()`: при `reduce` переходы мгновенные, функциональность та же.
- Никаких фейковых процентов прогресса и бесконечных декоративных анимаций.
- При смене картинки держи предыдущую, пока новая не декодируется (`img.decode()`), а соседние demo-ассеты предзагружай.
- Анимируй `transform` и `opacity`. Ширину правой панели — через grid-template-columns или `layout` у стабильного контейнера, проверив, что нет рывков.

## 6. Брейкпоинты

| Имя | Ширина | Studio |
|---|---|---|
| mobile | < 768 | горизонтальные плитки инструментов, bottom sheet |
| tablet | 768–1199 | левая колонка — только иконки (64px, подписи в tooltip), правая панель — overlay-drawer справа |
| desktop | ≥ 1200 | три колонки 220 / flex / 300 (48 в свёрнутом виде) |

Маркетинговые страницы: контейнер max-width 1200px, поля 24px (mobile 16px).

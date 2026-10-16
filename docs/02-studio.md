# 02 — Studio `/studio`: редактор кадра

Studio дорабатывает **один кадр** из съёмки: меняет фон, одежду, свет, ретушь, стиль, сцену, кадрирует и экспортирует. Вход — `/studio?photo=<shootPhotoId>` (кнопка `Edit in Studio` на странице съёмки). Без параметра Studio открывает последний редактированный кадр; если съёмок нет — **демо**.

Референсы (раскладка и стиль утверждены, состав инструментов — по этому документу):
- `design/references/studio/Demo_ON_Light.png` — основная раскладка;
- `Results_Light.png` / `Results_Dark.png` — **ближе всего к новой роли Studio**: ряд Background/Outfit/Lighting/Style, сетка результатов справа, `Generate Again`;
- `Collapsed_Light.png`, `Expanded_Light.png` — свёрнутая и открытая правая панель;
- `Retouch_Dark.png` — Dark;
- `mobile/Mobile_Layout.png` — mobile.

Прототип поведения: `design/prototypes/AI_Studio_Motion_Interactive.html`.

---

## 1. Раскладка desktop (≥ 1200px)

```
┌ App-шапка ────────────────────────────────────────────────────────────────────┐
│ [Logo]  ← Back to shoot         [● 30 credits] [Buy credits] [☀|☾] [avatar]   │
├──────────────┬──────────────────────────────────────────┬─────────────────────┤
│ LEFT 220     │ CENTER (flex)                            │ RIGHT 300 / 48      │
│ EDIT TOOLS   │ Background                [☑ Show Demo]  │ Options│Shoot│Edits │
│ ▸ Background │ Replace the backdrop, keep everything…    │                [‹]  │
│   Outfit     │ [All][Studio][Office][Outdoor][Custom]   │ heading + hint      │
│   Retouch    │ ┌──────────────────────────────────────┐ │ [tile] [tile]       │
│   Relight    │ │   BEFORE / AFTER                     │ │ [tile] [tile]       │
│   Creative ✦ │ │                                      │ │ …                   │
│   Place Me ✦ │ └──────────────────────────────────────┘ │                     │
│   Crop&Export│ [status] hint     [Compare][−100%+][↺][⤓]│ tips                │
│ credits card │ [1|2|4 variants]          [Generate · 2 credits] │                     │
└──────────────┴──────────────────────────────────────────┴─────────────────────┘
```

- Высота — `100dvh` минус шапка; колонки скроллятся независимо.
- Сетка `220px 1fr var(--right-w)`; `--right-w` = 300 ↔ 48. Свёрнутая панель отдаёт место только центру.
- `Show Demo Image` виден **только** у пользователя, у которого есть свои кадры (P6). У гостя и пользователя без съёмок Studio всегда в демо, вместо галочки — плашка `Example photo · Get your own headshots →`.

### 1.1 Левая колонка — инструменты правки
Overline `EDIT TOOLS`, пункты: иконка + название + цена справа мелким шрифтом (`1 cr`, `2 cr`, `Free`). Активный — `--brand-soft`.

Внизу карточка кредитов: `30 edit credits` · `Included with your Professional shoot` · ссылка `Buy more`. У гостя — `Edits are included with every shoot.` + `See pricing`.

### 1.2 Центр
1. Заголовок: название инструмента + подзаголовок; справа — галочка демо (если положена).
2. Ряд чипов — категории опций текущего инструмента (фильтр сетки Options справа). У инструментов без категорий ряд скрыт.
3. Превью — Before/After (§4): Before = исходный кадр съёмки, After = выбранная правка.
4. Строка под превью: статус-бейдж + подсказка; справа `Compare`, `− 100% +`, `Reset view`, `Download ▾` (те же форматы, что в лайтбоксе съёмки).
5. Нижняя панель: селектор вариантов `1 · 2 · 4` (кроме Crop & Export) и основной CTA.

### 1.3 Правая панель — вкладки `Options | Shoot | Edits`
- `‹` сворачивает до rail 48px (`›` + вертикальная подпись `OPTIONS & PHOTOS`). Вкладка, выбор и скролл сохраняются; содержимое скрывается, а не размонтируется. Если пользователь свернул панель вручную, она не открывается сама — при новых результатах на rail появляется точка-индикатор.
- **Options** — опции инструмента, 2 колонки (плитки 4:5 с превью или иконкой). Последняя плитка у Background/Creative Style/Place Me Here — `Custom` (поле описания или загрузка, §3). Внизу `Tips` по инструменту.
- **Shoot** — все кадры текущей съёмки (2 колонки, фильтр ★). Клик выбирает другой кадр для правки. Сверху — переключатель съёмки, если их несколько. Снизу ссылка `Open shoot page →`.
- **Edits** — результаты правок **текущего кадра**, новые сверху: статус `Generating / Ready / Failed`, выбранный — рамка и чек. Клик ставит результат в After. На карточке — `Download`, `★`. Пусто: `No edits yet` / `Pick an option and generate.`
- Все правки автоматически становятся кадрами съёмки (бейдж `Edited` на странице съёмки) и хранятся до её срока удаления.

---

## 2. Состояние (`src/features/studio/store.ts`)

```ts
type Mode = 'demo' | 'real'
type EditJobState = 'idle' | 'awaiting-confirmation' | 'generating' | 'completed' | 'failed' | 'insufficient-credits'

interface StudioState {
  mode: Mode                         // persist: только флаг
  tool: EditToolId
  category: string
  optionByTool: Record<EditToolId, string | 'custom'>
  customByTool: Record<EditToolId, { text?: string; sceneUploadId?: string }>
  variants: 1 | 2 | 4                // persist
  tab: 'options' | 'shoot' | 'edits'
  panel: 'open' | 'closed'; panelClosedByUser: boolean   // persist
  shootId?: string; photoId?: string // реальный кадр
  edits: EditResult[]                // для текущего кадра
  selectedEditId?: string
  job: { state: EditJobState; id?: string; error?: string }
  view: { compare: boolean; zoom: number; split: number }
  skipConfirm: boolean               // persist
}
```

| Событие | Результат | Запросы / кредиты |
|---|---|---|
| Открытие без съёмок | `mode=demo`, демо-кадр, первый инструмент | 0 / 0 |
| Открытие `?photo=id` | `mode=real`, кадр в превью, вкладка Options | загрузка кадра |
| Клик по инструменту или опции | demo: смена демо-пары; real: меняются параметры будущей правки | 0 / 0 |
| Generate (real) | `EditsService.quote` → модалка (M7) | 0 / 0 |
| Confirm, кредитов хватает | `EditsService.create(input, idempotencyKey)` → generating → результаты в Edits | 1 задача |
| Confirm, кредитов не хватает | alert `Not enough credits. This edit needs 4, you have 1.` + `Buy credits` | 0 / 0 |
| Правка упала или заблокирована | alert `We couldn't complete this edit. Your credits were returned.` + `Try again` | возврат |
| Crop & Export | всё локально, `Download` | 0 / 0 |
| Демо-галочка ON/OFF | переключает демо и свой кадр, ничего не теряя | 0 / 0 |

`idempotencyKey` создаётся при открытии модалки подтверждения.

---

## 3. Инструменты (`src/config/edit-tools.ts`)

Цена — **за вариант**. Цифры совпадают с M4.

| Инструмент | Цена | Категории → опции | Custom | Подзаголовок |
|---|---|---|---|---|
| **Background** | 1 | Studio (White, Light Gray, Charcoal, Gradient) · Office (Modern Office, Glass Meeting Room, Library) · Outdoor (City Bokeh, Park, Golden Hour) · Brand (Solid color — color picker) | текст до 300 символов | `Replace the backdrop, keep everything else.` |
| **Outfit** | 1 | Business (Navy Suit, Charcoal Suit, Blazer + Shirt) · Smart Casual (Knit Sweater, Oxford Shirt, Turtleneck) · Industry (Medical White Coat, Scrubs) | — | `Try a different outfit in seconds.` |
| **Retouch** | 1 | Subtle, Balanced; переключатели `Even skin tone`, `Reduce shine`, `Soften under-eyes` | — | `Natural touch-ups that keep you recognizable.` |
| **Relight** | 1 | Soft Studio, Window Light, Warm Golden, Dramatic Side | — | `Fix flat or harsh lighting.` |
| **Creative Style** ✦ | 2 | Editorial B&W, Cinematic, Magazine Cover (без текста), Color Studio, Film Look | текст до 300 символов | `Go beyond the corporate look.` |
| **Place Me Here** ✦ | 2 | Готовые сцены: Conference Stage, Coworking, Café, City Street, Bookshelf | загрузка своей сцены (`Scene Photo`) + поле `Describe placement` | `Put yourself into any place from a photo.` |
| **Crop & Export** | Free | — (§3.1) | — | `Crop, straighten and export — free and private.` |

✦ — «креативные» инструменты, на плитках бейдж `2 cr`.

### 3.1 Crop & Export (локально)
- Вместо чипов — панель `Crop · Rotate · Flip · Adjust`.
- Пресеты: Free, 1:1 (LinkedIn), 4:5, 3:4 (Resume), 16:9, 9:16, Circle.
- Поворот 90° и выравнивание ±45°, flip H/V, Brightness / Contrast / Saturation / Warmth, Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), Reset.
- Нижняя панель: формат `JPEG | PNG` и primary `Download` (`Free`).
- Canvas + `createImageBitmap`; экспорт — `OffscreenCanvas` в Worker, если поддерживается. Тот же движок используют `/tools/photo-editor` (`src/features/editor/` — общий модуль).

---

## 4. Before/After (`src/components/before-after/`)

- Два слоя одного размера, верхний режется `clip-path: inset(0 0 0 X%)`; вертикальный разделитель с ручкой `‹ ›`.
- Перетаскивание по всей площади; touch с `touch-action: pan-y`; во время drag — без анимаций.
- Ручка: `role="slider"`, `aria-valuenow`, `aria-label="Compare before and after"`; стрелки ±2, Shift ±10, Home/End.
- Zoom 50–300% и pan; оба слоя двигаются синхронно; `Reset view`.
- Плашки `Before`/`After` (или `Original`/`Edited`), подпись `Drag to compare`.
- Вариант `diagonal` — статичная диагональная раскладка для auth-панели и hero.

---

## 5. Демо

`src/config/demo-manifest.ts` + `public/demo/`:

```ts
export type DemoPair = { before: string; after: string; alt: string; aligned: boolean }
export const demoManifest = {
  shoot: {            // для Homepage и превью стилей съёмки: styleId → кадр
    'corporate-gray': '/demo/headshot/studio.webp',        // однотонный серый фон
    'minimal-beige':  '/demo/headshot/professional.webp',  // тёплый нейтральный фон
    'modern-office':  '/demo/headshot/office.webp',
    'city-bokeh':     '/demo/headshot/city.webp',
  },
  selfie: '/demo/headshot/before.webp',
  edits: {            // Studio-демо: tool → option → пара
    background: { 'modern-office': { before: '/demo/headshot/professional.webp', after: '/demo/headshot/office.webp', alt: '…', aligned: true },
                  'city-bokeh':    { before: '/demo/headshot/professional.webp', after: '/demo/headshot/city.webp',   alt: '…', aligned: true } },
    // остальные — пусто до генерации демо-набора → «Example not available yet»
  },
} as const
```

- 5 кадров в `public/demo/headshot/` (`before`, `professional`, `studio`, `office`, `city`) — одна синтетическая героиня, **выровнены по лицу** (1080×1350, 4:5), поэтому слайдер Before/After работает без «прыжков». Это кандидаты для разработки: финальный демо-набор заменит их файлами с теми же именами и новыми строками манифеста.
- Отсутствующая пара → карточка `Example not available yet` (без подделок и без вызовов).

---

## 6. Mobile (< 768px)

Референс — `design/references/mobile/Mobile_Layout.png` (композиция; состав инструментов — из этого документа).
- App-шапка компактная: Logo · `‹ Shoot` · credits pill · avatar.
- Горизонтальная лента плиток инструментов (scroll-snap), активная — рамка `--brand`, цена мелко под названием.
- Превью 4:5 на всю ширину, Before/After на touch.
- Под превью: статус и строка `Generate · 2 credits` (primary) + селектор вариантов компактно.
- Нижний таб-бар: `Tools · Options · Shoot · Edits`; кроме Tools, каждая вкладка открывает bottom sheet (~70% высоты, 2 колонки, закрывается свайпом, крестиком, Esc и тапом по фону; фокус уходит внутрь и возвращается обратно).
- Один store с desktop. `safe-area-inset-bottom`; клавиатура не перекрывает поле Custom.

## 7. Tablet (768–1199px)
Левая колонка 64px (иконки + tooltip), правая панель — overlay-drawer 320px по кнопке.

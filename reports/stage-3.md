# Stage 3 — Studio — отчёт

Дата: 17.10.2026 · Коммиты: `review(stage-2): …` (правки по ревью Stage 2) и `stage-3: studio editor, demo mode, crop & export`

## 0. Правки по ревью Stage 2 (отдельный первый коммит)

- **M6, возврат.** Теперь право на возврат заканчивает любое скачивание: любой формат, ZIP и экспорт из Crop & Export (добавлен формат `edited`). Перед первым скачиванием один раз показывается подтверждение `Downloading ends your refund eligibility. Continue?`. Оно стоит в лайтбоксе, в `Download all`, в карточках сетки, а теперь и в Studio (меню `Download`, Edits, Crop & Export). Общий хук — `src/features/shoot-page/use-refund-guard.tsx`.
- **Документы.** В первый коммит вошли версии `docs/00-decisions.md` и `docs/06-shoot-flow.md` с твоего диска, плюс две мои правки:
  - **в строке M6 в `00-decisions.md` на диске был старый текст** («до первого скачивания в полном размере»). Я записал новый по твоему ответу. Проверь формулировку;
  - «first full-size download» → «first download» в двух местах `03-pages.md` (FAQ, Our guarantee) и в одном месте `06-shoot-flow.md`.
  - ⚠️ В `CLAUDE.md` §1 (таблица отличий) всё ещё написано «полный возврат до первого скачивания в полном размере». Этот файл я не трогаю — поправь, пожалуйста, сам.
- **`/shoot/new`:** CTA `Get your headshots` / `Get started` из шапки убраны. Гость видит `Log In` с `next=/shoot/new`, на mobile тоже.
- **Шаг 3:** ссылка `Not quite you? Try different selfies` стала нейтральной (цвет `--text`). Подзаголовок: `Free previews in two styles. Your full set comes in 4K, without the watermark.`
- **`/licenses`** (ссылка в футере): Inter (OFL-1.1), MediaPipe Tasks Vision и модель BlazeFace (Apache-2.0), heic2any (MIT), libheif (LGPL-3.0, со ссылкой на исходники), fflate (MIT), idb-keyval (Apache-2.0). heic2any грузится только отдельным lazy-чанком, без модификаций.
- **npm audit — разбор:**
  - все 5 high — одна dev-цепочка: `eslint-config-next@16.4.2 → @next/eslint-plugin-next → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3` (ReDoS в braces, диапазон уязвимых версий `*`);
  - `npm audit --omit=dev` → **0 уязвимостей**, в runtime-бандл ничего из этого не попадает. Код линтера работает только локально и в CI над нашими же файлами;
  - безопасного обновления нет: npm предлагает только `--force` с откатом `eslint-config-next` до 14.x. Это мажорный даунгрейд и несовместимость с Next 16, поэтому я его не делал;
  - без мажорных скачков обновил `react` / `react-dom` 19.3.0 → 19.3.1 (patch). Остаток закроется, когда Next выпустит `@next/eslint-plugin-next` с новым `fast-glob`; до тех пор риск нулевой для продакшена.

## 1. Проверки (CLAUDE.md §7.1)

| Проверка | Результат |
|---|---|
| `npm run lint` | ✅ 0 ошибок и предупреждений |
| `npm run typecheck` | ✅ |
| `npm test` (Vitest) | ✅ 10 файлов, 78 тестов |
| `npm run build` | ✅ |
| `npm run test:e2e` (desktop 1440 + mobile 390) | ✅ 80 пройдено, 10 пропущено намеренно (тесты одного проекта — desktop-only или touch-only) |
| `npm run screenshots` (`STAGE=3`) | ✅ 156 скриншотов в `screenshots/stage-3/` (не в git); Studio — 1440 / 1024 / 768 / 390, Light и Dark |

## 2. Что сделано

### Раскладка (02-studio §1, §6, §7)
- **Desktop ≥ 1200:** сетка `220px · 1fr · 300px`. Правая панель сворачивается в rail 48 px (`›` и вертикальная подпись `OPTIONS & PHOTOS`), анимация колонок 240 мс `cubic-bezier(.22,.8,.25,1)` — как в прототипе. Свёрнутое содержимое не размонтируется (`invisible` + `inert`), поэтому вкладка, выбор и прокрутка сохраняются. Пока панель свёрнута, о новых результатах сообщает точка на rail.
- **Tablet 768–1199:** левая колонка 64 px с иконками и tooltip, правая панель — overlay-drawer 320 px по кнопке `Options & photos`.
- **Mobile < 768:** лента инструментов со scroll-snap и ценой мелко, превью 4:5 на всю ширину, под ним статус, селектор вариантов и `Generate`. Нижний таб-бар `Tools · Options · Shoot · Edits`; каждая вкладка, кроме Tools, открывает bottom sheet на 72dvh. Он закрывается свайпом за ручку или шапку, крестиком, Esc и тапом по фону; фокус уходит внутрь и возвращается на кнопку таб-бара. Чипы категорий на mobile перенесены в sheet Options. `safe-area-inset-bottom`; `interactive-widget=resizes-content` и прокрутка поля Custom в видимую область, чтобы клавиатура его не перекрывала.
- Один zustand-store (`src/features/studio/store.ts`, persist `aps.studio`) на все три раскладки. Сохраняются только флаг демо, варианты, состояние панели, `Don't ask again` и последний открытый кадр.

### Инструменты и опции (02-studio §3)
- 7 инструментов из `edit-tools.ts`: цена за вариант справа, у креативных бейдж `2 cr`. Внизу левой колонки карточка `N edit credits available · Credits never expire · Buy more`; у гостя — `Edits are included with every shoot.`
- **Options:** плитки 4:5 в 2 колонки (демо-кадр или иконка), чипы категорий (`All` + категории + `Custom`), Tips по инструменту.
  - **Custom:** у Background и Creative Style — поле до 300 символов со счётчиком.
  - **Place Me Here:** загрузка своей сцены (`Scene Photo`, файл остаётся в браузере, в input уходит `sceneUploadId`) и поле `Describe placement`.
  - **Brand → Solid color:** color picker.
  - **Retouch:** Subtle / Balanced и три переключателя.
- **Селектор вариантов** 1 / 2 / 4 (radiogroup), цена на CTA пересчитывается: `Generate · N credits`.
- **Shoot:** кадры текущей съёмки (2 колонки, фильтр ★), переключатель съёмки, если их несколько, `Open shoot page →`.
- **Edits:** результаты текущего кадра, новые сверху. Есть статусы Generating (скелетоны) / Ready / Failed; выбранный результат — рамка и чек, клик ставит его в After; на карточке `★` и `Download`. Пустое состояние — `No edits yet` / `Pick an option and generate.`

### Генерация (M7, §2)
`Generate · N credits` → модалка `Generate N variants?` с ценой и балансом. `Don't ask again` есть только при N ≤ 6, выше 6 модалка показывается всегда. Ключ идемпотентности создаётся при открытии модалки, `EditsService.create` вызывается только по подтверждению.

| Ситуация | Что видит пользователь |
|---|---|
| Идёт генерация | бейдж `Generating`, скелетоны в Edits |
| Готово | результат в After, вкладка Edits; если панель свёрнута пользователем — точка вместо открытия |
| Не хватает кредитов | `Not enough credits. This edit needs X, you have Y.` + `Buy credits`; запрос не отправляется |
| Ошибка или блокировка | `We couldn't complete this edit. Your credits were returned.` + `Try again` |

### Before/After (§4)
`clip-path`-слой, ручка `role="slider"`: стрелки ±2, Shift ±10, Home/End. Перетаскивание по всей площади мышью и touch (`touch-action: pan-y`). Zoom 50–300% с шагом 25 и pan перетаскиванием при zoom > 1; оба слоя двигаются синхронно, есть `Reset view`. Переключатель `Compare` (выкл — только After). Плашки `Original` / `Edited` (в демо — `Before` / `After`).

### Демо (§5, CLAUDE.md §3.4)
- Гость, пользователь без готовых съёмок или галочка `Show Demo Image` → демо-режим.
- Пары берутся только из `demo-manifest`; для отсутствующей пары показывается `Example not available yet`. Плашка `Example · prepared in advance`, бейдж `Demo mode · 0 credits`.
- CTA заблокирована: `Generate — unavailable in demo` и подпись `Prepared example · No AI request · No credits`.
- Структурная изоляция: `studio/demo.ts` импортирует только манифест и конфиг инструментов, это проверяет unit-тест `demo-isolation`. Генерация в демо физически недоступна: `useGenerate` получает `photo = null`.

### Crop & Export — общий модуль `src/features/editor/`
- `engine.ts` (чистые функции: пресеты, кроп, поворот, выравнивание, flip, adjust, history), `render.ts` (canvas), `export.ts` + `export.worker.ts` (OffscreenCanvas в Worker; если не поддерживается — main thread), `use-editor.ts`, `crop-editor.tsx` (UI).
- Панели `Crop · Rotate · Flip · Adjust`. Пресеты Free, 1:1 (LinkedIn), 4:5, 3:4 (Resume), 16:9, 9:16, Circle (PNG с маской). Поворот 90°, выравнивание ±45°, Brightness / Contrast / Saturation / Warmth, Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), Reset. `JPEG | PNG` и `Download · Free`.
- Экспорт заново кодирует пиксели, EXIF и GPS не переносятся (проверено e2e по байтам файла). Максимальная сторона — 4096 px.
- На реальном кадре экспорт засчитывается как скачивание (M6) и идёт через то же подтверждение.
- `/tools/photo-editor` подключит этот же модуль в Stage 4.

## 3. Приёмка (04-roadmap)

| Критерий | Статус |
|---|---|
| В демо-режиме `EditsService.create` вызывается 0 раз | ✅ e2e (desktop + mobile): перебор инструментов и опций, CTA disabled; в mock-БД `editJobs` и `ledger` пустые. Плюс unit-тест изоляции импортов |
| Сворачивание панели сохраняет состояние | ✅ e2e: вкладка Shoot, прокрутка списка (scrollTop) и выбор переживают collapse/expand; после reload панель остаётся свёрнутой. Плюс unit-тесты store |
| Before/After: мышь, touch, клавиатура | ✅ e2e: клавиатура (стрелки, Shift, End), drag мышью, tap на touch-устройстве (Pixel 7), zoom с синхронными слоями и Reset |
| Экспорт из редактора без EXIF | ✅ e2e: скачанный JPEG начинается с SOI, в файле нет `Exif` и `GPS` |
| Скриншоты 1440/1024/768/390 | ✅ все экраны Studio, Light и Dark |

Дополнительно e2e проверяет: подтверждение → генерация → результат в Edits и списание 2 кредитов; нехватку кредитов (модалка без `Don't ask again` при 8 кредитах, alert, ноль запросов); возврат кредитов при ошибке правки; подтверждение M6 при скачивании из Studio; bottom sheet (Esc и возврат фокуса).

## 4. Сравнение с референсами

| Референс | Что взято | Сознательные отличия |
|---|---|---|
| `Demo_ON_Light` | пропорции колонок, левое меню, заголовок + подзаголовок, ряд чипов, превью с плашками, статус-строка, CTA снизу, правая панель с плитками 2×N и Tips | инструменты, вкладки и checkbox по V5 и 02-studio; без `Upload My Photos` и `DESIGN PREVIEW` |
| `Expanded` / `Collapsed_Light` | rail 48 px с вертикальной подписью, плашки в углах, `Reset view` над CTA | `How it works` не добавлял: его нет в 02-studio |
| `Retouch_Dark` | Dark-палитра, активный инструмент, кнопка `‹` у вкладок | — |
| `Results_Light/Dark` | роль редактора: Compare, zoom, Reset, Download, Edits со статусами | без `Save for Later` (хранение 30 дней автоматически), без `Dashboard` / `Settings` в сайдбаре и хлебных крошек — вместо них `← Back to shoot` в шапке; карточку `Want another look? / Generate Again` заменяет постоянная CTA `Generate` |
| `Mobile_Layout` | лента инструментов, крупное превью, таб-бар, bottom sheet с вкладками и сеткой 2 колонки | названия по 02-studio §6; без Upload. На 390 px кнопка `Generate` оказывается ниже первого экрана — превью 4:5 на всю ширину занимает почти весь экран (как в макете) |

## 5. Технические решения и отклонения

- **Демо-кадры для остальных опций** не нарисованы (в манифесте только Modern Office и City Bokeh), поэтому там честное `Example not available yet`, а на плитках — иконки. Финальный демо-набор — за владельцем.
- **На mobile чипы категорий** живут в sheet Options, а не над превью: иначе превью и CTA уезжают ещё ниже.
- **Скачивание в Studio** использует те же форматы и запись в ledger скачиваний, что и страница съёмки.
- **App-шапка на 768–1023 px** не помещалась: `Buy credits` и переключатель темы обрезались. Ниже 1024 px `Buy credits` скрыта (её дублирует credits pill), а тема переехала в меню аккаунта, как на mobile.
- **Генерация в mock** — `EditsService` со сценариями `failEdit` / `blockEdit` из dev-панели; результаты — копии демо-кадров.

## 6. TODO(owner) / открытые вопросы

1. **Модель детектора лиц:** перед запуском заменить `public/models/face_detector_short_range.tflite` (собран из npm-пакета `@mediapipe/face_detection` скриптом `scripts/build-face-model.py`) на официальный файл MediaPipe `blaze_face_short_range.tflite`. Имя файла и путь можно оставить.
2. `CLAUDE.md` §1 — формулировка возврата (см. §0).
3. Демо-набор для остальных инструментов и опций (`demo-manifest.ts`, `public/demo/`).
4. Строка M6 в `00-decisions.md` — проверь мою формулировку.

## 7. Как проверить руками

```bash
npm install && npm run dev
# Guest → /studio — демо: перебери инструменты, Before/After, Crop & Export
# Dev-панель: Has shoot → /studio?photo=shoot_pro_1017_p001 → Generate · 2 credits
# Dev-панель: failEdit — возврат кредитов; ширины 1024/768/390 — tablet и mobile
```

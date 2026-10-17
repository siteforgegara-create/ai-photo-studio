# 06 — Съёмка: мастер `/shoot/new` и страница `/shoot/[id]`

Главный денежный путь продукта. Макетов нет: строй в дизайн-системе, опираясь на Studio (карточки, чипы, плитки 4:5), Pricing (карточки тарифов) и Settings (спокойные секции). Шапка — **App-шапка** (V2).

---

## 0. Каталог стилей съёмки (`src/config/styles.ts`)

12 стилей; у каждого есть `id`, `name`, `category`, `description`, `previewImage?` и `promptKey` (заполнит бэкенд).

| id | Name | Category |
|---|---|---|
| `corporate-gray` | Corporate Gray | Corporate |
| `studio-white` | Studio White | Studio |
| `studio-charcoal` | Executive Charcoal | Studio |
| `modern-office` | Modern Office | Office |
| `glass-meeting-room` | Glass Meeting Room | Office |
| `warm-library` | Warm Library | Office |
| `city-bokeh` | City Bokeh | Outdoor |
| `outdoor-park` | Park Greenery | Outdoor |
| `golden-hour` | Golden Hour | Outdoor |
| `minimal-beige` | Minimal Beige | Studio |
| `tech-startup` | Startup Casual | Casual |
| `creative-color` | Creative Color | Creative |

Демо-кадры сейчас есть для `corporate-gray`, `minimal-beige`, `modern-office`, `city-bokeh` (`demo-manifest.ts`). Остальные — нейтральные плитки до генерации демо-набора.

---

## 1. Мастер `/shoot/new`

Доступ: гость может пройти шаг 1 (селфи проверяются локально, никуда не загружаются). Перед шагом 3 нужен вход: модалка `Create a free account to see your previews` → signup/login → возврат в мастер **с сохранёнными селфи** (держи их в IndexedDB до загрузки; после входа — `ShootsService.uploadSelfie`).

Вверху — степпер: `1 Selfies · 2 Your look · 3 Free preview · 4 Package · 5 Done`. Можно вернуться назад; данные шагов не теряются. Состояние мастера — zustand + persist **без самих файлов** (файлы — в IndexedDB).

### Шаг 1 — Selfies
- H1 `Upload 4–8 selfies`, подзаголовок `Different angles and lighting help us capture the real you.`
- Слева большая дропзона (drag & drop, выбор файлов, на mobile — галерея или камера). Справа карточка подсказок с двумя колонками мини-иллюстраций **Good** (лицо крупно, разные ракурсы, дневной свет, без очков) и **Avoid** (групповые фото, тёмные очки, сильные фильтры, лицо закрыто). Иллюстрации — схематичные SVG, не фото людей.
- Загруженные селфи — сетка плиток 1:1 со статусом:
  - ✓ `Looks great`
  - ⚠ `Slightly blurry` / `Face is small — crop closer` / `Too dark` / `Very similar to another photo` — можно оставить;
  - ✕ `No face found` / `More than one person` — не учитывается.
  
  Кнопка удаления на каждой плитке.
- **Проверка в браузере** (`src/features/selfie-check/`):
  - лицо — `@mediapipe/tasks-vision` Face Detector (Apache-2.0, динамический импорт): число лиц, bbox → доля лица в кадре;
  - резкость — дисперсия Лапласиана на области лица (canvas);
  - освещённость — средняя яркость области лица;
  - дубликаты — perceptual hash (dHash) между селфи;
  - пороги — в `src/config/selfie-check.ts`, покрыты unit-тестами на синтетических данных.
- Счётчик `3 of 4 required` + индикатор качества набора: `Good set` / `Add 1 more photo`. Кнопка `Continue` активна при ≥ 4 ✓ (⚠ считается). Максимум 8 файлов.
- Внизу согласие (P2) — обязательный чекбокс.

### Шаг 2 — Your look
- **Outfit**: 5 карточек с иконками — Keep my outfit / Suit / Blazer / Smart casual / Let us choose.
- **Glasses**: сегмент Keep / Remove (показывать, только если очки есть хотя бы на одном селфи — на mock-этапе показывать всегда).
- **Preview styles**: выбери 2 стиля для бесплатного превью (сетка 12 стилей из `styles.ts`, плитки 4:5 с демо-картинкой стиля или нейтральной заглушкой). Выбранные — рамка `--brand` и номер 1/2.
- Кнопка `See my free previews →`. Если превью уже использовано — `Continue to packages →` и пометка `You've already used your free preview.`

### Шаг 3 — Free preview
- Состояние генерации: 4 скелетона 4:5 с мягким шиммером, текст `Creating your previews…` и `This usually takes a few minutes. We'll also email you.` — **без процентов**, обновление статуса через `ShootsService.subscribe`.
- Готово: 4 кадра (по 2 на стиль) 512px с диагональным водяным знаком `PREVIEW` поверх (водяной знак уже «впечён» в изображение на сервере, в mock — CSS-оверлей). Клик → лайтбокс без возможности скачать.
- Под превью — блок «как будет в пакете»: `Full set: up to 100 photos · 4K · no watermark · every photo checked for likeness`.
- Если результат не понравился: ссылка `Not quite you? Try different selfies` (назад на шаг 1; повторное превью недоступно — объясни это честно: `Your free preview has been used, but packages are fully refundable until your first full-size download.`).
- Кнопка `Choose a package →`.

### Шаг 4 — Package
- Три карточки тарифов из `packs.ts`, вёрстка как на макете Pricing (средняя выделена: градиентная полоса и бейдж `MOST POPULAR`). В каждой: количество кадров, стилей, кредитов на правки, `4K · Commercial license · Likeness check`, цена.
- Под карточками — выбор стилей: столько, сколько даёт тариф (для Executive — все, выбор скрыт). Стили превью уже отмечены.
- Сводка справа (на mobile — внизу sticky): тариф, стили, цена, строка гарантии `Full refund until your first full-size download.` Кнопка `Continue to secure checkout →`.
- Mock: `BillingService.startCheckout` возвращает URL заглушки `/shoot/new?checkout=success&shoot=<id>`, затем шаг 5. Позже — Lemon Squeezy overlay checkout.

### Шаг 5 — Done / Generating
- `Your shoot is in progress` + иллюстрация, прогресс в реальных единицах: `18 of 50 photos ready` (из `subscribe`), без процентов и таймеров.
- `We'll email you when your headshots are ready — you can close this page.`
- Кнопка `Open my shoot` → `/shoot/[id]` (страница показывает кадры по мере готовности).

---

## 2. Страница съёмки `/shoot/[id]`

Только для владельца; чужой id → 404.

**Шапка страницы**
- Overline `MY SHOOT`, H1 `Professional · Oct 17, 2026` (имя тарифа и дата), строка `50 photos · 5 styles` + справа от неё `30 edit credits available` (баланс аккаунта).
- Справа: `Download all (ZIP)` (secondary), меню `⋯` (`Delete now`, `Rename shoot`).
- Плашка-срок: `Photos are stored until Nov 16, 2026. Download your favorites before then.`
- Если идёт генерация — баннер `Generating… 18 of 50 ready` и плейсхолдеры в сетке.

**Фильтры**: чипы `All · ★ Favorites · <стиль 1> · <стиль 2> …` + переключатель размера плиток (S/L) на desktop.

**Сетка**: плитки 4:5, 4–5 колонок на desktop, 2 — на mobile. При наведении — ☆ (избранное), ⤓ (скачать), ✎ (`Edit in Studio`). Правки (производные кадры) — в той же сетке с бейджем `Edited`, рядом с исходным кадром.

**Лайтбокс** (клик по плитке): большое фото, стрелки ← → (и клавиатура), снизу:
- `Download` ▾ — `Original 4K (JPG)`, `LinkedIn (1:1, 1080px)`, `Resume (3:4)`, `Round avatar (PNG)`, `Website (16:9 with space)`. Кадрирование — на клиенте (canvas) от центра лица; детекция лица — тем же модулем, что и в selfie-check.
- `★ Favorite`, `Edit in Studio →` (`/studio?photo=<id>`).

**Гарантия**: до первого полноразмерного скачивания — плашка `Not happy? Request a full refund` → диалог (причина — необязательный select; mock: `refundEligibility` → `Refund requested`). После скачивания плашка исчезает.

**Мои съёмки**: пункт `My Shoots` в меню аватара открывает dropdown-список (тариф, дата, превью-миниатюра) со ссылками на `/shoot/[id]`. Отдельной страницы-списка нет.

---

## 3. Тексты-ограничители (обязательно)

- Нигде не обещать время готовности, процент сходства, количество довольных клиентов.
- `Every photo is checked for likeness` — допустимо (это функция системы).
- Цены тарифов съёмки ($29 / $49 / $79) показываются из `packs.ts`. У пакетов кредитов `price: null` → `Price to be confirmed`. Реальной оплаты на фронтенд-этапах нет: checkout — mock, который сразу возвращает успех.

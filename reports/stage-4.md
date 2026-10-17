# Stage 4 — Маркетинг, Pricing, SEO, Free tools, Auth, Settings — отчёт

Дата: 17.10.2026 · Коммиты: `review(stage-3): …` (правки по ревью Stage 3) и `stage-4: marketing, SEO pages, free tools, auth recovery, settings`

## 0. Правки по ревью Stage 3 (отдельный первый коммит)

- **Mobile Studio (< 768):** селектор вариантов и `Generate · N credits` закреплены над таб-баром с учётом `safe-area-inset-bottom`. В демо кнопка заблокирована, текст `Unavailable in demo`, под ней строка `Prepared example · No AI request · No credits`.
- **Превью не обрезается.** Рамка 4:5 — это самый большой прямоугольник 4:5, который помещается в оставшееся место. Размер считается через container queries: `w-[min(100cqw,80cqh)]`. Фото выводятся с `object-fit: contain`, так что ничего не обрезается ни на одной ширине.
- **Строки на mobile стали компактнее:**
  - статус: бейдж `Demo` и кнопки-иконки Compare / Reset / Download с подписями для скринридеров;
  - заголовок: ссылка `Get your own` в одну строку с названием инструмента.
- **Crop & Export на mobile** не помещается в один экран со своей панелью, поэтому прокручивается как прежде. Download находится в самом редакторе.
- **e2e на 390×844 и 360×740, демо и реальный кадр.** Тест проверяет, что:
  - панель видна без прокрутки и стоит над таб-баром;
  - рамка превью целиком между шапкой и панелью и сохраняет пропорцию 4:5;
  - у изображения `object-fit: contain`;
  - ручка Before/After не перекрыта, а тап по превью двигает её.
- **`CLAUDE.md` §1:** в коммит вошла твоя версия с диска.
- **Скриншоты `screenshots/stage-3/`:** 156 файлов записаны на твой диск в `C:\Projects\AI-Studio_claude\screenshots\stage-3\`.

## 1. Проверки (CLAUDE.md §7.1)

| Проверка | Результат |
|---|---|
| `npm run lint` | ✅ 0 ошибок и предупреждений |
| `npm run typecheck` | ✅ |
| `npm test` (Vitest) | ✅ 10 файлов, 81 тест |
| `npm run build` | ✅ |
| `npm run test:e2e` (desktop 1440 + mobile 390) | ✅ 190 пройдено, 14 пропущено намеренно (тесты одного проекта — desktop-only или touch-only); сюда входят axe-тесты и новый `e2e/stage4.spec.ts` |
| `npm run screenshots` (`STAGE=4`) | ✅ 224 скриншота: каждая страница в Light/Dark × 1440/390, Studio ещё 1024/768; без горизонтального скролла. Записаны на твой диск в `screenshots/stage-4/` |
| `npm audit` | 5 high — та же dev-цепочка `eslint-config-next`, вопрос закрыт; `--omit=dev` → 0 |

## 2. Что сделано

### Homepage `/` (03-pages §1)
Все 11 секций идут в порядке документа.
- **Hero.** Before/After и лента из 4 стилей. Клик по стилю меняет After и подпись, на кадре плашка `Example`.
- **Why it's different.** Сравнение с «Typical AI headshot apps», названий конкурентов нет.
- **How it works.** 4 шага.
- **Examples.** 12 стилей: где есть демо-кадр — фото, где нет — `Example coming soon`. Блок «одна героиня — разные стили» и подпись `Examples are AI-generated from a synthetic model.`
- **Edits included.** Мини-демо Studio. Пара есть только для Background; остальные кнопки `aria-disabled` с подсказкой `Example coming soon`. Демо-код не импортирует сервисы, это проверяет unit-тест.
- **Benefits.** По `Benefits.png`, с нашими текстами.
- **Pricing teaser, Use cases, Free tools, FAQ** (9 вопросов, + FAQPage JSON-LD) и финальная CTA-карточка.

### Pricing (03-pages §2)
- Hero и 3 тарифа.
- **Compare plans** — таблица с `th scope`, на mobile прокручивается по горизонтали.
- **Edit credits.**
  - Гость нажимает `Buy` и попадает на `/login?next=/pricing#credits`.
  - У вошедшего: `BillingService.startCheckout`, затем возврат `?checkout=success&ref=…`, затем `BillingService.confirmCreditPurchase(ref)` — новый метод. Он идемпотентен, так что перезагрузка не начисляет кредиты второй раз.
  - Показываются сообщение `N credits added to your balance.` и текущий баланс.
- **Our guarantee**, плашка Teams, mini-FAQ из 4 вопросов про оплату и возвраты. Product/Offer JSON-LD.

### SEO-страницы `/headshots/[useCase]` (03-pages §3)
- **7 страниц с полными текстами** (`use-cases.ts`): 419–475 слов на страницу без учёта общих блоков.
- **Структура:** hero с CTA `/shoot/new?useCase=…`, вступление, «What makes a good … headshot», 4 практических совета, рекомендованные стили, How it works, 4 FAQ, финальный CTA.
- **Unit-тест проверяет:**
  - ≥ 400 слов на каждой странице;
  - 3–5 советов и 3–4 FAQ;
  - отсутствие процентов, «N users», рейтингов и времени генерации.
- Все утверждения о продукте взяты из 00-decisions. Единственные внешние факты — размеры LinkedIn (400×400, баннер 1584×396), со ссылкой на то, что платформы их меняют.
- **Строгий 404.** `src/proxy.ts` проверяет slug до рендера, и неизвестный `/headshots/<slug>` получает HTTP 404. Внутри страницы `notFound()` не помог бы: она отдаётся через Partial Prerender, и статус 200 уходит раньше. e2e проверяет `/headshots/astronauts`, `/headshots/linkedin-extra` и `/headshots`.
- FAQPage и BreadcrumbList JSON-LD, свой OG-image для каждой страницы.

### Free tools
#### `/tools/background-remover` — выбор модели (03-pages §4.1)

| Кандидат | Лицензия весов | Итог |
|---|---|---|
| **MODNet** (photographic portrait matting) | **Apache-2.0**, явно для кода *и моделей*: «The code, models, and demos in this repository … are released under the Apache License 2.0» ([ZHKKKe/MODNet](https://github.com/ZHKKKe/MODNet)) | ✅ **выбран** |
| BiRefNet-lite (MIT) | MIT | ❌ ONNX на вход 1024×1024 требует больше 6 GB памяти на CPU (в контейнере его убил OOM). В WASM браузера, где потолок 4 GB, он не запустится, а WebGPU здесь не проверить. Ещё 115 MB fp16 на загрузку |
| IS-Net general use | Apache-2.0 только на код; про веса в README ничего, датасет DIS5K со своими условиями | ❌ лицензия весов не ясна |
| U²-Net / u2netp | Apache-2.0 | запасной вариант: 4.5 MB, работает с любыми объектами, но края грубее |
| MediaPipe Selfie Segmenter | Apache-2.0 | ❌ маска 256 px, заметно хуже на волосах |
| `@imgly/background-removal`, RMBG-1.4/2.0 | AGPL / некоммерческие | ❌ запрещены документом |

- **Сборка модели:** `scripts/build-bg-model.py`. ONNX-экспорт MODNet взят из npm `@rmbg/model-modnet@0.0.1` (sha256 склейки `07c308cf…84df9`). Веса переведены во float16 с Cast обратно во float32, поэтому файл 13 MB, а расхождение с float32 на реальном фото не больше 0.002 (среднее 2·10⁻⁵). Результат — `public/models/modnet-portrait.onnx` (в git).
- **Как работает в браузере:**
  - **ONNX Runtime Web** (MIT), WASM, один поток, в Web Worker. Рантайм копируется в `public/vendor/ort` на postinstall, как MediaPipe, так что сторонних CDN нет;
  - модель скачивается один раз, кэшируется в Cache Storage, прогресс показывается как `Loading the AI model (one-time, ~13 MB)… N of 13 MB`;
  - сам цикл в контейнере (headless Chromium, без GPU) — около 3.5 с с загрузкой модели.
- **Результат:**
  - Before/After на шахматной подложке; фоны Transparent / White / Color (палитра) / Blur original;
  - `Download PNG` сохраняет альфа-канал (e2e проверяет RGBA в IHDR), `Download JPG` при Transparent кладёт результат на белый;
  - после результата — CTA из P7 `Want a studio-quality headshot? Get free previews →`.
- ⚠️ **Подзаголовок изменён.** MODNet обучен на людях, поэтому вместо «any photo» написано `Remove the background from portraits and photos of people — right in your browser. Nothing is uploaded.` Так же сформулированы подсказка в дропзоне и FAQ. Если нужен инструмент для любых объектов, следующий шаг — BiRefNet-lite через WebGPU с MODNet как фолбэком. Решение за тобой.
- **Лицензии** MODNet и ONNX Runtime Web добавлены на `/licenses`.

#### `/tools/photo-editor` (03-pages §4.2)
- Тот же модуль `src/features/editor/` (CropEditor), что и Crop & Export в Studio.
- **Пресеты:** Free, 1:1, 4:5, 16:9, `LinkedIn / X photo 400×400`, `LinkedIn banner 1584×396`, `Instagram 1080×1350`, `Passport-style 600×600` (в FAQ сказано, что соответствие официальным требованиям не обещаем), Circle.
- Экспорт идёт ровно в размер пресета, без EXIF (e2e проверяет размер в SOF и отсутствие `Exif`).

#### Проверка «ничего не уходит в сеть» (e2e)
На обеих страницах тест собирает все запросы после загрузки файла: любой не-GET/HEAD, любой GET с телом, любой запрос не на наш origin. Ожидается пустой список, и он пустой.

### Teams
H1, 3 преимущества, `Coming soon`, форма waitlist (work email + размер команды, zod, ошибки под полями) → `WaitlistService.join` → `Thanks! We'll let you know when Teams launches.` Без цен и сроков.

### Auth
- **Forgot.** При любом email показывается одно и то же сообщение, даже если запрос упал.
- **Reset.** Токен берётся из `?token=`. Живые проверки `8+ characters` / `Passwords match` (с текстом для скринридеров), ошибка несовпадения, состояние `Password updated`, состояние `This reset link has expired.` + `Request a new link` (mock: `?token=expired`).
- **Login и Sign Up** были готовы с Stage 2.

### Settings — все диалоги (03-pages §6)
- **My Account:**
  - аватар и способ входа;
  - имя — форма с валидацией, `Save changes` активна только при изменениях;
  - email только для чтения;
  - `Change password` — диалог с текущим, новым паролем и подтверждением (`AuthService.changePassword`). У Google-аккаунта вместо кнопки пояснение.
- **Privacy & Data:**
  - строки Selfies `Auto`, Headshots & edits с меню `Manage shoots ↗` (список съёмок), Free tools `Local`;
  - внизу `No public gallery…` и `Delete all my photos` с диалогом (`ShootsService.deleteAllPhotos`, кредиты остаются по M8).
- **Credits & Activity:** баланс, `Buy credits →`, `How credits work`, таблица ledger (дата / действие / ±) и пустое состояние.
- **Delete Account:** диалог, кнопка активна только после ввода `DELETE` (`AuthService.deleteAccount`), затем переход на главную. Чтобы guard не перебрасывал на `/login`, в session store добавлен флаг `leftOnPurpose`; тот же флаг теперь закрывает старую гонку при `Sign out` на защищённых страницах.

### Legal
`/privacy` и `/terms` — структура из 03 §8 с видимой плашкой `Draft`. В каждом разделе перечислены решённые факты из 00-decisions (P1, P4, P8, P9, M6…), а сам юридический текст помечен `TODO(owner)`. Дата `Last updated` тоже `TODO(owner)`.

### SEO-гигиена
- **Метаданные:** уникальные title и description, `alternates.canonical` на публичных страницах, `openGraph` и `twitter: summary_large_image`, `noindex` на auth-страницах и Settings.
- **OG-картинки** (`next/og`, Inter 600/800 из `src/fonts/og`, OFL): общая для сайта и свои для Pricing, Teams, обоих инструментов и каждой SEO-страницы.
- **`sitemap.xml`:** только публичные страницы. **`robots.txt`:** закрыты `/shoot/`, `/settings`, `/dev/` и auth.
- **JSON-LD:**
  - Organization — на главной;
  - Product + Offer ×3 — на Pricing;
  - FAQPage — на главной, Pricing, SEO-страницах и в инструментах;
  - BreadcrumbList — на SEO-страницах;
  - WebApplication — в инструментах.

## 3. Приёмка (04-roadmap)

| Критерий | Статус |
|---|---|
| Визуально соответствует референсам на 1440 и 390 в обеих темах | ✅ см. §4: Homepage, Benefits, Pricing, Settings и Auth сверены по скриншотам; экраны без макетов (SEO, инструменты, Teams, Legal) собраны из тех же карточек и типографики |
| Free tools не отправляют изображения в сеть | ✅ e2e на обоих инструментах: после выбора файла нет ни одного не-GET-запроса, GET с телом или запроса на чужой origin; модель и рантайм грузятся с нашего домена |
| axe без critical/serious | ✅ `e2e/a11y.spec.ts`: 17 страниц × Light/Dark × desktop/mobile = 68 прогонов, теги WCAG 2.0/2.1 A и AA |

## 4. Сравнение с референсами

| Референс | Что взято | Сознательные отличия |
|---|---|---|
| `Homepage_Light/Dark` | hero в 2 колонки с крупным Before/After и лентой стилей, карточки, How it works, FAQ слева/справа, финальная CTA-карточка | порядок и тексты секций — из 03-pages §1 (11 секций вместо 6); без Outfit-карточки, «Trusted by creators…» с аватарами, `View All FAQ/Examples` и пунктов `Features` (README) |
| `Benefits.png` | секция целиком: заголовок, 3 карточки с мини-иллюстрациями, строка с точками | тексты наши: Likeness first / One-time payment / Private by design |
| `Pricing_Light/Dark` | hero с градиентным словом, 3 карточки с выделенной средней и полосой, нижние плашки | содержимое по README: тарифы съёмки $29/$49/$79 вместо пакетов кредитов; кредиты — отдельной компактной секцией; добавлены Compare plans и мини-FAQ |
| `Settings_Light/Dark` | раскладка 2 + 1 + 1 карточки, иконки в кружках, строки приватности с бейджами, ledger справа от баланса | без `SAMPLE DATA` и `Design preview only`; строки приватности — по нашим срокам (Selfies 24 ч, Headshots 30 дней, Free tools Local) |
| `Auth_Light/Dark` | форма слева, Before/After справа, Google-кнопка, плашка `Example` | — (Forgot/Reset по той же раскладке) |

Mobile (390): все секции в одну колонку; таблица Compare plans прокручивается по горизонтали и доступна с клавиатуры; ленты стилей и use cases — сетки по 2.

## 5. Технические решения и отклонения

- **Токен `--text-muted` (Light) затемнён: `#6b7588` → `#646e81`.** На подложках `--bg`, `--surface-2` и `--brand-soft` прежний цвет давал 4.18–4.32 и валил axe на всех страницах. Новый цвет даёт 4.63–4.79, визуально почти неотличим. В `01-design-system.md` стоит старое значение — предлагаю поправить документ.
- **Доступность по axe (исправлено в этом этапе):**
  - Dropzone: файловый input вынесен из `role="button"` (вложенные интерактивные элементы) и получил подпись;
  - имя кнопки аккаунта теперь берётся из содержимого (`sr-only` текст), инициалы скрыты от скринридеров — видимый текст входит в имя (WCAG 2.5.3);
  - credits pill: `30 credits — buy more edit credits` (видимый текст входит в имя);
  - горизонтально прокручиваемые области (Compare plans, ledger в Settings) стали фокусируемыми регионами с подписью.
- **Background Remover — только люди** (MODNet), см. §2. Подзаголовок отличается от 03-pages §4.1.
- **Строгий 404 через `src/proxy.ts`** вместо `notFound()` внутри страницы — из-за Partial Prerender.
- **`BillingService.confirmCreditPurchase(ref)`** — новый метод mock-интерфейса для возврата из checkout кредитов; в 05-backend-outline ему соответствует webhook Lemon Squeezy.
- **`onnxruntime-web` 1.30.0** зафиксирован точной версией: путь к WASM-файлам в `public/vendor/ort` зависит от версии.

## 6. TODO(owner) / открытые вопросы

1. **Background Remover для любых объектов** — нужен ли? Сейчас MODNet (только люди, Apache-2.0). Вариант: BiRefNet-lite (MIT) через WebGPU с MODNet как фолбэком.
2. **Legal:** юридические тексты `/privacy` и `/terms`, дата `Last updated`, контакт поддержки (`brand.ts`), провайдеры AI и аналитики (после выбора в бенчмарке).
3. **Домен** (`brand.url`) — от него зависят canonical, sitemap, robots и OG.
4. **Модель детектора лиц** — заменить на официальный `blaze_face_short_range.tflite` (из Stage 3, в силе).
5. **Демо-набор** для остальных стилей и инструментов (`Example coming soon` / `Example not available yet`).
6. **Цены пакетов кредитов** — `Price to be confirmed`.
7. **`01-design-system.md`:** новое значение `--text-muted` (Light).

## 7. Как проверить руками

```bash
npm install && npm run dev        # postinstall копирует MediaPipe и ONNX Runtime WASM
# /tools/background-remover — фото человека → Before/After, фоны, PNG с прозрачностью
# /tools/photo-editor — пресеты соцсетей, экспорт ровно в размер
# /headshots/astronauts → 404; /sitemap.xml, /robots.txt
# Dev-панель: Has shoot → /settings — все диалоги; /pricing#credits → Buy
```

# 03 — Страницы

Общее: MarketingHeader (V2), Footer (Logo · Product: Pricing, Examples, Teams · Free tools: Background Remover, Photo Editor · Headshots for: ссылки на SEO-страницы · Legal: Privacy, Terms · © 2026). Ниже — стартовый английский копирайт; формулировки можно улучшать, **смысл и запреты из CLAUDE.md §3 — нельзя**.

---

## 1. Homepage `/` — headshot-first

Визуальный язык: `design/references/home/Homepage_Light.png` / `Homepage_Dark.png` (композиция hero, ритм секций, карточки, FAQ, финальная CTA-карточка) и `Benefits.png`. **Структура и тексты — по этому документу**, а не по старой картинке.

1. **Hero** (2 колонки)
   - Слева: overline `AI HEADSHOTS · STUDIO QUALITY`, H1 `Professional headshots that actually look like you`, подзаголовок `Upload a few selfies, see free previews, and get studio-quality 4K headshots — every photo checked for likeness.`
   - Буллеты: `Free previews before you pay` · `Every photo checked for likeness` · `4K, commercial license, edits included`.
   - Кнопки: primary `Get your free preview →` (`/shoot/new`), secondary `See examples` (`#examples`). Под кнопками — `From $29 · One-time payment · Full refund until you download`.
   - Справа: большой Before/After (`before.webp` → `studio.webp`) + под ним лента из 4 миниатюр стилей (Corporate Gray, Minimal Beige, Modern Office, City Bokeh). Клик по миниатюре меняет After (crossfade). Подпись `Example`.
   - Убрано: Outfit/Change Background табы, «Trusted by…», аватары, download/zoom.
2. **Why it's different** (`#why`) — таблица-сравнение, две колонки: **Typical AI headshot apps** vs **{APP_NAME}**. Строки:
   - Pay first, hope it looks like you → Free previews before you pay
   - 100+ photos, many unusable → Only photos that pass a likeness check
   - 10–20 selfies required → 4–8 selfies, checked instantly in your browser
   - Fixed results → Edit background, outfit and lighting afterwards
   - Low-res on basic plans → 4K on every plan
   - Unclear photo retention → Selfies deleted 24h after your shoot
   
   Без названий конкурентов.
3. **How it works** (`#how-it-works`) — 4 шага с иконками: `Upload 4–8 selfies` → `See 4 free previews` → `Pick a package and styles` → `Download and fine-tune in Studio`.
4. **Examples** (`#examples`) — сетка стилей (12 плиток из `styles.ts`; есть демо-кадр — фото, нет — элегантная заглушка с названием и `Example coming soon`) + блок «одна героиня — разные стили» на наших 4 кадрах. Подпись `Examples are AI-generated from a synthetic model.`
5. **Edits included** — мини-демо Studio: превью + 4 кнопки (Background / Outfit / Relight / Retouch), переключающие демо-пары; где пары нет — кнопка неактивна с tooltip `Example coming soon`. CTA `Explore the Studio →` (`/studio`).
6. **Benefits** — по `Benefits.png`: `Everything you need. Nothing you don't.` Карточки: **Likeness first** (`Every photo checked before you see it.`), **One-time payment** (`No subscriptions. Credits never expire.`), **Private by design** (`Selfies deleted 24h after your shoot.` / `Delete Now` / `Photos kept 30 days`).
7. **Pricing teaser** — три компактные карточки из `packs.ts` + `Compare plans →` (`/pricing`).
8. **Use cases** — плитки-ссылки на SEO-страницы: LinkedIn, Resume, Real Estate Agents, Lawyers, Doctors, Speakers, Consultants.
9. **Free tools** — две карточки: `Background Remover — free, runs in your browser` и `Photo Editor — crop, resize, adjust`. Ссылки на `/tools/*`.
10. **FAQ** (`#faq`) — accordion (ответы совпадают с `00-decisions.md`):
    - How many selfies do I need? — 4 to 8. We check each one instantly and tell you if it's blurry, too dark or too small.
    - Do I really see results before paying? — Yes. You get 4 free watermarked previews in two styles. One free preview per account.
    - Will the headshots look like me? — Every photo is compared with your selfies, and photos that don't pass the likeness check are discarded before you see them.
    - What if I'm not happy? — You get a full refund until your first full-size download.
    - What resolution and rights do I get? — 4K on every plan, with a commercial license — use them on LinkedIn, your website, print and ads.
    - Can I change the background or outfit later? — Yes. Every package includes edit credits for the Studio.
    - What happens to my photos? — Selfies are deleted 24 hours after your shoot. Your headshots are kept for 30 days so you can download them, and you can delete everything sooner with one click.
    - Can I upload photos of someone else? — Only of an adult who has given you explicit permission.
    - Do you offer team headshots? — Coming soon. Join the waitlist on our Teams page.
11. **Final CTA** — тёплая карточка (`--brand-soft`): `Your next headshot is a few selfies away`, кнопка `Get your free preview →`, три пункта: `Free previews` · `4K + commercial license` · `Refund until you download`.

---

## 2. Pricing `/pricing`

Референс: `design/references/credits/Pricing_Light.png` / `Pricing_Dark.png` — **вёрстку брать целиком**, содержимое заменить.
- Pill `✦ ONE-TIME PAYMENT`, H1 `Studio headshots. ` + градиентное `Pay once.`, подзаголовок `See free previews first. Choose a package only when you love the result.`, три пункта: `No subscriptions · 4K on every plan · Full refund until you download`.
- Три карточки тарифов из `packs.ts` (M2): overline (`GET STARTED` / `MOST POPULAR` / `BEST VALUE`), название, цена крупно (`$49`, `one-time`), список (кадры, стили, кредиты на правки, `4K · commercial license`, `Likeness check`, у Executive — `Priority processing`), кнопка `Choose Professional →` (средняя — primary). Ведёт на `/shoot/new?pack=professional`.
- **Compare plans** — таблица с галочками по тем же пунктам.
- **Edit credits** (`#credits`) — три пакета кредитов (M3) в компактных карточках: `20 credits` / `60` / `150`, `Price to be confirmed`, кнопки `Buy` (гость → `/login?next=/pricing%23credits`). Пояснение стоимости правок: `Background, outfit, retouch, relight — 1 credit per variant · Creative styles and Place Me Here — 2 credits · Crop & export — free`.
- **Our guarantee** — карточка: `Full refund until your first full-size download. Failed edits are refunded automatically. Unused credit packs can be refunded within 14 days.`
- **Teams** — плашка `Need headshots for your whole team? Join the Teams waitlist →`.
- Мини-FAQ (4 вопроса про оплату и возвраты).

---

## 3. SEO-страницы `/headshots/[useCase]`

Шаблон из `src/config/use-cases.ts` (SSG, `generateStaticParams`, уникальные `title`/`description`/OG):

```ts
{ slug: 'linkedin', title: 'AI LinkedIn Headshots', h1: 'LinkedIn headshots that look like you',
  intro: '…', recommendedStyles: ['corporate-gray','modern-office','city-bokeh'],
  tips: ['Use a 1:1 crop at 400×400 or larger', '…'], faq: [{q,a}, …] }
```

Секции: hero с CTA `Get your free preview →` (`/shoot/new?useCase=linkedin`, стили предвыбраны), «рекомендованные стили» (плитки), 3–5 практических советов именно под сценарий (размеры, дресс-код), как это работает (короткая версия), 3–4 FAQ, финальный CTA. Стартовые 7 страниц (P11). Тексты пишутся полноценно (≥ 400 слов полезного контента), без воды и без выдуманных цифр. JSON-LD `FAQPage`.

---

## 4. Free tools (без входа)

Общий layout: H1, подзаголовок, большая дропзона → рабочая область, ниже — короткий how-to и FAQ (SEO), в конце — CTA-карточка на headshot. Ни один файл не уходит на сервер: проверить в e2e (нет сетевых запросов с телом изображения).

### 4.1 `/tools/background-remover`
- H1 `Free Background Remover`, `Remove the background from any photo — right in your browser. Nothing is uploaded.`
- Модель сегментации запускается в браузере (WebGPU с фолбэком на WASM). **Требование — лицензия, разрешающая коммерческое использование.** Кандидаты для проверки: BiRefNet-lite ONNX (MIT) через `@huggingface/transformers`, MediaPipe Selfie Segmenter (Apache-2.0, только люди). **Не использовать** `@imgly/background-removal` (AGPL) и RMBG-1.4/2.0 (некоммерческие). Выбор и лицензию зафиксировать в отчёте этапа.
- Первая загрузка модели: прогресс `Loading the AI model (one-time, ~N MB)…`, кэш в Cache Storage.
- Результат на шахматной подложке, Before/After, фон: Transparent / White / Color / Blur original. Кнопки `Download PNG` и `Download JPG`.
- После результата: CTA `Need a professional headshot instead? Get 4 free previews →`.

### 4.2 `/tools/photo-editor`
- H1 `Free Photo Editor`, `Crop, rotate, resize and adjust your photos online — free and private.`
- Тот же модуль `src/features/editor/`, что и Crop & Export в Studio, плюс пресеты размеров для соцсетей (LinkedIn 400×400, LinkedIn banner 1584×396, Instagram 1080×1350, X/Twitter 400×400, Passport-like 600×600 **без** обещания соответствия официальным требованиям).

---

## 5. Teams `/teams`

Лендинг-заглушка для замера спроса: H1 `Consistent headshots for your whole team`, 3 преимущества (единый фирменный фон, инвайт-ссылка — каждый загружает селфи сам, админ скачивает все фото одним архивом), строка `Coming soon`, форма waitlist: work email, размер команды (select: 2–10 / 11–50 / 51–200 / 200+), `Join the waitlist` → `WaitlistService.join` → `Thanks! We'll let you know when Teams launches.` Без цен и сроков.

---

## 6. Account Settings `/settings`

Референс точный: `design/references/settings/Settings_Light.png` / `Settings_Dark.png`. Изменения по содержанию:
- **My Account** — как на макете.
- **Privacy & Data**:
  - `Selfies` — `Deleted automatically 24 hours after each shoot.` [`Auto`];
  - `Headshots & edits` — `Kept for 30 days, then deleted.` [`Manage shoots ↗` → меню My Shoots];
  - `Free tools` — `Processed in your browser. Never uploaded.` [`Local`].
  - Внизу: `No public gallery. Your photos are never shown to others.` + `Delete all my photos` (danger-outline, диалог).
- **Credits & Activity** — баланс кредитов, `Buy credits →` (`/pricing#credits`); таблица: покупки съёмок, покупки кредитов, правки (−), возвраты (+).
- **Delete Account** — как на макете, подтверждение вводом `DELETE`.
- Убрать: `SAMPLE DATA`, `Example account`, нижнюю сноску.

---

## 7. Auth

Референс: `design/references/auth/Auth_Light.png` / `Auth_Dark.png` — 4 экрана в одной системе, форма слева, диагональная Before/After-панель справа (наш `before.webp` → `professional.webp`, вариант `diagonal` компонента BeforeAfter, плашка `Example`).

| Экран | Содержимое |
|---|---|
| Login | `Welcome back` / `Sign in to see your headshots.` · Email · Password (показать/скрыть) · `Remember me` · `Forgot password?` · `Sign In →` · `or continue with` · `Continue with Google` · `Don't have an account? Sign up` |
| Sign Up | `Create your account` / `Get 4 free headshot previews.` · Full name · Email · Password · Confirm · `Create Account →` · `By continuing, you agree to the Terms of Service and Privacy Policy.` · `Continue with Google` · `Already have an account? Sign in` |
| Forgot | `Forgot your password?` · Email · `Send Reset Link →` · одинаковое сообщение при любом email: `If an account exists for this email, instructions will be sent.` · `← Back to Sign In` |
| Reset | `Create new password` · New / Confirm · живые проверки `8+ characters`, `Passwords match` · `Update Password →` · состояние expired: `This reset link has expired.` + `Request a new link` |

zod-валидация, ошибки под полями с `aria-describedby`, фокус на первой ошибке, `autocomplete`. < 1024px — арт-панель скрыта. Mock: любой email и пароль ≥ 8 — успешный вход; `fail@example.com` — ошибка `Incorrect email or password.`; Google — сразу вход тестовым пользователем. После входа — редирект по CLAUDE.md §6.

---

## 8. Legal `/privacy`, `/terms`

Страница max-width 720, `Last updated`, оглавление. Пока — структура разделов с `TODO(owner)`:
- **Privacy**: какие данные собираем; биометрическая обработка (сравнение лиц только для проверки сходства, шаблоны лица не хранятся); AI-провайдеры; сроки (P8); free tools работают локально; аналитика; права пользователя и удаление; контакты.
- **Terms**: сервис; съёмки, кредиты, возвраты (M6); лицензия на результаты (коммерческое использование); допустимое использование и запреты (P9); отказ от гарантий; ответственность.

## 9. 404
`Page not found` + `Go to homepage` и `Get your free preview`.

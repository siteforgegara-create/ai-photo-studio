# B0 — бенчмарк моделей сходства

ТЗ: [`docs/07-benchmark-b0.md`](../docs/07-benchmark-b0.md). Код пишет Claude Code, **запускает владелец у себя** (`npm run bench:*`).

## Безопасность

- **Ключ.** `FAL_KEY` читается из `.env.local` в корне проекта. Скрипты не печатают ключ и вырезают его из логов. Без ключа работает любой `--dry-run`.
- **Потолок $17.** Весь расход по всем прогонам учитывается в `bench/runs/spend.json`. Вызов, который вывел бы сумму за $17, не выполняется: план заранее показывает, что именно будет отрезано. Неудачные запросы, принятые fal.ai, считаются потраченными (так безопаснее). Запросы, отклонённые на входе (ошибка параметров), — нет.
- **Подтверждение.** Каждая платная команда сначала печатает план и стоимость и спрашивает `y/N`. Флаг `--yes` пропускает вопрос.
- **Фото реальных людей** лежат в `bench/subjects/`, результаты — в `bench/runs/`. Обе папки в `.gitignore`.
  - Загруженные в fal.ai файлы и результаты истекают через 1 день (`X-Fal-Object-Lifecycle-Preference`).
  - История запросов на fal.ai отключена (`X-Fal-Store-IO: 0`).
  - После B0 удалите `bench/subjects/real-*`.

## Подготовка (один раз)

```powershell
npm install
```

Нужен Node.js ≥ 20.12. Новые dev-зависимости: `@fal-ai/client`, `@vladmandic/human` (+ `@tensorflow/tfjs-*` WASM), `tsx`. Всё работает на чистом JS/WASM, нативная сборка не нужна.

## Куда класть селфи

```
bench/subjects/
  real-01/selfies/   ← 4–8 селфи первого человека (jpg/png/webp/heic)
  real-02/selfies/
  real-03/selfies/
  subjects.json      ← скопируйте bench/subjects.example.json и поправьте пол / возраст / тон кожи
```

- **Селфи — обычные, с телефона:** разные ракурсы и освещение, лицо крупно, без очков-«авиаторов» и фильтров, по одному человеку в кадре.
- **Только с устного согласия человека на тест.**
- Папки `synth-01…05` создаёт `bench:personas`.

## Команды по порядку

| # | Команда | Что делает | ≈ Стоимость |
|---|---|---|---|
| 1 | `npm run bench:personas -- --dry-run`, затем `npm run bench:personas` | 5 синтетических персонажей: эталон (Qwen Image) + 6 «плохих» селфи (Qwen Image Edit 2511). Qwen — семейство вне теста | **$1.00** |
| 2 | *(посмотрите `bench/subjects/synth-*`)* | | — |
| 2а | `npm run bench:run -- --only=nb21,flux3 --subjects=synth-01 --no-lora` | **смоук-тест**: связь с fal.ai + проверка цен двух моделей, у которых цена — оценка. После него сравните расход на странице Usage в fal.ai с планом ($0.44) | **$0.44** |
| 3 | `npm run bench:run -- --dry-run`, затем `npm run bench:run` | 8 участников × 4 модели × 4 кадра + LoRA-контроль на `real-01` (смоук-кадры уже в кэше) | **$11.73** |
| 4 | `npm run bench:score` | автосходство, брак, время, цена (локально, по тем же кадрам 880×1100) | $0 |
| 5 | `npm run bench:review` | собирает `bench/runs/<дата>/review.html`; все кадры приводятся к 880×1100 JPEG q90 | $0 |
| 6 | *Откройте `review.html`, оцените все кадры и нажмите «Сохранить оценки»* | `ratings.json` положите в ту же папку прогона | $0 |
| 7 | `npm run bench:report` | `bench/runs/<дата>/report.md` — таблицы, пороги, рекомендация | $0 |
| 8 | `npm run bench:upscale -- --dry-run`, затем без `--dry-run` | 3 лучших кадра → 4K (SeedVR2) | **$0.06** |
| 9 | `npm run bench:demo -- --model=<победитель> --dry-run`, затем без `--dry-run` | демо-набор: 12 стилей + 5 правок Studio → `public/demo/` | **$1.00** (nb21) … **$2.55** (nbpro) |

Итого по плану: $1.00 + $11.73 + $0.06 + демо $1.00–2.55 = **$13.79–15.34 из $17**.

- **Запас $1.7–3.2** хватает на 1–2 дополнительных реальных участников ($1.20 каждый: 4 модели × 4 кадра). Положите `real-04` / `real-05` — план сам покажет, влезает ли.
- **Цены Nano Banana 2.1 и FLUX 3 — оценки.** NB 2.1 оплачивается токенами (в плане заложено $0.0616 на кадр с 6 референсами, с запасом), а у FLUX 3 fal.ai не пишет, оплачиваются ли референсы (в плане $0.048 за кадр). Потолок считает по плану, поэтому сверка после смоук-теста (шаг 2а) обязательна: если реальный расход заметно выше — остановитесь и напишите мне, я подниму цены в `config.ts`.
- **Шаги 1 и 3 можно запускать порциями.** Например, `npm run bench:run -- --only=seedream,nb21 --subjects=real-01`. Готовые кадры не перегенерируются: кэш по участнику, модели, стилю и номеру.
- **Повторный запуск.** `bench:run` продолжает последний прогон. Новый прогон: `--run=2026-10-25`.

## Флаги

| Флаг | Где | Значение |
|---|---|---|
| `--dry-run` | все | только план и цены, без вызовов и без ключа |
| `--yes` | платные | без вопроса y/N |
| `--only=nb21,nbpro,seedream,flux3,lora` | run | какие модели |
| `--subjects=real-01,synth-02` | personas, run, score, review | какие участники |
| `--no-lora`, `--lora-subject=real-02` | run | LoRA-контроль: выключить или выбрать человека |
| `--run=YYYY-MM-DD` | все | папка прогона (по умолчанию — последняя) |
| `--model=…`, `--edit-model=…`, `--persona=synth-03`, `--candidates=2` | demo | победитель, модель правок, героиня, кандидатов на стиль |

## Модели и цены (проверено 18.10.2026)

| Ключ | Эндпоинт | Цена | Источник |
|---|---|---|---|
| `nb21` | `google/nano-banana-2.1/edit` | токены: изображения $1.764 вход / $35.294 выход за 1M; ~1 120 токенов на картинку 1K → в плане $0.0616 / кадр с 6 референсами (замер fal: $0.0415 за 1K-правку); до 14 референсов | [fal.ai](https://fal.ai/models/google/nano-banana-2.1/edit), [обзор](https://fal.ai/nano-banana-2.1) |
| `nbpro` | `fal-ai/nano-banana-pro/edit` | $0.15 / кадр, до 14 референсов | [fal.ai](https://fal.ai/models/fal-ai/nano-banana-pro/edit) |
| `seedream` | `fal-ai/bytedance/seedream/v4.5/edit` | $0.04 / кадр, до 10 референсов; минимум ~3.7 МП → 1728×2160 | [fal.ai](https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit) |
| `flux3` | `blackforestlabs/flux-3/edit-image` | $0.048 за кадр 1K (1 МП; с 16.10.2026, до этого $0.024); до 10 референсов; seed нет | [fal.ai](https://fal.ai/models/blackforestlabs/flux-3/edit-image), [pricing](https://fal.ai/pricing) |
| `lora` | `fal-ai/flux-lora-fast-training` + `fal-ai/flux-lora` | $2 за обучение (1000 шагов) + $0.035 / МП | [обучение](https://fal.ai/models/fal-ai/flux-lora-fast-training), [генерация](https://fal.ai/models/fal-ai/flux-lora) |
| персонажи: эталон | `fal-ai/qwen-image` | $0.02 / МП → 864×1088 = $0.02 | [fal.ai](https://fal.ai/models/fal-ai/qwen-image) |
| персонажи: селфи | `fal-ai/qwen-image-edit-2511` | $0.03 / МП → 864×1152 = $0.03 | [fal.ai](https://fal.ai/models/fal-ai/qwen-image-edit-2511) |
| апскейл | `fal-ai/seedvr/upscale/image` | $0.001 / МП | [fal.ai](https://fal.ai/models/fal-ai/seedvr/upscale/image/llms.txt) |

Цены и id — в `bench/config.ts`, это единственный источник. Перед большим прогоном проверьте их на fal.ai: цены могут меняться.

Nano Banana 2.1 и FLUX 3 заменили Nano Banana 2 и FLUX.2 [pro] (у обеих есть edit по референсам). Seedream 5.0 Pro в каталоге fal.ai только text-to-image, поэтому Seedream остаётся 4.5.

## Сбои

- **«FAL_KEY not found»** — в `.env.local` нет строки `FAL_KEY=…`.
- **«⛔ skipped — would cross the spending ceiling»** — потолок, так и задумано. Остаток виден в плане.
- **Сетевые ошибки.** До 2 повторов. Если задача уже принята fal.ai, повторяется только опрос результата по тому же `request_id`, без повторной оплаты.
- **Подробности ошибки:** `set BENCH_DEBUG=1` (PowerShell: `$env:BENCH_DEBUG=1`).

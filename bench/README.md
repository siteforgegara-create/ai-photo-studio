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
| 1 | `npm run bench:personas -- --dry-run`, затем `npm run bench:personas` | 5 синтетических персонажей: эталон + 6 «плохих» селфи. Модель Nano Banana (v1) не участвует в тесте | **$1.36** |
| 2 | *(посмотрите `bench/subjects/synth-*`)* | | — |
| 3 | `npm run bench:run -- --dry-run`, затем `npm run bench:run` | 8 участников × 4 модели × 4 кадра + LoRA-контроль на `real-01` | **$13.66** |
| 4 | `npm run bench:score` | автосходство, брак, время, цена (локально) | $0 |
| 5 | `npm run bench:review` | собирает `bench/runs/<дата>/review.html` | $0 |
| 6 | *Откройте `review.html`, оцените все кадры и нажмите «Сохранить оценки»* | `ratings.json` положите в ту же папку прогона | $0 |
| 7 | `npm run bench:report` | `bench/runs/<дата>/report.md` — таблицы, пороги, рекомендация | $0 |
| 8 | `npm run bench:upscale -- --dry-run`, затем без `--dry-run` | 3 лучших кадра → 4K (SeedVR2) | **$0.06** |
| 9 | `npm run bench:demo -- --model=<победитель> --dry-run`, затем без `--dry-run` | демо-набор: 12 стилей + 5 правок Studio → `public/demo/` | **≈ $1.36** (nb2) |

Итого по плану: $1.36 + $13.66 + $0.06 + $1.36 = **$16.44 из $17**.

- **Победитель — Nano Banana Pro.** Демо стоит $2.55, а с `--edit-model=seedream` — $2.00. После шагов 1–8 остаётся ≈ $1.92, поэтому потолок отрежет 1–2 последние правки; план покажет, какие именно. Если Pro заранее выглядит фаворитом, запускайте `bench:run` с `--no-lora`: это экономит $2.14, и тогда демо помещается целиком.
- **Шаги 1 и 3 можно запускать порциями.** Например, `npm run bench:run -- --only=seedream,nb2 --subjects=real-01`. Готовые кадры не перегенерируются: кэш по участнику, модели, стилю и номеру.
- **Повторный запуск.** `bench:run` продолжает последний прогон. Новый прогон: `--run=2026-10-25`.

## Флаги

| Флаг | Где | Значение |
|---|---|---|
| `--dry-run` | все | только план и цены, без вызовов и без ключа |
| `--yes` | платные | без вопроса y/N |
| `--only=nb2,nbpro,seedream,flux2,lora` | run | какие модели |
| `--subjects=real-01,synth-02` | personas, run, score, review | какие участники |
| `--no-lora`, `--lora-subject=real-02` | run | LoRA-контроль: выключить или выбрать человека |
| `--run=YYYY-MM-DD` | все | папка прогона (по умолчанию — последняя) |
| `--model=…`, `--edit-model=…`, `--persona=synth-03`, `--candidates=2` | demo | победитель, модель правок, героиня, кандидатов на стиль |

## Модели и цены (проверено 18.10.2026)

| Ключ | Эндпоинт | Цена | Источник |
|---|---|---|---|
| `nb2` | `fal-ai/nano-banana-2/edit` | $0.08 / кадр (1K), до 14 референсов | [fal.ai](https://fal.ai/models/fal-ai/nano-banana-2/edit) |
| `nbpro` | `fal-ai/nano-banana-pro/edit` | $0.15 / кадр, до 14 референсов | [fal.ai](https://fal.ai/models/fal-ai/nano-banana-pro/edit) |
| `seedream` | `fal-ai/bytedance/seedream/v4.5/edit` | $0.04 / кадр, до 10 референсов; минимум ~3.7 МП → 1728×2160 | [fal.ai](https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit) |
| `flux2` | `fal-ai/flux-2-pro/edit` | $0.03 за 1-й МП выхода + $0.015 за каждый доп. МП входа и выхода; берём 4 референса → $0.09 / кадр | [fal.ai](https://fal.ai/models/fal-ai/flux-2-pro/edit) |
| `lora` | `fal-ai/flux-lora-fast-training` + `fal-ai/flux-lora` | $2 за обучение (1000 шагов) + $0.035 / МП | [обучение](https://fal.ai/models/fal-ai/flux-lora-fast-training), [генерация](https://fal.ai/models/fal-ai/flux-lora) |
| персонажи | `fal-ai/nano-banana` (+ `/edit`) | $0.039 / кадр | [fal.ai](https://fal.ai/models/fal-ai/nano-banana/edit) |
| апскейл | `fal-ai/seedvr/upscale/image` | $0.001 / МП | [fal.ai](https://fal.ai/models/fal-ai/seedvr/upscale/image/llms.txt) |

Цены и id — в `bench/config.ts`, это единственный источник. Перед большим прогоном проверьте их на fal.ai: цены могут меняться.

На дату проверки в каталоге fal.ai появились и более новые модели (Nano Banana 2.1, Seedream 5.0 Pro, FLUX 3). Кроме Seedream 5.0, у которого в каталоге только text-to-image, их можно добавить в `MODELS`, проверив схему edit-эндпоинта.

## Сбои

- **«FAL_KEY not found»** — в `.env.local` нет строки `FAL_KEY=…`.
- **«⛔ skipped — would cross the spending ceiling»** — потолок, так и задумано. Остаток виден в плане.
- **Сетевые ошибки.** До 2 повторов. Если задача уже принята fal.ai, повторяется только опрос результата по тому же `request_id`, без повторной оплаты.
- **Подробности ошибки:** `set BENCH_DEBUG=1` (PowerShell: `$env:BENCH_DEBUG=1`).

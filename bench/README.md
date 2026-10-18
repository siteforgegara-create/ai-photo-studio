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
  subjects.json      ← уже есть (synth-*); добавьте записи real-* по образцу bench/subjects.example.json
```

- **Селфи — обычные, с телефона:** разные ракурсы и освещение, лицо крупно, без очков-«авиаторов» и фильтров, по одному человеку в кадре.
- **Только с устного согласия человека на тест.**
- Папки `synth-01…05` создаёт `bench:personas`; он же пишет в `subjects.json` поле `truth` для synth-* (записи real-* не трогает).

## Команды по порядку

Порядок: **personas --redo → analyze → run → score → review → report**, затем upscale и demo. Перед каждым платным шагом — `--dry-run`: он печатает план и обе цены, «list price» и «with margin» (×1.2).

| # | Команда | Что делает | List price | С запасом ×1.2 |
|---|---|---|---|---|
| 0 | `npm run bench:reconcile -- --actual=1.61` | записать факт из fal.ai → Usage в `spend.json`; потом — после каждого платного шага | $0 | — |
| 0а | `npm run bench:forecast` | полный прогноз B0: уже потрачено + все шаги ниже, урезания, что отрежет потолок | $0 | — |
| 1 | `npm run bench:personas -- --redo=synth-02,synth-05` | перегенерировать двух персонажей с явной внешностью; `subjects.json` получает `truth` всех synth-* | $0.40 | $0.48 |
| 2 | *(посмотрите `bench/subjects/synth-*`)* | | — | — |
| 3 | `npm run bench:analyze` | признаки внешности по каждому селфи (Gemini 2.5 Flash), голосование ≥ 60% → `attributes.json`; точность на synth-* | ≈ $0.14 | ≈ $0.17 |
| 4 | `npm run bench:run` | 8 участников × 4 модели × 4 кадра + LoRA на `real-01` + абляция `nb21-noattr`; все промпты со строкой признаков | $11.73 + абляция $0.25–0.74 | $14.07 + $0.30–0.89 |
| 5 | `npm run bench:score` | автосходство, брак, время, цена (локально, по кадрам 880×1100) | $0 | — |
| 6 | `npm run bench:review` | `review.html`; кадры 880×1100 JPEG q90, абляция — отдельная скрытая «модель» | $0 | — |
| 7 | *Откройте `review.html`, оцените, «Сохранить оценки»* | `ratings.json` — в папку прогона | $0 | — |
| 8 | `npm run bench:report` | `report.md`: таблицы, точность признаков, абляция, порог, рекомендация | $0 | — |
| 9 | `npm run bench:upscale` | 3 лучших кадра → 4K (SeedVR2) | $0.06 | $0.07 |
| 10 | `npm run bench:demo -- --model=<победитель>` | 12 стилей + 5 правок Studio → `public/demo/` | $1.00 (nb21) … $2.55 (nbpro) | $1.20 … $3.06 |

### Бюджет: полный B0 в потолок $17 с запасом не влезает

Прогноз на 18.10 (`bench:forecast`; уже потрачено $1.44 по прайсу и $1.61 по fal.ai, 3 реальных участника — плановые):

| | List price | С запасом |
|---|---|---|
| уже потрачено | $1.44 | $1.73 |
| personas --redo | $0.40 | $0.48 |
| analyze | $0.14 | $0.17 |
| run (4 модели + LoRA) | $11.73 | $14.07 |
| абляция (урезана до 2 участников) | $0.25 | $0.30 |
| upscale | $0.06 | $0.07 |
| demo (nb21) | $1.00 | $1.20 |
| **итого** | **$15.01** | **$18.01** |

Урезания по правилу уже применены: абляция 4 → 2 участника; `DEMO.candidatesPerStyle` уже 1, ниже некуда. Основной прогон не трогается, поэтому потолок отрежет конец демо (~15 из 17 вызовов с nb21; с nbpro — 16 из 17). Варианты — решать вам:
- после разбивки fal.ai по моделям — отдельный запас для каждой модели вместо общих ×1.2 (у моделей с фиксированной ценой за кадр — nbpro, seedream, LoRA — запас, скорее всего, не нужен);
- убрать LoRA-контроль (`--no-lora`, −$2.57 с запасом) — тогда влезает всё, включая абляцию на 4 участника и демо с nb21;
- сделать демо отдельно после B0, из остатка баланса.

### Прочее

- **Запас и сверка.** Потолок считает по max(насчитано × 1.2, факт fal.ai + новые траты × 1.2). После каждого платного шага сверяйте Usage командой `bench:reconcile`.
- **Кэш.** Кадр считается готовым, только если файл есть И в логе записан успешный вызов с тем же запросом (эндпоинт + промпт + seed). Поэтому кадры смоук-теста (без строки признаков) перегенерируются, а 4 кадра Nano Banana 2.1 у synth-01 бесплатно переходят в абляцию `nb21-noattr` — запрос у них идентичный.
- **Порции.** Например, `npm run bench:run -- --only=seedream,nb21 --subjects=real-01`.
- **Повторный запуск.** `bench:run` продолжает последний прогон. Новый прогон: `--run=2026-10-25`.
- **Признаки.** Только видимые; раса, этническое происхождение и возраст числом не запрашиваются и не сохраняются.

## Флаги

| Флаг | Где | Значение |
|---|---|---|
| `--dry-run` | все | только план и цены, без вызовов и без ключа |
| `--yes` | платные | без вопроса y/N |
| `--redo=synth-02,synth-05` | personas | перегенерировать этих персонажей (старые файлы и их кадры удаляются) |
| `--only=nb21,nbpro,seedream,flux3,lora,nb21-noattr` | run | какие модели и группы |
| `--no-attrs` | run | без строки признаков в промптах и без абляции |
| `--ablation-subjects=4` | run, forecast | размер абляции вручную (по умолчанию решает прогноз: 4 или 2) |
| `--subjects=real-01,synth-02` | personas, analyze, run, score, review | какие участники |
| `--no-lora`, `--lora-subject=real-02` | run | LoRA-контроль: выключить или выбрать человека |
| `--run=YYYY-MM-DD` | все | папка прогона (по умолчанию — последняя) |
| `--actual=1.61` | reconcile | факт из fal.ai → Usage |
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
| анализ селфи | `openrouter/router/vision` · `google/gemini-2.5-flash` | токены: $0.30 / 1M вход, $2.50 / 1M выход ≈ $0.0012 за селфи; в плане $0.003 (ответ fal содержит `usage.cost` — пишется в лог). Альтернатива с фиксированной ценой: `fal-ai/any-llm/vision`, $0.01 за запрос | [fal.ai](https://fal.ai/models/openrouter/router/vision), [OpenRouter](https://openrouter.ai/google/gemini-2.5-flash), [any-llm](https://fal.ai/models/fal-ai/any-llm/vision) |
| апскейл | `fal-ai/seedvr/upscale/image` | $0.001 / МП | [fal.ai](https://fal.ai/models/fal-ai/seedvr/upscale/image/llms.txt) |

Цены и id — в `bench/config.ts`, это единственный источник. Перед большим прогоном проверьте их на fal.ai: цены могут меняться.

**Тарифицируются ли входные изображения** (проверено 18.10.2026): у Nano Banana 2.1 — да, ~1 120 входных токенов на картинку ≈ $0.002 (на странице модели: «Each input image is about 1,120 tokens, roughly $0.002»), это уже в цене плана. У FLUX 3 и Qwen Image Edit 2511 страницы fal.ai указывают только «$0.048 per 1K image» и «$0.03 per megapixel» и не говорят, входят ли входы; в плане они не учтены, покрываются запасом ×1.2 и сверкой. Разбивка Usage по моделям покажет точно.

Nano Banana 2.1 и FLUX 3 заменили Nano Banana 2 и FLUX.2 [pro] (у обеих есть edit по референсам). Seedream 5.0 Pro в каталоге fal.ai только text-to-image, поэтому Seedream остаётся 4.5.

## Сбои

- **«FAL_KEY not found»** — в `.env.local` нет строки `FAL_KEY=…`.
- **«⛔ skipped — would cross the spending ceiling»** — потолок (с запасом ×1.2), так и задумано. Остаток виден в плане и в `bench:forecast`.
- **«No attributes for … run bench:analyze first»** — сначала `bench:analyze` (или `--no-attrs`).
- **Сетевые ошибки.** До 2 повторов. Если задача уже принята fal.ai, повторяется только опрос результата по тому же `request_id`, без повторной оплаты.
- **Подробности ошибки:** `set BENCH_DEBUG=1` (PowerShell: `$env:BENCH_DEBUG=1`).

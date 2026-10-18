/**
 * Summary report (docs/07 §7) → bench/runs/<run>/report.md. Free, local.
 *
 *   npm run bench:report [-- --run=2026-10-20]
 *
 * Needs scores.json (bench:score); uses ratings.json + review-key.json when
 * present (the manual blind review is the deciding metric).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ABLATION, ANALYZE, COST_SAFETY_FACTOR, FAL_RETENTION_NOTE, LORA, MODELS, PRICES_CHECKED, SPEND_CEILING_USD } from "./config";
import { accuracyTable, attributesLine, type AccuracyRow, type AttributeTruth } from "./lib/attributes";
import { readAttributes } from "./lib/plans";
import { effectiveSpent, formatUsd } from "./lib/cost";
import { fail, parseCommonArgs } from "./lib/cli";
import { loadLedger } from "./lib/ledger";
import { readLog } from "./lib/log";
import { resolveRunId, runDir } from "./lib/paths";
import { allStats, joinRows, percentile, pickForEdits, rankForShoot, recommendThreshold, thresholdTable, type ModelStats, type Row } from "./lib/report-calc";
import { readSubjectsMeta, truthFor } from "./lib/subjects";
import type { RatingsFile, ReviewKey, ScoresFile } from "./lib/types";

const args = parseCommonArgs();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
if (args.dryRun) {
  console.log(`bench:report — local, no fal.ai calls, cost $0.00.\nWould read scores.json (+ ratings.json, review-key.json) in bench/runs/${runId}/ and write report.md.`);
  process.exit(0);
}
const scoresFile = path.join(RUN, "scores.json");
if (!existsSync(scoresFile)) fail(`No scores.json in bench/runs/${runId}. Run bench:score first.`);

const scores = JSON.parse(readFileSync(scoresFile, "utf8")) as ScoresFile;
const ratingsFile = path.join(RUN, "ratings.json");
const keyFile = path.join(RUN, "review-key.json");
const ratings = existsSync(ratingsFile) ? (JSON.parse(readFileSync(ratingsFile, "utf8")) as RatingsFile) : null;
const key = existsSync(keyFile) ? (JSON.parse(readFileSync(keyFile, "utf8")) as ReviewKey) : null;
const meta = new Map(readSubjectsMeta().map((m) => [m.id, m]));
const rows = joinRows(scores.frames, ratings, key, meta);
const ratedCount = rows.filter((r) => r.rating?.similarity).length;

const label = (m: string) => (m === "lora" ? LORA.label : m === ABLATION.key ? ABLATION.label : (MODELS as Record<string, { label: string }>)[m]?.label ?? m);
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const num = (v: number | null, d = 2) => (v === null ? "—" : v.toFixed(d));
const usd = (v: number | null) => (v === null ? "—" : formatUsd(v));

function table(stats: ModelStats[]): string {
  const head = "| Модель | Кадров | Автосходство | Брак | Оценено | Сходство 1–5 | Качество 1–5 | **Годных** | Время | $/кадр | **$/годный** |\n|---|---|---|---|---|---|---|---|---|---|---|";
  const body = stats
    .map((s) => `| ${label(s.model)} | ${s.frames} | ${num(s.autoSimilarity, 3)} | ${pct(s.defectRate)} | ${s.rated} | ${num(s.manualSimilarity)} | ${num(s.manualQuality)} | **${pct(s.sellableShare)}** | ${s.avgSeconds === null ? "—" : `${s.avgSeconds.toFixed(1)} с`} | ${usd(s.costPerFrame)} | **${usd(s.costPerSellable)}** |`)
    .join("\n");
  return `${head}\n${body}`;
}

function groupTable(by: "gender" | "ageGroup" | "skinTone"): string {
  const groups = [...new Set(rows.map((r) => r.group?.[by]).filter(Boolean))] as string[];
  if (!groups.length) return "_В subjects.json нет данных о группах._";
  const models = [...new Set(rows.map((r) => r.model))].sort();
  const head = `| ${{ gender: "Пол", ageGroup: "Возраст", skinTone: "Тон кожи" }[by]} | ${models.map(label).join(" | ")} |\n|---|${models.map(() => "---").join("|")}|`;
  const body = groups
    .map((g) => {
      const cells = models.map((m) => {
        const rs = rows.filter((r) => r.model === m && r.group?.[by] === g);
        const sims = rs.map((r) => r.similarity).filter((v): v is number => v !== null);
        const rated = rs.filter((r) => r.rating?.similarity);
        const sell = rated.length ? rated.filter((r) => r.rating!.sellable).length / rated.length : null;
        return `${sims.length ? (sims.reduce((a, b) => a + b, 0) / sims.length).toFixed(3) : "—"} / ${pct(sell)}`;
      });
      return `| ${g} | ${cells.join(" | ")} |`;
    })
    .join("\n");
  return `${head}\n${body}\n\n_в ячейке: автосходство / доля годных_`;
}

function gallery(model: string): string {
  const rs = rows.filter((r) => r.model === model);
  const score = (r: Row) => (r.rating?.similarity ? r.rating.similarity * 10 + (r.rating.quality ?? 0) : 0) + (r.similarity ?? 0);
  const sorted = [...rs].sort((a, b) => score(b) - score(a));
  const pick = (list: Row[]) => list.map((r) => `<img src="${r.file}" width="150" title="${r.subject} ${r.style}-${r.n}: авто ${num(r.similarity, 3)}${r.rating?.similarity ? `, сходство ${r.rating.similarity}, качество ${r.rating.quality}` : ""}">`).join(" ");
  return `**${label(model)}** — лучшие:<br>${pick(sorted.slice(0, 3))}<br>худшие:<br>${pick(sorted.slice(-3).reverse())}`;
}

const stats = allStats(rows);
const real = allStats(rows.filter((r) => r.subjectType === "real"));
const synth = allStats(rows.filter((r) => r.subjectType === "synth"));
// The ablation group is a control, not a candidate: it never wins the recommendation.
const candidates = (list: ModelStats[]) => list.filter((s) => s.model !== ABLATION.key);
const ranking = rankForShoot(candidates(real.some((s) => s.frames) ? real : stats));
const edits = pickForEdits(candidates(real.some((s) => s.rated) ? real : stats));

// Attributes (bench:analyze) and their accuracy on the personas.
const attrFiles = scores.subjects.map((s) => readAttributes(runId, s.id)).filter((a): a is NonNullable<typeof a> => Boolean(a));
const truths = new Map<string, AttributeTruth>();
for (const s of scores.subjects) if (s.type === "synth") {
  const t = truthFor(s.id);
  if (t) truths.set(s.id, t);
}
const accuracy: AccuracyRow[] = accuracyTable(attrFiles.filter((a) => truths.has(a.subject)), truths);
const ATTR_LABEL: Record<string, string> = { eyeColor: "Цвет глаз", hairColor: "Цвет волос", hairLength: "Длина волос", hairTexture: "Текстура волос", skinTone: "Тон кожи", freckles: "Веснушки", glasses: "Очки", facialHair: "Растительность на лице" };
function accuracySection(): string {
  if (!attrFiles.length) return "_bench:analyze не запускался — признаков нет._";
  const perSubject = attrFiles.map((a) => `| ${a.subject} | ${a.analyzed}/${a.selfies} | ${attributesLine(a).replace(/\|/g, "/")} | ${a.dropped.map((d) => d.key).join(", ") || "—"} |`).join("\n");
  const acc = accuracy.filter((r) => r.compared);
  const accTable = acc.length
    ? `| Признак | Верно | Сравнено | Отброшено (< 60%) | Ошибки |\n|---|---|---|---|---|\n${acc.map((r) => `| ${ATTR_LABEL[r.key] ?? r.key} | ${r.correct} | ${r.compared} | ${r.dropped} | ${r.wrong.map((w) => `${w.subject}: ${w.truth} → ${w.got}`).join("; ") || "—"} |`).join("\n")}\n\nИтого верно: ${acc.reduce((a, r) => a + r.correct, 0)} из ${acc.reduce((a, r) => a + r.compared, 0)} сравнений.`
    : "_Для synth-* нет поля truth в subjects.json._";
  return `Модель: ${ANALYZE.model} через ${ANALYZE.endpoint}, каждое селфи отдельно, голосование большинством, порог согласия 60%. Только видимые признаки — раса, этническое происхождение и возраст числом не определяются и не записываются.

| Участник | Селфи прочитано | Строка в промпте | Отброшено |
|---|---|---|---|
${perSubject}

### Точность на синтетических персонажах (сравнение с truth)

${accTable}`;
}

// Ablation: nb21 with vs without the attribute line, on the same subjects.
function ablationSection(): string {
  const noattr = rows.filter((r) => r.model === ABLATION.key);
  if (!noattr.length) return "_Группа nb21-noattr не генерировалась._";
  const subjectsAbl = [...new Set(noattr.map((r) => r.subject))].sort();
  const withAttr = rows.filter((r) => r.model === ABLATION.baseModel && subjectsAbl.includes(r.subject));
  const both = allStats([...withAttr, ...noattr]);
  const a = both.find((s) => s.model === ABLATION.baseModel);
  const b = both.find((s) => s.model === ABLATION.key);
  const line = (s: ModelStats | undefined) => (s ? `| ${label(s.model)} | ${s.frames} | ${num(s.autoSimilarity, 3)} | ${s.rated} | ${num(s.manualSimilarity)} | ${num(s.manualQuality)} | ${pct(s.sellableShare)} |` : "");
  return `Те же участники (${subjectsAbl.join(", ")}), та же модель, те же сиды — разница только в строке «Subject details».

| Вариант | Кадров | Автосходство | Оценено | Сходство 1–5 | Качество 1–5 | Годных |
|---|---|---|---|---|---|---|
${line(a)}
${line(b)}

${a && b && a.manualSimilarity !== null && b.manualSimilarity !== null ? `Строка признаков ${a.manualSimilarity > b.manualSimilarity ? "**улучшила**" : a.manualSimilarity < b.manualSimilarity ? "**ухудшила**" : "не изменила"} ручное сходство: ${num(a.manualSimilarity)} против ${num(b.manualSimilarity)}. Выборка маленькая (${noattr.length} кадров) — это ориентир, не доказательство.` : "_Нужны ручные оценки обеих групп._"}`;
}
const threshold = recommendThreshold(rows);
const thresholds = thresholdTable(rows, [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7]);
const ledger = loadLedger();
const log = readLog(path.join(RUN, "log.jsonl"));
const loraTrain = log.find((l) => l.kind === "lora-train" && l.status === "ok");
const upscaleLog = readLog(path.join(RUN, "upscale", "log.jsonl")).filter((l) => l.status === "ok");
const { genuine, impostor } = scores.baseline;

const md = `# B0 — отчёт бенчмарка (${runId})

Сформирован ${new Date().toISOString().slice(0, 16).replace("T", " ")} · цены проверены ${PRICES_CHECKED} · **внутренний документ: содержит фото реальных людей, не для публикации**

- Участники: ${scores.subjects.map((s) => `${s.id} (${s.type})`).join(", ")}
- Кадров: ${rows.length} · оценено вслепую: ${ratedCount}${ratings?.rater ? ` (оценщик: ${ratings.rater})` : ""}${ratedCount ? "" : " — **ratings.json ещё нет: решающей метрики нет, выводы ниже только по автометрикам**"}
- Расход (все прогоны B0): насчитано ${formatUsd(ledger.spentUsd)} по прайсу${ledger.reconciled ? `, по fal.ai Usage ${formatUsd(ledger.reconciled.actualUsd)} (сверено ${ledger.reconciled.at.slice(0, 10)})` : ""}; потолок проверяется по ${formatUsd(effectiveSpent(ledger))} (запас ×${COST_SAFETY_FACTOR}) из ${formatUsd(SPEND_CEILING_USD)}

## 1. Модели — все участники

${table(stats)}

## 2. Реальные люди (решающая часть)

${real.length ? table(real) : "_В прогоне нет реальных участников._"}

## 3. Синтетические персонажи

${synth.length ? table(synth) : "_Синтетических участников нет._"}

> У синтетических персонажей эталон сам сгенерирован, поэтому их результаты оптимистичнее реальных. Решают реальные участники.

## 4. По группам

### Пол
${groupTable("gender")}

### Возраст
${groupTable("ageGroup")}

### Тон кожи
${groupTable("skinTone")}

## 5. Порог автосходства (P4)

Метод: ${scores.method}.
Базовая линия по селфи: тот же человек — медиана ${num(percentile(genuine, 50), 3)}, p10 ${num(percentile(genuine, 10), 3)}; разные люди — медиана ${num(percentile(impostor, 50), 3)}, p90 ${num(percentile(impostor, 90), 3)}.

| Порог | Отсеяно кадров с оценкой ≤ 2 | Сохранено кадров с оценкой ≥ 4 | Сохранено всех кадров |
|---|---|---|---|
${thresholds.map((t) => `| ${t.threshold.toFixed(2)} | ${pct(t.badRemoved)} | ${pct(t.goodKept)} | ${pct(t.framesKept)} |`).join("\n")}

${threshold ? `**Предлагаемый порог: ${threshold.threshold.toFixed(2)}** — отсеивает ${pct(threshold.badRemoved)} кадров, которым человек поставил ≤ 2, и сохраняет ${pct(threshold.goodKept)} кадров с оценкой ≥ 4.` : ratedCount ? "_Ни один порог не отсеивает 90% кадров с оценкой ≤ 2 — на этих данных автометрика разделяет их недостаточно._" : `_Нужны ручные оценки. До них отправная точка — p90 «разных людей» (${num(percentile(impostor, 90), 3)}): ниже этого кадр похож на человека не больше, чем незнакомец._`}

## 6. Рекомендация (по данным)

- **Модель для съёмки:** ${ranking[0] ? `${label(ranking[0].model)} — годных ${pct(ranking[0].sellableShare)}, ${usd(ranking[0].costPerSellable)} за годный кадр` : "—"}${ranking[1] ? `; второе место — ${label(ranking[1].model)} (${pct(ranking[1].sellableShare)}, ${usd(ranking[1].costPerSellable)})` : ""}.
- **Модель для правок:** ${edits ? `${label(edits.model)} — самая дешёвая из моделей, отстающих от лучшей по сходству не более чем на 0.3 (${usd(edits.costPerFrame)} за кадр). Это эвристика: правки напрямую не измерялись, проверить в bench:demo.` : "—"}
- **Порог фильтра:** ${threshold ? threshold.threshold.toFixed(2) : "см. §5"}.
${stats.find((s) => s.model === "lora") ? `- **Контроль LoRA** (${loraTrain ? `обучение ${usd(loraTrain.usd)}, ${((loraTrain.ms ?? 0) / 60000).toFixed(1)} мин` : "обучение не запускалось"}): ${(() => {
  const l = stats.find((s) => s.model === "lora")!;
  return `годных ${pct(l.sellableShare)}, сходство ${num(l.manualSimilarity)} / авто ${num(l.autoSimilarity, 3)} — сравните с zero-shot моделями на том же человеке в галереях ниже.`;
})()}` : ""}

## 6а. Признаки внешности (bench:analyze)

${accuracySection()}

## 6б. Абляция: строка признаков в промпте

${ablationSection()}

## 7. Мини-тест апскейла

${upscaleLog.length ? upscaleLog.map((l) => `- ${l.key}: ${usd(l.usd)}, ${((l.ms ?? 0) / 1000).toFixed(1)} с → \`${l.output?.file}\` (${l.output?.width}×${l.output?.height})`).join("\n") : "_Не запускался (npm run bench:upscale)._"}

## 8. Галереи — лучшие и худшие кадры каждой модели

${[...new Set(rows.map((r) => r.model))].sort().map(gallery).join("\n\n")}

## 9. Примечания

- Seedream 4.5 не генерирует меньше ~3.7 МП, поэтому он работал в 1728×2160, а остальные — в классе 1K (~1 МП).
- Nano Banana 2.1 оплачивается токенами: в плане — оценка с запасом (${MODELS.nb21.source.note}).
- У FLUX 3 нет параметра seed — его кадры не воспроизводятся повтором.
- Слепая оценка и автосходство считались по кадрам, приведённым к 880×1100 (JPEG q90), — разрешение и резкость модель не выдают.
- Синтетические персонажи сделаны Qwen Image + Qwen Image Edit 2511 — моделями вне теста.
- Хранение файлов: ${FAL_RETENTION_NOTE}
- После завершения B0 удалите \`bench/subjects/real-*\` (docs/07 §9).
`;

writeFileSync(path.join(RUN, "report.md"), md);
console.log(md.split("\n").slice(0, 14).join("\n"));
console.log(`\nSaved bench/runs/${runId}/report.md`);

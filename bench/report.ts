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
import { ABLATION, ANALYZE, B05, VARIANT_KEYS, FAL_RETENTION_NOTE, LORA, MODELS, PRICES_CHECKED, SPEND_CEILING_USD } from "./config";
import { accuracyTable, attributesLine, type AccuracyRow, type AttributeTruth } from "./lib/attributes";
import { finalAttributes, readAttributes } from "./lib/plans";
import { effectiveSpent, formatUsd } from "./lib/cost";
import { fail, parseCommonArgs } from "./lib/cli";
import { loadLedger } from "./lib/ledger";
import { readLog } from "./lib/log";
import { resolveRunId, runDir } from "./lib/paths";
import { allStats, eligibleForShoot, joinRows, MIN_SELLABLE, percentile, pickForEdits, rankForShoot, safeThreshold, statsFor, thresholdTable, type ModelStats, type Row } from "./lib/report-calc";
import { reviewFiles } from "./lib/review-html";
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
// B0 tables: without the B0.5 variants (they have their own section and ratings file).
const rows = joinRows(scores.frames.filter((f) => !(VARIANT_KEYS as string[]).includes(f.model)), ratings, key, meta);
const ratedCount = rows.filter((r) => r.rating?.similarity).length;

const label = (m: string) =>
  m === "lora" ? LORA.label : m === ABLATION.key ? ABLATION.label : ((B05.variants as Record<string, { label: string }>)[m]?.label ?? (MODELS as Record<string, { label: string }>)[m]?.label ?? m);
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
const shootPool = candidates(real.some((s) => s.frames) ? real : stats);
// A model is recommended only with ≥ MIN_SELLABLE sellable frames; otherwise "not enough data".
const ranking = rankForShoot(eligibleForShoot(shootPool));
function shootRecommendation(pool: ModelStats[], ranked: ModelStats[], rated: number): string {
  if (!rated) return "**недостаточно данных** — нет ручных оценок.";
  if (!ranked.length) {
    const best = [...pool].sort((x, y) => y.sellableCount - x.sellableCount)[0];
    return `**недостаточно данных** — ни у одной модели нет ${MIN_SELLABLE} годных кадров${best ? ` (больше всего у ${label(best.model)}: ${best.sellableCount})` : ""}. Модель не выбирается.`;
  }
  const [first, second] = ranked;
  return `${label(first!.model)} — годных ${first!.sellableCount} (${pct(first!.sellableShare)}), ${usd(first!.costPerSellable)} за годный кадр${second ? `; второе место — ${label(second.model)} (${second.sellableCount}, ${pct(second.sellableShare)}, ${usd(second.costPerSellable)})` : ""}.`;
}
const edits = pickForEdits(candidates(real.some((s) => s.rated) ? real : stats));

// Attributes (bench:analyze) and their accuracy on the personas.
const attrFiles = scores.subjects.map((s) => readAttributes(runId, s.id)).filter((a): a is NonNullable<typeof a> => Boolean(a));
const truths = new Map<string, AttributeTruth>();
for (const s of scores.subjects) if (s.type === "synth") {
  const t = truthFor(s.id);
  if (t) truths.set(s.id, t);
}
const synthFiles = attrFiles.filter((a) => truths.has(a.subject));
// Final = what the prompt uses (hair / eye color from the all-selfies call); vote = per-selfie majority only.
const accuracy: AccuracyRow[] = accuracyTable(synthFiles.map((a) => ({ subject: a.subject, kept: finalAttributes(a).kept })), truths);
const voteAccuracy: AccuracyRow[] = accuracyTable(synthFiles, truths);
const ATTR_LABEL: Record<string, string> = { eyeColor: "Цвет глаз", hairColor: "Цвет волос", hairLength: "Длина волос", hairTexture: "Текстура волос", skinTone: "Тон кожи", freckles: "Веснушки", glasses: "Очки", facialHair: "Растительность на лице" };
const pairs = (list: { subject: string; truth: string; got: string }[]) => list.map((w) => `${w.subject}: ${w.truth} → ${w.got}`).join("; ") || "—";
const accRow = (label: string, r: AccuracyRow) => `| ${label} | ${r.correct}${r.approx ? ` (~${r.approx})` : ""} | ${r.close.length || "—"} | ${r.compared} | ${r.dropped} | ${pairs(r.wrong)}${r.close.length ? ` · близко: ${pairs(r.close)}` : ""} |`;
function accuracySection(): string {
  if (!attrFiles.length) return "_bench:analyze не запускался — признаков нет._";
  const perSubject = attrFiles
    .map((a) => `| ${a.subject} | ${a.analyzed}/${a.selfies} | ${a.colors ? `${a.colors.hairColor ?? "—"} / ${a.colors.eyeColor ?? "—"}` : "—"} | ${a.kept.skinTone?.value ?? "—"} | ${attributesLine(finalAttributes(a)).replace(/\|/g, "/")} | ${a.dropped.map((d) => d.key).join(", ") || "—"} |`)
    .join("\n");
  const acc = accuracy.filter((r) => r.compared);
  const colorCompare = (["hairColor", "eyeColor"] as const)
    .map((k) => {
      const f = accuracy.find((r) => r.key === k)!;
      const v = voteAccuracy.find((r) => r.key === k)!;
      return f.compared ? `| ${ATTR_LABEL[k]} | ${v.correct}/${v.compared} (отброшено ${v.dropped}) | ${f.correct}/${f.compared} (отброшено ${f.dropped}) |` : "";
    })
    .filter(Boolean)
    .join("\n");
  const accTable = acc.length
    ? `| Признак | Верно | Близко | Сравнено | Отброшено (< 60%) | Ошибки |\n|---|---|---|---|---|---|\n${acc.map((r) => accRow(ATTR_LABEL[r.key] ?? r.key, r)).join("\n")}

Итого верно: ${acc.reduce((a, r) => a + r.correct, 0)} из ${acc.reduce((a, r) => a + r.compared, 0)} сравнений. «~» — соседнее значение засчитано как совпадение (chin-length ↔ shoulder-length); gray = grey = salt-and-pepper. «Близко» — тон кожи на одну ступень шкалы fair–light–medium–olive–brown–deep, в «верно» не входит.

### Цвета: голосование по отдельным селфи vs один вызов со всеми селфи

| Признак | Голосование по селфи | Все селфи сразу (идёт в промпт) |
|---|---|---|
${colorCompare}`
    : "_Для synth-* нет поля truth в subjects.json._";
  return `Модель: ${ANALYZE.model} через ${ANALYZE.endpoint}. Два вида вызовов: каждое селфи отдельно (голосование большинством, порог 60%) и один вызов со всеми селфи — только цвет волос и глаз с поправкой на освещение. Только видимые признаки — раса, этническое происхождение и возраст числом не определяются и не записываются. Тон кожи в промпт не идёт (риск осветлить или затемнить кожу при плохом свете): строка всегда заканчивается «Keep the exact skin tone and hair color from the photos.»

| Участник | Селфи прочитано | Волосы / глаза (все селфи) | Тон кожи (голосование) | Строка в промпте | Отброшено |
|---|---|---|---|---|---|
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
// ─── B0.5: 5 variants on real-01 / real-02, own blind review (ratings-b05.json) ───
const B05_FILES = reviewFiles("b05");
const readJson = <T,>(f: string): T | null => (existsSync(path.join(RUN, f)) ? (JSON.parse(readFileSync(path.join(RUN, f), "utf8")) as T) : null);
const b05Key = readJson<ReviewKey>(B05_FILES.key);
const b05Ratings = readJson<RatingsFile>(B05_FILES.ratings);
const B05_MODELS: string[] = [...B05.anchors, ...VARIANT_KEYS];
const b05Frames = scores.frames.filter((f) => B05.subjects.includes(f.subject) && B05_MODELS.includes(f.model));
// flux3-nbfix edits a flux3 frame: its real cost per frame includes that frame.
const flux3Usd = new Map(b05Frames.filter((f) => f.model === "flux3").map((f) => [`${f.subject}/${f.style}-${f.n}`, f.usd ?? 0]));
const b05Rows = joinRows(
  b05Frames.map((f) => (f.model === "flux3-nbfix" && typeof f.usd === "number" ? { ...f, usd: f.usd + (flux3Usd.get(`${f.subject}/${f.style}-${f.n}`) ?? 0) } : f)),
  b05Ratings,
  b05Key,
  meta,
);
const b05Stats = B05_MODELS.map((m) => statsFor(m, b05Rows)).filter((s) => s.frames);
const b05Rated = b05Rows.filter((r) => r.rating?.similarity && r.rating?.quality).length;
const b05Ranking = rankForShoot(eligibleForShoot(b05Stats));
function b05Section(): string {
  if (!b05Frames.some((f) => (VARIANT_KEYS as string[]).includes(f.model))) return "_B0.5 ещё не запускался (npm run bench:run -- --only=nb21-strict,flux3-premium,flux3-nbfix --subjects=real-01,real-02)._";
  const head = "| Вариант | Кадров | Оценено | Сходство 1–5 | Качество 1–5 | **Годных** | Автосходство | $/кадр | **$/годный** |\n|---|---|---|---|---|---|---|---|---|";
  const body = b05Stats
    .map((s) => `| ${label(s.model)}${(B05.anchors as readonly string[]).includes(s.model) ? " (якорь, кадры B0)" : ""} | ${s.frames} | ${s.rated} | ${num(s.manualSimilarity)} | ${num(s.manualQuality)} | **${s.sellableCount}${s.rated ? ` (${pct(s.sellableShare)})` : ""}** | ${num(s.autoSimilarity, 3)} | ${usd(s.costPerFrame)} | **${usd(s.costPerSellable)}** |`)
    .join("\n");
  return `Участники: ${B05.subjects.join(", ")}. Все кадры оценены заново в отдельной слепой оценке (\`${B05_FILES.html}\` → \`${B05_FILES.ratings}\`); кадры nb21 и flux3 — те же, что в B0 (якоря, не перегенерировались), под новыми id. Оценок B0.5: ${b05Rated}${b05Ratings ? "" : " — **ratings-b05.json ещё нет**"}.

${head}
${body}

- $/кадр у «FLUX 3 → Nano Banana 2.1 fix» включает исходный кадр FLUX 3 (двухшаговый вариант).
- **Вывод B0.5:** ${shootRecommendation(b05Stats, b05Ranking, b05Rated)}
- Выборка — 8 кадров на вариант (2 человека × 2 стиля × 2 кадра): это проверка направления, а не статистика.`;
}

// Threshold against obvious rejects: the highest that keeps ≥ 95% of the frames rated likeness ≥ 4.
const safe = safeThreshold(rows);
const gridFrom = Math.floor(((percentile(scores.baseline.impostor, 50) ?? 0.5) * 50)) / 50;
const grid = Array.from({ length: Math.max(0, Math.round((0.98 - gridFrom) / 0.02)) + 1 }, (_, i) => Math.round((gridFrom + i * 0.02) * 100) / 100);
const thresholds = thresholdTable(rows, [...new Set([...grid, ...(safe ? [safe.threshold] : [])])].sort((x, y) => x - y));
const ledger = loadLedger();
const log = readLog(path.join(RUN, "log.jsonl"));
const loraTrain = log.find((l) => l.kind === "lora-train" && l.status === "ok");
const upscaleLog = readLog(path.join(RUN, "upscale", "log.jsonl")).filter((l) => l.status === "ok");
const { genuine, impostor } = scores.baseline;

const md = `# B0 — отчёт бенчмарка (${runId})

Сформирован ${new Date().toISOString().slice(0, 16).replace("T", " ")} · цены проверены ${PRICES_CHECKED} · **внутренний документ: содержит фото реальных людей, не для публикации**

- Участники: ${scores.subjects.map((s) => `${s.id} (${s.type})`).join(", ")}
- Кадров: ${rows.length} · оценено вслепую: ${ratedCount}${ratings?.rater ? ` (оценщик: ${ratings.rater})` : ""}${ratedCount ? "" : " — **ratings.json ещё нет: решающей метрики нет, выводы ниже только по автометрикам**"}
- Расход (все прогоны B0): насчитано ${formatUsd(ledger.spentUsd)} по прайсу${ledger.reconciled ? `, по fal.ai Usage ${formatUsd(ledger.reconciled.actualUsd)} (сверено ${ledger.reconciled.at.slice(0, 10)})` : ""}; потолок B0 проверяется по ${formatUsd(effectiveSpent(ledger))} (с запасом по моделям, без демо) из ${formatUsd(SPEND_CEILING_USD)}

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

${safe ? `**Порог против явного брака: ${safe.threshold.toFixed(3)}** — максимальный, при котором сохраняется ≥ 95% кадров с ручным сходством ≥ 4 (сохраняется ${pct(safe.goodKept)} из ${safe.goodFrames}). При нём отсеивается ${pct(safe.badRemoved)} кадров с оценкой ≤ 2 и остаётся ${pct(safe.framesKept)} всех оценённых кадров. Это фильтр только для явного брака: решает ручная оценка, а не автометрика.` : ratedCount ? "_Меньше 5 кадров с ручным сходством ≥ 4 — порог против явного брака не считается (недостаточно данных)._" : `_Нужны ручные оценки. До них отправная точка — p90 «разных людей» (${num(percentile(impostor, 90), 3)}): ниже этого кадр похож на человека не больше, чем незнакомец._`}

## 6. Рекомендация (по данным)

- **Модель для съёмки:** ${shootRecommendation(shootPool, ranking, ratedCount)}
- **Модель для правок:** ${edits ? `${label(edits.model)} — самая дешёвая из моделей, отстающих от лучшей по сходству не более чем на 0.3 (${usd(edits.costPerFrame)} за кадр). Это эвристика: правки напрямую не измерялись, проверить в bench:demo.` : "—"}
- **Порог фильтра (против явного брака):** ${safe ? `${safe.threshold.toFixed(3)} — сохраняет ≥ 95% кадров с оценкой ≥ 4` : "недостаточно данных (см. §5)"}.
${stats.find((s) => s.model === "lora") ? `- **Контроль LoRA** (${loraTrain ? `обучение ${usd(loraTrain.usd)}, ${((loraTrain.ms ?? 0) / 60000).toFixed(1)} мин` : "обучение не запускалось"}): ${(() => {
  const l = stats.find((s) => s.model === "lora")!;
  return `годных ${pct(l.sellableShare)}, сходство ${num(l.manualSimilarity)} / авто ${num(l.autoSimilarity, 3)} — сравните с zero-shot моделями на том же человеке в галереях ниже.`;
})()}` : ""}

## 6а. Признаки внешности (bench:analyze)

${accuracySection()}

## 6б. Абляция: строка признаков в промпте

${ablationSection()}

## 6в. B0.5 — мини-тест на реальных людях

${b05Section()}

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

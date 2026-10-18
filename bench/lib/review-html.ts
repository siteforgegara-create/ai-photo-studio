/**
 * Builds bench/runs/<run>/review.html — the blind manual review (docs/07 §5).
 * Pure: data in, HTML string out (tested in review.test.ts). The page shows
 * each subject's selfies and all frames shuffled, WITHOUT the model; the
 * id → model mapping lives in review-key.json, never in the HTML.
 */
import { createHash } from "node:crypto";
import type { ReviewData, ReviewKey, ReviewSubject } from "./types";

/** Frames are copied here under their opaque id, so nothing in the page reveals the model. */
export const REVIEW_IMG_DIR = "review-img";

export type FrameRef = { file: string; subject: string; model: string; style: string; n: number };

/** Stable opaque id for a frame (no model name inside). */
export function frameId(run: string, file: string): string {
  return "f" + createHash("sha256").update(`${run}:${file}`).digest("hex").slice(0, 10);
}

/** Deterministic shuffle (mulberry32 seeded by text), so re-building the page keeps the order. */
export function shuffle<T>(items: T[], seedText: string): T[] {
  let seed = parseInt(createHash("sha256").update(seedText).digest("hex").slice(0, 8), 16);
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Turns frames + selfies into review data and the secret key. */
export function prepareReview(
  run: string,
  subjects: { id: string; type: "real" | "synth"; selfies: string[] }[],
  frames: FrameRef[],
): { data: ReviewData; key: ReviewKey } {
  const key: ReviewKey = {};
  const list: ReviewSubject[] = subjects
    .map((s) => {
      const own = frames.filter((f) => f.subject === s.id);
      const reviewFrames = shuffle(
        own.map((f) => {
          const id = frameId(run, f.file);
          key[id] = { file: f.file, subject: f.subject, model: f.model, style: f.style, n: f.n };
          // Copied to review-img/<id>.jpg by bench:review: the original path (…/nb2/…) would reveal the model.
          return { id, src: `${REVIEW_IMG_DIR}/${id}.jpg` };
        }),
        `${run}:${s.id}`,
      );
      return { id: s.id, type: s.type, selfies: s.selfies, frames: reviewFrames };
    })
    .filter((s) => s.frames.length > 0);
  return { data: { run, createdAt: new Date().toISOString(), subjects: list }, key };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Nothing in the output names a model: images are review-img/<opaque id>.jpg, labels are positional. */
export function buildReviewHtml(data: ReviewData): string {
  const total = data.subjects.reduce((n, s) => n + s.frames.length, 0);
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const sections = data.subjects
    .map(
      (s, si) => `
  <section class="subject" aria-labelledby="h-${si}">
    <h2 id="h-${si}">Участник ${si + 1} <span class="tag">${s.type === "real" ? "реальный" : "синтетический"}</span></h2>
    <p class="hint">Селфи (входные фото):</p>
    <div class="selfies">${s.selfies.map((src, i) => `<img src="${esc(src)}" alt="Селфи ${i + 1}" loading="lazy" data-zoom>`).join("")}</div>
    <p class="hint">Кадры (${s.frames.length}), модель скрыта:</p>
    <div class="grid">${s.frames
      .map(
        (f, fi) => `
      <article class="frame" data-id="${f.id}">
        <img src="${esc(f.src)}" alt="Кадр ${fi + 1}" loading="lazy" data-zoom>
        <div class="controls">
          <div class="no">#${fi + 1}</div>
          ${scale("similarity", "Сходство", f.id)}
          ${scale("quality", "Качество", f.id)}
          <label class="sell"><input type="checkbox" name="${f.id}-sellable"> Годный для продажи</label>
        </div>
      </article>`,
      )
      .join("")}
    </div>
  </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>B0 — слепая оценка (${esc(data.run)})</title>
<style>
  :root { --bg:#f3f5f8; --surface:#fff; --border:#e4e7ec; --text:#1e2431; --muted:#646e81; --brand:#db2f5c; }
  * { box-sizing: border-box; }
  body { margin:0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }
  header { position:sticky; top:0; z-index:5; background:var(--surface); border-bottom:1px solid var(--border); padding:12px 20px; display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  header h1 { font-size:17px; margin:0 12px 0 0; }
  .progress { color:var(--muted); }
  header input[type=text] { padding:6px 10px; border:1px solid var(--border); border-radius:8px; font:inherit; }
  button { font:inherit; padding:8px 14px; border-radius:10px; border:1px solid var(--border); background:var(--surface); cursor:pointer; }
  button.primary { background:var(--brand); color:#fff; border-color:var(--brand); font-weight:600; }
  main { max-width:1400px; margin:0 auto; padding:20px; }
  .intro { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 18px; margin-bottom:20px; }
  .intro li { margin:2px 0; }
  .subject { margin-bottom:36px; }
  h2 { font-size:20px; margin:0 0 6px; }
  .tag { font-size:12px; font-weight:600; color:var(--muted); border:1px solid var(--border); border-radius:999px; padding:2px 8px; vertical-align:middle; }
  .hint { color:var(--muted); margin:10px 0 6px; }
  .selfies { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; }
  .selfies img { height:140px; border-radius:10px; border:1px solid var(--border); cursor:zoom-in; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:14px; }
  .frame { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .frame.done { border-color:#12a37a; box-shadow:0 0 0 1px #12a37a; }
  .frame img { display:block; width:100%; aspect-ratio:4/5; object-fit:cover; cursor:zoom-in; background:#e9ecf0; }
  .controls { padding:10px 12px; display:grid; gap:6px; }
  .no { font-size:12px; color:var(--muted); }
  fieldset { border:0; padding:0; margin:0; display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
  legend { width:100%; font-size:13px; font-weight:600; padding:0; margin-bottom:2px; }
  fieldset label { display:inline-flex; }
  fieldset input { position:absolute; opacity:0; width:1px; height:1px; }
  fieldset span { display:inline-flex; width:30px; height:30px; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:8px; cursor:pointer; font-weight:600; }
  fieldset input:checked + span { background:var(--text); color:#fff; border-color:var(--text); }
  fieldset input:focus-visible + span { outline:2px solid var(--brand); outline-offset:2px; }
  .sell { font-size:14px; display:flex; gap:6px; align-items:center; }
  @media (max-width: 600px) { header { position:static; } }
  dialog { border:0; padding:0; background:transparent; max-width:96vw; max-height:96vh; }
  dialog::backdrop { background:rgba(13,19,27,.8); }
  dialog img { max-width:96vw; max-height:92vh; display:block; border-radius:8px; }
</style>
</head>
<body>
<header>
  <h1>B0 · слепая оценка</h1>
  <span class="progress" id="progress">0 / ${total} оценено</span>
  <label>Оценщик: <input type="text" id="rater" placeholder="имя (необязательно)"></label>
  <button type="button" id="load">Загрузить ratings.json</button>
  <button type="button" class="primary" id="save">Сохранить оценки</button>
  <input type="file" id="file" accept="application/json" hidden>
</header>
<main>
  <div class="intro">
    <strong>Как оценивать</strong> (прогон ${esc(data.run)}, ${total} кадров). Модель скрыта, порядок перемешан.
    <ul>
      <li><b>Сходство 1–5</b> — «узнал бы я этого человека?» 1 — чужой человек, 3 — похож, но что-то не так, 5 — точно он/она.</li>
      <li><b>Качество 1–5</b> — артефакты, «пластиковая» кожа, руки, зубы, уши, фон. 5 — не отличить от хорошей фотосессии.</li>
      <li><b>Годный для продажи</b> — отдали бы этот кадр клиенту за деньги.</li>
      <li>Оценки сохраняются в браузере автоматически. В конце нажмите «Сохранить оценки» и положите скачанный <code>ratings.json</code> в папку прогона рядом с этим файлом.</li>
      <li>Клик по фото — увеличить.</li>
    </ul>
  </div>
  ${sections}
</main>
<dialog id="zoom"><img alt=""></dialog>
<script type="application/json" id="data">${json}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById("data").textContent);
  var storeKey = "b0-ratings-" + data.run;
  var ratings = {};
  try { ratings = JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch (e) {}
  var rater = document.getElementById("rater");
  try { rater.value = localStorage.getItem(storeKey + "-rater") || ""; } catch (e) {}
  var total = ${total};

  function persist() {
    try { localStorage.setItem(storeKey, JSON.stringify(ratings)); localStorage.setItem(storeKey + "-rater", rater.value); } catch (e) {}
    render();
  }
  function render() {
    var done = 0;
    document.querySelectorAll(".frame").forEach(function (el) {
      var r = ratings[el.dataset.id] || {};
      ["similarity", "quality"].forEach(function (k) {
        el.querySelectorAll('input[data-k="' + k + '"]').forEach(function (i) { i.checked = Number(i.value) === r[k]; });
      });
      el.querySelector('input[type=checkbox]').checked = !!r.sellable;
      var ok = r.similarity && r.quality;
      el.classList.toggle("done", !!ok);
      if (ok) done++;
    });
    document.getElementById("progress").textContent = done + " / " + total + " оценено";
  }
  document.addEventListener("change", function (e) {
    var t = e.target, frame = t.closest && t.closest(".frame");
    if (!frame) return;
    var id = frame.dataset.id, r = ratings[id] || (ratings[id] = {});
    if (t.type === "radio") r[t.dataset.k] = Number(t.value);
    if (t.type === "checkbox") r.sellable = t.checked;
    persist();
  });
  rater.addEventListener("input", persist);
  document.getElementById("save").addEventListener("click", function () {
    var out = { run: data.run, savedAt: new Date().toISOString(), rater: rater.value || undefined, ratings: ratings };
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ratings.json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  document.getElementById("load").addEventListener("click", function () { document.getElementById("file").click(); });
  document.getElementById("file").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (txt) { var j = JSON.parse(txt); ratings = j.ratings || {}; if (j.rater) rater.value = j.rater; persist(); });
  });
  var dlg = document.getElementById("zoom");
  document.addEventListener("click", function (e) {
    if (e.target.matches && e.target.matches("img[data-zoom]")) { dlg.querySelector("img").src = e.target.src; dlg.showModal(); }
    else if (e.target === dlg || e.target.closest && e.target.closest("dialog")) dlg.close();
  });
  render();
})();
</script>
</body>
</html>
`;
}

function scale(k: "similarity" | "quality", label: string, id: string): string {
  return `<fieldset><legend>${label}</legend>${[1, 2, 3, 4, 5]
    .map((v) => `<label><input type="radio" name="${id}-${k}" value="${v}" data-k="${k}"><span>${v}</span></label>`)
    .join("")}</fieldset>`;
}

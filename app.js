/* ==============================
   STATUS
============================== */
const STATUS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=0&single=true&output=csv";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** parser **/
function parseCSVToKV(csvText) {
  const cleaned = String(csvText ?? "").replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return {};

  const header = lines[0].toLowerCase();
  if (!header.includes("key") || !header.includes("value")) {
    throw new Error("Not a CSV response (missing key/value header)");
  }

  const kv = {};
  for (const line of lines.slice(1)) {
    const cols = line
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""));

    const key = cols[0];
    const value = cols[1] ?? "";

    if (key) kv[key] = value;
  }
  return kv;
}

/** normalize **/
function normalizeBool(v) {
  const s = String(v ?? "").trim().toUpperCase();
  return (
    s === "TRUE" ||
    s === "T" ||
    s === "YES" ||
    s === "Y" ||
    s === "1" ||
    s === "ON"
  );
}

/** renderStatus **/
function renderStatus(state) {
  const optOpen = document.getElementById("optOpen");
  const optClosed = document.getElementById("optClosed");
  const text = document.getElementById("statusText");

  if (!optOpen || !optClosed || !text) return;

  optOpen.classList.remove("is-active");
  optClosed.classList.remove("is-active");

  if (state === "open") {
    optOpen.classList.add("is-active");
    text.textContent = "지금은 연락을 받을 수 있어요.";
  } else if (state === "closed") {
    optClosed.classList.add("is-active");
    text.textContent = "지금은 휴식 중이에요. 문의 남겨주시면 확인 후 답변드려요.";
  } else {
    text.textContent = "상태를 불러오는 중 문제가 있었어요. 잠시 후 다시 확인해주세요.";
  }
}

/** fetch **/
async function fetchTextWithRetry(url, retries = 2) {
  let lastErr = null;

  for (let i = 0; i <= retries; i++) {
    try {
      const bust = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;

      const res = await fetch(bust, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const txt = await res.text();
      return txt;
    } catch (e) {
      lastErr = e;
      await sleep(200);
    }
  }
  throw lastErr;
}

/** loadStatus **/
async function loadStatus() {
  try {
    const csv = await fetchTextWithRetry(STATUS_CSV_URL, 2);
    const kv = parseCSVToKV(csv);

    if (!Object.prototype.hasOwnProperty.call(kv, "contact_open")) {
      renderStatus("unknown");
      return;
    }

    const isOpen = normalizeBool(kv.contact_open);
    renderStatus(isOpen ? "open" : "closed");
  } catch (e) {
    renderStatus("unknown");
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", loadStatus);







const RAW_BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=926551920&single=true&output=csv";
const PRICE_MIN_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=1575211476&single=true&output=csv";
const EXTRA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=1808152056&single=true&output=csv";
const SHORTFORM_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=2033236241&single=true&output=csv";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function formatKRW(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0원";
  return Math.round(num).toLocaleString("ko-KR") + "원";
}

function parseCSV(text) {
  const cleaned = String(text ?? "").replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    rows.push(row);
  }
  return rows;
}

async function fetchCSV(url, retries = 2) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const bust = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const res = await fetch(bust, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      return parseCSV(text);
    } catch (e) {
      lastErr = e;
      await sleep(200);
    }
  }
  throw lastErr;
}

let RAW_BASE = [];
let PRICE_MIN = [];
let EXTRA = [];
let SHORTFORM = [];

async function loadCalcData() {
  if (!RAW_BASE_URL || !PRICE_MIN_URL || !EXTRA_URL) return;

  const rawRows = await fetchCSV(RAW_BASE_URL, 2);
  RAW_BASE = rawRows.map((r) => ({
    label: String(r.label ?? "").trim(),
    min_sec: toInt(r.min_sec),
    max_sec: toInt(r.max_sec),
    base_price: toInt(r.base_price),
  }));

  const rateRows = await fetchCSV(PRICE_MIN_URL, 2);
  PRICE_MIN = rateRows.map((r) => ({
    package: String(r.package ?? "").trim(),
    edit_point: String(r.edit_point ?? "").trim(),
    price_per_min: toInt(r.price_per_min),
  }));

  const extraRows = await fetchCSV(EXTRA_URL, 2);
  EXTRA = extraRows.map((r) => ({
    label: String(r.label ?? "").trim(),
    type: String(r.type ?? "").trim(),
    value: Number(r.value),
  }));

  if (SHORTFORM_URL) {
    const sfRows = await fetchCSV(SHORTFORM_URL, 2);
    SHORTFORM = sfRows.map((r) => ({
      label: String(r.label ?? "").trim(),
      edit_point: String(r.edit_point ?? "").trim(),
      base_price: toInt(r.base_price),
    }));
  }
}

function findBasePrice(rawMin) {
  const rawSec = rawMin * 60;
  const row = RAW_BASE.find((r) => rawSec >= r.min_sec && rawSec <= r.max_sec);
  return row ? row.base_price : null;
}

function findPricePerMin(pkg, editPoint) {
  if (pkg === "economy") {
    const row = PRICE_MIN.find((r) => r.package === "economy");
    return row ? row.price_per_min : null;
  }
  const row = PRICE_MIN.find((r) => r.package === pkg && r.edit_point === editPoint);
  return row ? row.price_per_min : null;
}

function getExtraDef(label) {
  return EXTRA.find((e) => e.label === label) || null;
}

function getActiveExtraLabels() {
  const chips = document.querySelectorAll("#extraToggles .chip");
  const labels = [];
  for (const c of chips) {
    if (c.classList.contains("is-active")) {
      labels.push(c.getAttribute("data-extra") || c.textContent.trim());
    }
  }
  const rush = labels.filter((l) => l === "빠른 마감" || l === "우선 마감");
  if (rush.length > 1) {
    return labels
      .filter((l) => !(l === "빠른 마감" || l === "우선 마감"))
      .concat(rush[rush.length - 1]);
  }
  return labels;
}

function getActiveCollabCount() {
  const chips = document.querySelectorAll("#collabBtns .chip");
  for (const c of chips) {
    if (c.classList.contains("is-active")) {
      return toInt(c.getAttribute("data-collab"), 0);
    }
  }
  return 0;
}

function getMomentCount() {
  const el = document.getElementById("momentVal");
  return toInt(el?.value, 0);
}

function setMomentCount(n) {
  const v = Math.max(0, Math.min(99, toInt(n, 0)));
  const el = document.getElementById("momentVal");
  if (el) el.value = String(v);
}

function setMomentCount(n) {
  const v = Math.max(0, Math.min(99, toInt(n, 0)));
  const el = document.getElementById("momentVal");
  if (el) el.textContent = String(v);
}

function computeTotal() {
  const notice = document.getElementById("noticeText");
  const rawMin = toInt(document.getElementById("rawMin")?.value, 0);
  const finalMin = toInt(document.getElementById("finalMin")?.value, 0);
  const pkg = document.getElementById("package")?.value;
  const editPoint = document.getElementById("editPoint")?.value;

  if (!RAW_BASE.length || !PRICE_MIN.length || !EXTRA.length) {
    if (notice) notice.textContent = "※ 계산 시트 URL이 아직 연결되지 않았습니다.";
    return { ok: false, total: 0, reason: "no_data" };
  }

  const base = findBasePrice(rawMin);
  if (base === null) {
    if (notice) notice.textContent = "※ 원본 영상 길이가 150분 이상인 경우, 별도 문의가 필요합니다.";
    return { ok: false, total: 0, reason: "inquiry" };
  }

  const perMin = findPricePerMin(pkg, editPoint);
  if (perMin === null) {
    if (notice) notice.textContent = "※ 단가 정보를 불러오지 못했습니다.";
    return { ok: false, total: 0, reason: "rate_missing" };
  }

  if (notice) notice.textContent = "";

  const work = finalMin * perMin;
  const activeExtraLabels = getActiveExtraLabels();
  const collabAddCount = getActiveCollabCount();
  const momentCount = getMomentCount();

  let addFixed = 0;
  let addPerMin = 0;
  let mults = [];

  for (const label of activeExtraLabels) {
    const def = getExtraDef(label);
    if (!def) continue;

    if (def.type === "add") {
      addFixed += Number(def.value) || 0;
    } else if (def.type === "mult") {
      mults.push(Number(def.value) || 1);
    } else if (def.type === "per_min") {
      if (label === "합방 인원 추가") {
        addPerMin += finalMin * (Number(def.value) || 0) * collabAddCount;
      } else {
        addPerMin += finalMin * (Number(def.value) || 0);
      }
    }
  }

  const momentDef = getExtraDef("시점 추가");
  if (momentDef && momentDef.type === "add") {
    addFixed += (Number(momentDef.value) || 0) * momentCount;
  }

  let subtotal = base + work + addFixed + addPerMin;
  let multExtra = 0;

  for (const m of mults) {
    if (m > 1) multExtra += subtotal * (m - 1);
  }

  return { ok: true, total: subtotal + multExtra };
}


function getSelectedText(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return "";
  const opt = sel.options?.[sel.selectedIndex];
  return (opt?.textContent || "").trim();
}

function syncCalcToForm() {
  const fFinalLen = document.getElementById("fFinalLen");
  const fEtc = document.getElementById("fEtc");
  if (!fFinalLen && !fEtc) return;

  const rawMin = toInt(document.getElementById("rawMin")?.value, 0);
  const finalMin = toInt(document.getElementById("finalMin")?.value, 0);

  if (fFinalLen && finalMin > 0) {
    fFinalLen.value = `${finalMin}분`;
  }

  // 요약문은 '그 외 요구사항' 하단에 자동 첨부 (기존 내용은 유지)
  if (!fEtc) return;

  const pkgText = getSelectedText("package");
  const editText = getSelectedText("editPoint");
  const extras = getActiveExtraLabels();
  const collab = getActiveCollabCount();
  const moment = getMomentCount();

  const totalText = (document.getElementById("totalText")?.textContent || "").trim();

  const extraLines = [];
  if (extras.length) extraLines.push(`- 추가금: ${extras.join(", ")}`);
  if (collab > 0) extraLines.push(`- 합방 인원 추가: ${collab}명`);
  if (moment > 0) extraLines.push(`- 시점 추가: ${moment}회`);

  const summary =
`[견적 계산기 입력 요약]
- 원본 영상 길이: ${rawMin || 0}분
- 희망 영상 길이: ${finalMin || 0}분
- 희망 타입: ${pkgText || "-"}
- 편집점: ${editText || "-"}
${extraLines.length ? extraLines.join("\n") : "- 추가 항목: 없음"}
- 예상 총액: ${totalText || "0원"}`;

  const markerStart = "[견적 계산기 입력 요약]";
  const markerIdx = fEtc.value.indexOf(markerStart);

  if (markerIdx >= 0) {
    fEtc.value = fEtc.value.slice(0, markerIdx).trimEnd() + "\n\n" + summary;
  } else {
    const base = fEtc.value.trim();
    fEtc.value = (base ? base + "\n\n" : "") + summary;
  }
}


/* ==============================
   FORM (문의 양식) + CALC (견적 계산기)
============================== */
function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return (el.value ?? el.textContent ?? "").toString().trim();
}

function getActiveChips(containerId) {
  const root = document.getElementById(containerId);
  if (!root) return [];
  return [...root.querySelectorAll(".chip.is-active")];
}

function getSelectLabel(id) {
  const el = document.getElementById(id);
  if (!el || el.tagName !== "SELECT") return getVal(id);
  const opt = el.options?.[el.selectedIndex];
  return (opt?.textContent || opt?.value || "").trim();
}

function buildCalcSummaryText() {
  const rawMin = getVal("rawMin");
  const finalMin = getVal("finalMin");
  const pkgLabel = getSelectLabel("package");
  const editPointLabel = getSelectLabel("editPoint");

  const momentVal = (() => {
    const n = parseInt(getVal("momentVal"), 10);
    return Number.isFinite(n) ? n : 0;
  })();

  const extraChips = getActiveChips("extraToggles")
    .map((chip) => (chip.getAttribute("data-extra") || chip.textContent || "").trim())
    .filter(Boolean);

  const collabChip = getActiveChips("collabBtns")[0];
  const collab = (collabChip?.getAttribute("data-collab") || collabChip?.textContent || "").trim();

  const totalText = (document.getElementById("totalText")?.textContent || "").trim();
  const noticeText = (document.getElementById("noticeText")?.textContent || "").trim();

  const lines = [];
  lines.push("[견적 계산기 입력 내용]");
  lines.push("");
  lines.push(`원본 영상 길이: ${rawMin ? `${rawMin}분` : "-"}`);
  lines.push(`희망 영상 길이: ${finalMin ? `${finalMin}분` : "-"}`);
  lines.push(`희망 타입: ${pkgLabel || "-"}`);
  lines.push(`편집점: ${editPointLabel || "-"}`);
  lines.push(`시점(+): ${momentVal}`);
  lines.push(`합방 인원 추가: ${collab || "-"}`);

  if (extraChips.length) {
    lines.push("추가금 항목:");
    extraChips.forEach((t) => lines.push(`- ${t}`));
  } else {
    lines.push("추가금 항목: -");
  }

  lines.push("");
  lines.push(`총 금액: ${totalText || "-"}`);
  if (noticeText) lines.push(`안내: ${noticeText}`);

  return lines.join("\n");
}

function buildInquiryFormText() {
  const fChannel = (document.getElementById("fChannel")?.value || "").trim();
  const fFinalLen = (document.getElementById("fFinalLen")?.value || "").trim();
  const fConcept = (document.getElementById("fConcept")?.value || "").trim();
  const fEtc = (document.getElementById("fEtc")?.value || "").trim();

  const lines = [];
  lines.push("[문의 양식]");
  lines.push("");
  lines.push(`유튜브 채널 링크: ${fChannel || "-"}`);
  lines.push(`원본 영상 공유: ${fFinalLen || "-"}`);
  lines.push("");
  lines.push("[영상 콘셉트 및 레퍼런스 자료]");
  lines.push(fConcept || "-");
  lines.push("");
  lines.push("[그 외 요구사항]");
  lines.push(fEtc || "-");

  return lines.join("\n");
}

function buildFullCopyText() {
  return `${buildCalcSummaryText()}\n\n--------------------------------------\n\n${buildInquiryFormText()}`.trim();
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) {
    return false;
  }
}

function setFormToast(message) {
  const toast = document.getElementById("formToast");
  if (!toast) return;
  toast.textContent = message || "";
  if (!message) return;
  window.clearTimeout(setFormToast._t);
  setFormToast._t = window.setTimeout(() => {
    toast.textContent = "";
  }, 2200);
}

function bindFormUI() {
  const btnCopy = document.getElementById("btnCopyForm");
  const btnReset = document.getElementById("btnResetForm");

  btnCopy?.addEventListener("click", async () => {
    const text = buildFullCopyText();
    const ok = await copyTextToClipboard(text);
    setFormToast(ok ? "견적 계산기 + 문의 양식 복사 완료! 그대로 붙여넣기 하시면 돼요." : "복사에 실패했어요. 브라우저 권한을 확인해 주세요.");
  });

  btnReset?.addEventListener("click", () => {
    ["fChannel", "fFinalLen", "fConcept", "fEtc"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    setFormToast("초기화 완료!");
  });
}

function bindCalcUI() {
  const resetTotal = () => {
    const totalEl = document.getElementById("totalText");
    if (totalEl) totalEl.textContent = "0원";
  };

  document.getElementById("extraToggles")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const group = chip.getAttribute("data-group");
    if (group) {
      const all = document.querySelectorAll(`#extraToggles .chip[data-group="${group}"]`);
      all.forEach((el) => {
        if (el !== chip) el.classList.remove("is-active");
      });
    }
    chip.classList.toggle("is-active");
    resetTotal();
  });

  document.getElementById("collabBtns")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const all = document.querySelectorAll("#collabBtns .chip");
    all.forEach((el) => el.classList.remove("is-active"));
    chip.classList.add("is-active");
    resetTotal();
  });

  ["rawMin", "finalMin", "package", "editPoint", "momentVal"].forEach((id) => {
    const el = document.getElementById(id);
    el?.addEventListener("input", resetTotal);
    el?.addEventListener("change", resetTotal);
  });

  document.getElementById("calcBtn")?.addEventListener("click", () => {
    const totalEl = document.getElementById("totalText");
    if (!totalEl) return;

    if (typeof computeTotal === "function") {
      const result = computeTotal();

      if (!result?.ok) {
        totalEl.textContent = result?.reason === "inquiry" ? "문의 필요" : "0원";
      } else {
        totalEl.textContent = typeof formatKRW === "function" ? formatKRW(result.total) : `${result.total || 0}원`;
      }
    }

    if (typeof syncCalcToForm === "function") {
      syncCalcToForm();
    }
  });

  resetTotal();
}

async function initCalc() {
  if (typeof loadCalcData === "function") {
    await loadCalcData();
  }
  bindCalcUI();
  bindFormUI();
}

document.addEventListener("DOMContentLoaded", initCalc);
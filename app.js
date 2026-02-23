const STATUS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=0&single=true&output=csv";

const RAW_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=926551920&single=true&output=csv";
const PRICE_MIN_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=1575211476&single=true&output=csv";
const EXTRA_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=1808152056&single=true&output=csv";
const SHORTFORM_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=2033236241&single=true&output=csv";

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

function parseCSVToKV(csvText) {
  const cleaned = String(csvText ?? "").replace(/^\uFEFF/, "").trim();
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
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

function normalizeBool(v) {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "TRUE" || s === "T" || s === "YES" || s === "Y" || s === "1" || s === "ON";
}

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

async function fetchTextWithRetry(url, retries = 2) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const bust = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const res = await fetch(bust, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.text();
    } catch (e) {
      lastErr = e;
      await sleep(200);
    }
  }
  throw lastErr;
}

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

function parseCSV(text) {
  const cleaned = String(text ?? "").replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = lines[0]
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""));

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

function renderRawRangeOptions() {
  const sel = document.getElementById("rawMin");
  if (!sel) return;
  if (sel.tagName !== "SELECT") return;

  const current = sel.value || "";
  sel.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = "구간 선택";
  sel.appendChild(first);

  for (const r of RAW_BASE) {
    const label = String(r.label || "").trim();
    if (!label) continue;

    const isInquiry =
      !Number.isFinite(r.base_price) || r.base_price <= 0 || label.includes("150") || label.includes("문의");

    const opt = document.createElement("option");
    opt.value = isInquiry ? "__inquiry__" : label;
    opt.textContent = label;
    sel.appendChild(opt);
  }

  if (current) sel.value = current;
}

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

  renderRawRangeOptions();
}

function findBasePriceByLabel(label) {
  const row = RAW_BASE.find((r) => r.label === label);
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

function getSelectedText(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || sel.tagName !== "SELECT") return "";
  const opt = sel.options?.[sel.selectedIndex];
  return (opt?.textContent || "").trim();
}

function getActiveExtraLabels() {
  const chips = document.querySelectorAll("#extraToggles .chip");
  const labels = [];
  for (const c of chips) {
    if (c.classList.contains("is-active")) {
      labels.push(c.getAttribute("data-extra") || (c.textContent || "").trim());
    }
  }

  const allow = new Set(["포트폴리오 비공개", "빠른 마감", "우선 마감"]);
  const filtered = labels.filter((l) => allow.has(l));

  const rush = filtered.filter((l) => l === "빠른 마감" || l === "우선 마감");
  if (rush.length > 1) {
    return filtered.filter((l) => !(l === "빠른 마감" || l === "우선 마감")).concat(rush[rush.length - 1]);
  }
  return filtered;
}

function getMomentCount() {
  const el = document.getElementById("momentVal");
  if (!el) return 0;
  return Math.max(0, toInt(el.value, 0));
}

function getCollabCount() {
  const el = document.getElementById("collabVal");
  if (!el) return 1;
  return Math.max(1, toInt(el.value, 1));
}

function computeTotal() {
  const notice = document.getElementById("noticeText");
  const rawSel = document.getElementById("rawMin");
  const rawKey = rawSel ? String(rawSel.value || "").trim() : "";
  const finalMin = toInt(document.getElementById("finalMin")?.value, 0);
  const pkg = document.getElementById("package")?.value;
  const editPoint = document.getElementById("editPoint")?.value;

  if (!RAW_BASE.length || !PRICE_MIN.length) {
    if (notice) notice.textContent = "※ 계산 시트 URL이 아직 연결되지 않았습니다.";
    return { ok: false, total: 0, reason: "no_data" };
  }

  if (!rawKey || rawKey === "__inquiry__") {
    return { ok: false, total: 0, reason: "inquiry" };
  }

  const base = findBasePriceByLabel(rawKey);
  if (base === null) {
    if (notice) notice.textContent = "※ 원본 영상 길이 정보를 불러오지 못했습니다.";
    return { ok: false, total: 0, reason: "base_missing" };
  }

  const perMin = findPricePerMin(pkg, editPoint);
  if (perMin === null) {
    if (notice) notice.textContent = "※ 단가 정보를 불러오지 못했습니다.";
    return { ok: false, total: 0, reason: "rate_missing" };
  }

  if (notice) notice.textContent = "";

  const momentCount = getMomentCount();
  const collabCount = getCollabCount();
  const extraLabels = getActiveExtraLabels();

  const work = finalMin * perMin;

  const momentAdd = momentCount * 30000;

  let collabAdd = 0;
  if (collabCount >= 4) {
    const extraPeople = collabCount - 3;
    collabAdd = finalMin * 2000 * extraPeople;
  }

  let subtotal = base + work + momentAdd + collabAdd;

  if (extraLabels.length) {
    subtotal = subtotal * 1.5;
  }

  return { ok: true, total: subtotal };
}

function buildCalcSummaryBlock() {
  const rawLabel = getSelectedText("rawMin") || "-";
  const finalMin = toInt(document.getElementById("finalMin")?.value, 0);
  const pkgText = getSelectedText("package") || "-";
  const editText = getSelectedText("editPoint") || "-";

  const extras = getActiveExtraLabels();
  const collab = getCollabCount();
  const moment = getMomentCount();

  const totalText = (document.getElementById("totalText")?.textContent || "").trim();

  const extraLines = [];
  if (extras.length) extraLines.push(`- 추가금(일괄 +50%): ${extras.join(", ")}`);
  else extraLines.push(`- 추가금: 없음`);

  extraLines.push(`- 시점: ${moment || 0}개 (1개당 30,000원)`);
  extraLines.push(
    `- 합방 인원: ${collab || 1}명 (${collab >= 4 ? `4명부터 1인당 분당 2,000원 적용` : "1~3명 추가금 없음"})`
  );

  return (
    `[견적 계산기 입력 요약]\n` +
    `- 원본 영상 길이: ${rawLabel}\n` +
    `- 희망 영상 길이: ${finalMin || 0}분\n` +
    `- 희망 타입: ${pkgText}\n` +
    `- 편집점: ${editText}\n` +
    `${extraLines.join("\n")}\n` +
    `- 예상 총액: ${totalText || "0원"}`
  );
}

function upsertCalcSummaryIntoEtc(etcText) {
  const summary = buildCalcSummaryBlock();
  const markerStart = "[견적 계산기 입력 요약]";
  const idx = String(etcText || "").indexOf(markerStart);

  if (idx >= 0) {
    const head = String(etcText || "").slice(0, idx).trimEnd();
    return (head ? head + "\n\n" : "") + summary;
  }

  const base = String(etcText || "").trim();
  return (base ? base + "\n\n" : "") + summary;
}

function syncCalcToForm() {
  return;
}

/* ==============================
   FORM (문의 양식) + CALC (견적 계산기)
============================== */
function buildInquiryFormText() {
  const rawLabel = getSelectedText("rawMin") || "-";
  const finalMin = toInt(document.getElementById("finalMin")?.value, 0);
  const pkgText = getSelectedText("package") || "-";
  const editText = getSelectedText("editPoint") || "-";

  const extras = getActiveExtraLabels();
  const moment = getMomentCount();
  const collab = getCollabCount();

  const fChannel = (document.getElementById("fChannel")?.value || "").trim();
  const fFinalLen = (document.getElementById("fFinalLen")?.value || "").trim();
  const fConcept = (document.getElementById("fConcept")?.value || "").trim();
  const fEtc = (document.getElementById("fEtc")?.value || "").trim();

  let totalText = (document.getElementById("totalText")?.textContent || "").trim();
  if (!totalText) totalText = "0원";
  if (!/원\s*$/.test(totalText)) totalText = `${totalText}원`;

  const lines = [];
  lines.push("[문의 양식]");
  lines.push(`- 원본 영상 길이: ${rawLabel}`);
  lines.push(`- 희망 영상 길이: ${finalMin ? `${finalMin}분` : "-"}`);
  lines.push(`- 희망 타입: ${pkgText}`);
  lines.push(`- 편집점: ${editText}`);
  lines.push(`- 추가 옵션: ${extras.length ? extras.join(", ") : "없음"}`);
  lines.push(`- 시점: ${moment}개`);
  lines.push(`- 합방 인원: ${collab}명`);
  lines.push(`- 유튜브 채널 링크: ${fChannel || ""}`);
  lines.push(`- 원본 영상 공유: ${fFinalLen || ""}`);
  lines.push(`- 영상 콘셉트 및 레퍼런스 자료: ${fConcept || ""}`);
  lines.push(`- 그 외 요구사항: ${fEtc || ""}`);
  lines.push("");
  lines.push(`- 예상 총액: ${totalText}`);

  return lines.join("\n");
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
    const text = buildInquiryFormText();
    const ok = await copyTextToClipboard(text);
    setFormToast(ok ? "복사 완료! 그대로 붙여넣기 하시면 돼요." : "복사에 실패했어요. 브라우저 권한을 확인해 주세요.");
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

  ["rawMin", "finalMin", "package", "editPoint", "momentVal", "collabVal"].forEach((id) => {
    const el = document.getElementById(id);
    el?.addEventListener("input", resetTotal);
    el?.addEventListener("change", resetTotal);
  });

  document.getElementById("calcBtn")?.addEventListener("click", () => {
    const totalEl = document.getElementById("totalText");
    if (!totalEl) return;

    const result = computeTotal();
    if (!result?.ok) {
      totalEl.textContent = result?.reason === "inquiry" ? "문의 필요" : "0원";
    } else {
      totalEl.textContent = formatKRW(result.total);
    }

    syncCalcToForm();
  });

  resetTotal();
}

async function initAll() {
  loadStatus();
  await loadCalcData();
  bindCalcUI();
  bindFormUI();
}

document.addEventListener("DOMContentLoaded", initAll);







/* ==============================
   FORM (문의 양식) + CALC (견적 계산기)
============================== */
(() => {
  const toNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const getActiveExtraLabels = () => {
    const chips = document.querySelectorAll("#extraToggles .chip");
    const labels = [];

    for (const c of chips) {
      if (!c.classList.contains("is-active")) continue;
      const t = (c.getAttribute("data-extra") || c.textContent || "").trim();
      if (t) labels.push(t);
    }

    const rush = labels.filter((l) => l === "빠른 마감" || l === "우선 마감");
    if (rush.length > 1) {
      return labels
        .filter((l) => !(l === "빠른 마감" || l === "우선 마감"))
        .concat(rush[rush.length - 1]);
    }

    return labels;
  };

  const getExtraDef = (label) => {
    if (!Array.isArray(EXTRA)) return null;
    return EXTRA.find((e) => String(e.label || "").trim() === String(label || "").trim()) || null;
  };

  const getRawKey = () => String(document.getElementById("rawMin")?.value || "").trim();

  const getFinalMin = () => {
    const n = Math.floor(toNum(document.getElementById("finalMin")?.value, 0));
    return Math.max(0, n);
  };

  const getMomentCount = () => {
    const el = document.getElementById("momentVal");
    const n = Math.floor(toNum(el?.value, 0));
    return Math.max(0, n);
  };

  const getCollabCount = () => {
    const el = document.getElementById("collabVal");
    const n = Math.floor(toNum(el?.value, 1));
    return Math.max(1, n);
  };

  window.computeTotal = function computeTotal() {
    const notice = document.getElementById("noticeText");

    const rawKey = getRawKey();
    const finalMin = getFinalMin();
    const pkg = document.getElementById("package")?.value;
    const editPoint = document.getElementById("editPoint")?.value;

    if (
      !Array.isArray(RAW_BASE) || !RAW_BASE.length ||
      !Array.isArray(PRICE_MIN) || !PRICE_MIN.length ||
      !Array.isArray(EXTRA) || !EXTRA.length
    ) {
      if (notice) notice.textContent = "※ 계산 시트 데이터가 아직 연결되지 않았습니다.";
      return { ok: false, total: 0, reason: "no_data" };
    }

    if (!rawKey || rawKey === "__inquiry__") {
      if (notice) notice.textContent = "※ 원본 영상 길이가 150분 이상인 경우, 별도 문의가 필요합니다.";
      return { ok: false, total: 0, reason: "inquiry" };
    }

    const base = (typeof findBasePriceByLabel === "function") ? findBasePriceByLabel(rawKey) : null;
    if (base === null || !Number.isFinite(base)) {
      if (notice) notice.textContent = "※ 원본 영상 길이 정보를 불러오지 못했습니다.";
      return { ok: false, total: 0, reason: "base_missing" };
    }

    const perMin = (typeof findPricePerMin === "function") ? findPricePerMin(pkg, editPoint) : null;
    if (perMin === null || !Number.isFinite(perMin)) {
      if (notice) notice.textContent = "※ 단가 정보를 불러오지 못했습니다.";
      return { ok: false, total: 0, reason: "rate_missing" };
    }

    if (notice) notice.textContent = "";

    const work = finalMin * perMin;

    const momentCount = getMomentCount();
    const momentDef = getExtraDef("시점 추가");
    const momentUnit = momentDef && momentDef.type === "add" ? toNum(momentDef.value, 30000) : 30000;
    const momentAdd = momentCount * momentUnit;

    const collabCount = getCollabCount();
    const extraPeople = Math.max(0, collabCount - 3);
    const collabDef = getExtraDef("합방 인원 추가");
    const collabUnit = collabDef && collabDef.type === "per_min" ? toNum(collabDef.value, 2000) : 2000;
    const collabAdd = finalMin * collabUnit * extraPeople;

    const S = base + work + momentAdd + collabAdd;

    const actives = getActiveExtraLabels();

    let addRate = 0;
    for (const label of actives) {
      const def = getExtraDef(label);
      if (!def) continue;
      if (String(def.type).trim() !== "mult") continue;

      const m = toNum(def.value, 1);
      if (m > 1) addRate += (m - 1);
    }

    const total = S * (1 + addRate);

    return { ok: true, total };
  };
})();
(() => {
  const CONFIG = {
    mountSelector: "#scheduleCalendar",
    settingsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=1801186662&single=true&output=csv",
    datesCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuo_mCcH60Tbh6aZlV-i8tnaSbTBnwOv-WJqt2ixVGvbSXmFe8g9i4RFlJ51q7pLO791n_39iQRLXN/pub?gid=1121271480&single=true&output=csv",
    monthTabCount: 2,
    weekdayLabels: ["일", "월", "화", "수", "목", "금", "토"]
  };

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows[0].map(h => h.trim());

    return rows
      .slice(1)
      .filter(r => r.some(v => String(v).trim() !== ""))
      .map(r => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = (r[index] ?? "").trim();
        });
        return obj;
      });
  }

  function toSettingsObject(rows) {
    return rows.reduce((acc, row) => {
      if (row.key) acc[row.key] = row.value ?? "";
      return acc;
    }, {});
  }

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function formatDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseMonthString(monthStr) {
    const [year, month] = monthStr.split("-").map(Number);
    return { year, month };
  }

  function createDate(year, month, day = 1) {
    return new Date(year, month - 1, day);
  }

  function addMonths(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  }

  function getMonthLabel(date) {
    return `${date.getMonth() + 1}월`;
  }

  function getMonthTitle(date) {
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}`;
  }

  function buildMonthList(activeMonth, count) {
    const { year, month } = parseMonthString(activeMonth);
    const base = createDate(year, month, 1);
    return Array.from({ length: count }, (_, i) => addMonths(base, i));
  }

  function getCalendarStartDate(year, month) {
    const firstDay = createDate(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    return start;
  }

  function buildCalendarCells(year, month) {
    const startDate = getCalendarStartDate(year, month);
    const cells = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      cells.push({
        key: formatDateKey(date),
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === month - 1
      });
    }

    return cells;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function makeDateMap(rows) {
    const map = new Map();

    rows.forEach(row => {
      if (!row.date) return;
      map.set(row.date, {
        subText: row.sub_text || ""
      });
    });

    return map;
  }

  function createCalendarMarkup() {
    return `
      <div class="scalendar">
        <div class="scalendar__head">
          <div class="scalendar__tabs" data-role="tabs"></div>
          <div class="scalendar__title" data-role="title"></div>
        </div>
        <div class="scalendar__weekdays" data-role="weekdays"></div>
        <div class="scalendar__grid" data-role="grid"></div>
        <div class="scalendar__footer" data-role="footer"></div>
      </div>
    `;
  }

  function createWeekdayRow(labels) {
    return labels.map((label, index) => {
      const extraClass = index === 0 ? " is-sun" : "";
      return `<div class="scalendar__weekday${extraClass}">${escapeHtml(label)}</div>`;
    }).join("");
  }

  function renderMonthTabs(container, months, activeIndex, onClick) {
    container.innerHTML = months.map((date, index) => {
      const activeClass = index === activeIndex ? " is-active" : "";
      return `
        <button type="button" class="scalendar__tab${activeClass}" data-index="${index}">
          ${escapeHtml(getMonthLabel(date))}
        </button>
      `;
    }).join("");

    container.querySelectorAll(".scalendar__tab").forEach(button => {
      button.addEventListener("click", () => {
        onClick(Number(button.dataset.index));
      });
    });
  }

  function isClosedText(text) {
    return text === "마감";
  }

  function getBadgeClass(text) {
    return isClosedText(text) ? " is-closed" : "";
  }

  function renderGrid(gridEl, cells, dateMap) {
    const todayKey = formatDateKey(new Date());

    gridEl.innerHTML = cells.map(cell => {
      const entry = dateMap.get(cell.key);
      const text = (entry?.subText || "").trim();
      const outsideClass = cell.isCurrentMonth ? "" : " is-outside";
      const todayClass = cell.key === todayKey ? " is-today" : "";
      const closedClass = isClosedText(text) ? " is-closed" : "";
      const badgeMarkup = text
        ? `<div class="scalendar__badge${getBadgeClass(text)}">${escapeHtml(text)}</div>`
        : "";

      return `
        <div class="scalendar__cell${outsideClass}${todayClass}${closedClass}" data-date="${cell.key}">
          <div class="scalendar__date">${cell.day}</div>
          ${badgeMarkup}
        </div>
      `;
    }).join("");
  }

  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CSV를 불러오지 못했습니다: ${url}`);
    }
    return response.text();
  }

  async function initScheduleCalendar(userConfig = {}) {
    const config = { ...CONFIG, ...userConfig };
    const mount = document.querySelector(config.mountSelector);

    if (!mount) return;

    mount.innerHTML = createCalendarMarkup();

    const tabsEl = mount.querySelector('[data-role="tabs"]');
    const titleEl = mount.querySelector('[data-role="title"]');
    const weekdaysEl = mount.querySelector('[data-role="weekdays"]');
    const gridEl = mount.querySelector('[data-role="grid"]');
    const footerEl = mount.querySelector('[data-role="footer"]');

    weekdaysEl.innerHTML = createWeekdayRow(config.weekdayLabels);

    try {
      const [settingsCsvText, datesCsvText] = await Promise.all([
        fetchText(config.settingsCsvUrl),
        fetchText(config.datesCsvUrl)
      ]);

      const settingsRows = parseCSV(settingsCsvText);
      const datesRows = parseCSV(datesCsvText);

      const settings = toSettingsObject(settingsRows);
      const dateMap = makeDateMap(datesRows);

      const activeMonth = settings.active_month || formatDateKey(new Date()).slice(0, 7);
      const availableText = settings.available_text || "";
      const months = buildMonthList(activeMonth, config.monthTabCount);

      let activeIndex = 0;

      function render() {
        const currentMonthDate = months[activeIndex];
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth() + 1;
        const cells = buildCalendarCells(year, month);

        renderMonthTabs(tabsEl, months, activeIndex, nextIndex => {
          activeIndex = nextIndex;
          render();
        });

        titleEl.textContent = getMonthTitle(currentMonthDate);
        footerEl.textContent = availableText;
        renderGrid(gridEl, cells, dateMap);
      }

      render();
    } catch (error) {
      console.error(error);
      mount.innerHTML = `
        <div class="scalendar">
          <div class="scalendar__footer">캘린더 데이터를 불러오지 못했습니다.</div>
        </div>
      `;
    }
  }

  window.ScheduleCalendar = {
    init: initScheduleCalendar
  };

  document.addEventListener("DOMContentLoaded", () => {
    initScheduleCalendar();
  });
})();
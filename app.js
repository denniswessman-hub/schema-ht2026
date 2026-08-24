import { SCHEDULE_DATA, SCHEDULE_META, TERM_INFO } from "./schedule-data.js?v=16";

const GROUP_STORAGE_KEY = "schemaHT26.baseGroup";
const THEME_STORAGE_KEY = "schemaHT26.theme";
const EXAM_DATE = "2027-01-15";
const DAY_IN_MILLISECONDS = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long" });
const shortDateFormatter = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });
const fullTodayFormatter = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const examinationDateFormatter = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const elements = {
  group: document.querySelector("#group-filter"),
  week: document.querySelector("#week-filter"),
  search: document.querySelector("#search-filter"),
  list: document.querySelector("#schedule-list"),
  count: document.querySelector("#result-count"),
  summary: document.querySelector("#active-filter-summary"),
  empty: document.querySelector("#empty-state"),
  today: document.querySelector("#today-label"),
  termPeriod: document.querySelector("#term-period"),
  examCountdown: document.querySelector("#exam-countdown"),
  examCountdownNumber: document.querySelector("#exam-countdown-number"),
  examCountdownLabel: document.querySelector("#exam-countdown-label"),
  termInfo: document.querySelector("#term-info-content"),
  footerTitle: document.querySelector("#footer-schedule-title"),
  footerSource: document.querySelector("#footer-source"),
  reset: document.querySelector("#reset-filters"),
  emptyReset: document.querySelector("#empty-reset"),
  quick: [...document.querySelectorAll(".quick-filter")],
  install: document.querySelector("#install-button"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeColor: document.querySelector("#theme-color"),
  iosDialog: document.querySelector("#ios-install-dialog"),
  closeIosDialog: document.querySelector("#close-ios-dialog"),
};

function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  elements.themeToggle.setAttribute("aria-checked", String(theme === "dark"));
  elements.themeToggle.title = theme === "dark" ? "Byt till ljust läge" : "Byt till mörkt läge";
  elements.themeColor.content = theme === "dark" ? "#101114" : "#e4022d";

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Valet gäller för den här visningen om lokal lagring är blockerad.
    }
  }
}

function initTheme() {
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  const initialTheme = document.documentElement.dataset.theme || (systemTheme.matches ? "dark" : "light");
  applyTheme(initialTheme);

  elements.themeToggle.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
  });

  const handleSystemThemeChange = (event) => {
    if (!readStoredTheme()) applyTheme(event.matches ? "dark" : "light");
  };
  if (systemTheme.addEventListener) systemTheme.addEventListener("change", handleSystemThemeChange);
  else systemTheme.addListener?.(handleSystemThemeChange);
}

function daysUntilExam(referenceDate = new Date()) {
  const referenceDay = startOfDay(referenceDate);
  const examDay = parseLocalDate(EXAM_DATE);
  return Math.round((examDay - referenceDay) / DAY_IN_MILLISECONDS);
}

function updateExamCountdown() {
  const days = daysUntilExam();
  if (days > 0) {
    elements.examCountdownNumber.textContent = String(days);
    elements.examCountdownLabel.textContent = `${days === 1 ? "dag" : "dagar"} kvar till`;
    elements.examCountdown.setAttribute("aria-label", `${days} ${days === 1 ? "dag" : "dagar"} kvar till examen den 15 januari 2027`);
  } else if (days === 0) {
    elements.examCountdownNumber.textContent = "I dag";
    elements.examCountdownLabel.textContent = "är det dags för";
    elements.examCountdown.setAttribute("aria-label", "I dag är det examen");
  } else {
    elements.examCountdownNumber.textContent = "Klart";
    elements.examCountdownLabel.textContent = "examen genomfördes";
    elements.examCountdown.setAttribute("aria-label", "Examen genomfördes den 15 januari 2027");
  }
}

let today;
let todayIso;
let currentWeekKey;
let nextWeekKey;

function refreshDateContext(referenceDate = new Date()) {
  today = startOfDay(referenceDate);
  todayIso = localIsoDate(today);
  currentWeekKey = isoWeekKey(today);
  const nextWeekDate = new Date(today);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  nextWeekKey = isoWeekKey(nextWeekDate);
}

function updateCurrentDateLabel() {
  elements.today.textContent = `Idag · ${fullTodayFormatter.format(today)}`;
}

function syncDailyState() {
  const previousToday = todayIso;
  refreshDateContext();
  updateExamCountdown();
  updateCurrentDateLabel();
  if (previousToday && previousToday !== todayIso) render();
}

function initExamCountdown() {
  updateExamCountdown();
  const scheduleNextUpdate = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    window.setTimeout(() => {
      syncDailyState();
      scheduleNextUpdate();
    }, nextMidnight - now);
  };
  scheduleNextUpdate();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncDailyState();
  });
}

refreshDateContext();

const state = {
  group: readStoredGroup(),
  week: "all",
  range: "all",
  search: "",
};

const campusWeeksByKey = new Map(TERM_INFO.campusWeeks.map((item) => [item.key, item]));

function parseLocalDate(dateString, time = "00:00") {
  return new Date(`${dateString}T${time || "00:00"}:00`);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoWeekParts(date) {
  const value = startOfDay(date);
  const weekday = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - weekday + 3);
  const isoYear = value.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstWeekday = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstWeekday + 3);
  const week = 1 + Math.round((value - firstThursday) / 604800000);
  return { year: isoYear, week };
}

function isoWeekKey(date) {
  const { year, week } = isoWeekParts(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function weekStart(date) {
  const result = startOfDay(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function normalize(value) {
  return String(value ?? "")
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalizeFirst(value) {
  const text = String(value ?? "");
  return text ? text[0].toLocaleUpperCase("sv-SE") + text.slice(1) : text;
}

function readStoredGroup() {
  try {
    const value = localStorage.getItem(GROUP_STORAGE_KEY);
    return value === "all" || SCHEDULE_META.groups.includes(value) ? value : "all";
  } catch {
    return "all";
  }
}

function saveGroup(value) {
  try {
    localStorage.setItem(GROUP_STORAGE_KEY, value);
  } catch {
    // Appen fungerar även om privat läge blockerar lokal lagring.
  }
}

function ordinaryExaminationOverview() {
  const retakePattern = /omexamination|omtentamen/i;
  const ordinaryEvents = SCHEDULE_DATA.filter((event) => {
    const description = [event.type, event.title, event.momentText, event.examInfo].join(" ");
    return event.category === "examination" && !retakePattern.test(description);
  });

  const examinations = new Map();
  for (const event of ordinaryEvents) {
    const key = [event.date, event.title, event.momentText, event.momentNumber].join("|");
    if (!examinations.has(key)) {
      examinations.set(key, {
        date: event.date,
        title: event.title,
        momentText: event.momentText,
        momentNumber: event.momentNumber,
        slots: new Map(),
      });
    }

    const groupLabel = event.groups.length ? event.groups.join(" + ") : "Alla basgrupper";
    const examination = examinations.get(key);
    if (!examination.slots.has(groupLabel)) examination.slots.set(groupLabel, []);
    examination.slots.get(groupLabel).push({ startTime: event.startTime, endTime: event.endTime });
  }

  return [...examinations.values()].map((examination) => ({
    ...examination,
    slots: [...examination.slots.entries()].map(([groupLabel, times]) => {
      const ordered = [...times].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const merged = [];
      for (const time of ordered) {
        const previous = merged[merged.length - 1];
        if (previous?.endTime === time.startTime) previous.endTime = time.endTime;
        else merged.push({ ...time });
      }
      return { groupLabel, times: merged };
    }),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function initFilters() {
  for (const group of SCHEDULE_META.groups) {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    elements.group.append(option);
  }
  elements.group.value = state.group;

  const weeks = [...new Map(SCHEDULE_DATA.map((event) => {
    const date = parseLocalDate(event.date);
    const parts = isoWeekParts(date);
    return [isoWeekKey(date), parts];
  })).entries()];

  for (const [key, parts] of weeks) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `Vecka ${parts.week} (${parts.year})`;
    elements.week.append(option);
  }

  elements.termPeriod.textContent = `${SCHEDULE_META.eventPeriod.replace(" - ", "–")} · aktuellt utdrag`;
  updateCurrentDateLabel();
  elements.footerTitle.textContent = SCHEDULE_META.scheduleTitle;
  elements.footerSource.textContent = `Källa: ${SCHEDULE_META.sourceFile}, exporterad ${SCHEDULE_META.sourceExportedAt}`;
}

function initTermInfo() {
  const courseCards = TERM_INFO.courses.map((course) => `
    <article class="info-card">
      <div class="info-card-heading">
        <span class="course-code">${escapeHtml(course.code)}</span>
        <h3>${escapeHtml(course.name)}</h3>
      </div>
      <p>${escapeHtml(course.description)}</p>
      ${course.responsible ? `<p class="responsible"><strong>Ansvarig:</strong> ${escapeHtml(course.responsible)}</p>` : ""}
    </article>
  `).join("");

  const campusWeeks = TERM_INFO.campusWeeks.map((item) => `
    <li>
      <button class="campus-week-button" type="button" data-campus-week="${escapeHtml(item.key)}">
        <strong>${escapeHtml(item.label)}</strong>
        <span>Vecka ${item.week}<small>${item.moments.length} moment</small></span>
      </button>
    </li>
  `).join("");

  const groups = Object.entries(TERM_INFO.groupMembers).map(([group, members]) => `
    <article class="group-card">
      <h3>${escapeHtml(group.replace("BG", "Basgrupp "))}</h3>
      <p>${members.map(escapeHtml).join(", ")}</p>
    </article>
  `).join("");

  const examinationOverview = ordinaryExaminationOverview();
  const examinations = examinationOverview.map((examination) => {
    const detailParts = [];
    if (examination.momentText && normalize(examination.momentText) !== normalize(examination.title)) detailParts.push(examination.momentText);
    if (examination.momentNumber && !normalize(examination.title).includes(normalize(examination.momentNumber))) detailParts.push(`Moment ${examination.momentNumber}`);
    const slots = examination.slots.flatMap(({ groupLabel, times }) => times.map((time) => `
      <li>
        <strong>${escapeHtml(time.startTime)}–${escapeHtml(time.endTime)}</strong>
        <span>${escapeHtml(groupLabel)}</span>
      </li>
    `)).join("");
    return `
      <article class="examination-card">
        <time datetime="${escapeHtml(examination.date)}">${escapeHtml(capitalizeFirst(examinationDateFormatter.format(parseLocalDate(examination.date))))}</time>
        <h4>${escapeHtml(examination.title)}</h4>
        ${detailParts.length ? `<p>${detailParts.map(escapeHtml).join(" · ")}</p>` : ""}
        <ul>${slots}</ul>
      </article>
    `;
  }).join("");

  elements.termInfo.innerHTML = `
    <p class="term-introduction">${escapeHtml(TERM_INFO.introduction)}</p>
    <div class="course-grid">${courseCards}</div>
    <div class="term-info-grid">
      <section class="campus-weeks" aria-labelledby="campus-weeks-heading">
        <p class="section-kicker">På plats</p>
        <h3 id="campus-weeks-heading">Närstudieveckor</h3>
        <ul>${campusWeeks}</ul>
      </section>
      <aside class="graduation-note" aria-labelledby="graduation-heading">
        <p class="section-kicker">Examen</p>
        <h3 id="graduation-heading">Kalendervecka 2</h3>
        <p>${escapeHtml(TERM_INFO.graduation)}</p>
      </aside>
    </div>
    <section class="ordinary-examinations" aria-labelledby="ordinary-examinations-heading">
      <div class="ordinary-examinations-heading">
        <div>
          <p class="section-kicker">Ordinarie provtillfällen</p>
          <h3 id="ordinary-examinations-heading">Tentor och examinationer</h3>
        </div>
        <span class="examination-count">${examinationOverview.length} datum</span>
      </div>
      <p class="ordinary-examinations-note">Dag, datum och tid enligt det aktuella TimeEdit-utdraget. Omexaminationer, omtentor och examensceremonin visas inte här.</p>
      <div class="examination-card-grid">${examinations}</div>
    </section>
    <section class="group-info" aria-labelledby="group-info-heading">
      <div class="group-info-heading">
        <div>
          <p class="section-kicker">Gruppindelning</p>
          <h3 id="group-info-heading">Basgrupper under T5</h3>
        </div>
        <span class="privacy-label">Innehåller studentnamn</span>
      </div>
      <div class="group-card-grid">${groups}</div>
    </section>
  `;

  elements.termInfo.addEventListener("click", (event) => {
    const button = event.target.closest("[data-campus-week]");
    if (!button) return;
    state.week = button.dataset.campusWeek;
    state.range = "all";
    elements.week.value = state.week;
    for (const quickButton of elements.quick) {
      const active = quickButton.dataset.range === "all";
      quickButton.classList.toggle("is-active", active);
      quickButton.setAttribute("aria-pressed", String(active));
    }
    render();
    requestAnimationFrame(() => document.querySelector(`#heading-${CSS.escape(state.week)}`)?.scrollIntoView({ block: "start" }));
  });
}

function eventMatches(event) {
  if (state.group !== "all" && event.groups.length && !event.groups.includes(state.group)) return false;

  const eventWeekKey = isoWeekKey(parseLocalDate(event.date));
  if (state.week !== "all" && eventWeekKey !== state.week) return false;
  if (state.range === "today" && event.date !== todayIso) return false;
  if (state.range === "current" && eventWeekKey !== currentWeekKey) return false;
  if (state.range === "next" && eventWeekKey !== nextWeekKey) return false;

  if (state.search) {
    const haystack = normalize([
      event.weekday,
      event.date,
      event.startTime,
      event.endTime,
      event.groups.join(" "),
      event.audience,
      event.title,
      event.course,
      event.locationIds,
      event.locations,
      event.type,
      event.momentText,
      event.momentNumber,
      event.examInfo,
    ].join(" "));
    if (!haystack.includes(normalize(state.search))) return false;
  }
  return true;
}

function eventStart(event) {
  return parseLocalDate(event.date, event.startTime);
}

function eventEnd(event) {
  return parseLocalDate(event.endDate || event.date, event.endTime);
}

function render() {
  const filtered = SCHEDULE_DATA.filter(eventMatches);
  const now = new Date();
  const nextEvent = filtered.find((event) => eventEnd(event) > now);

  elements.count.textContent = `${filtered.length} ${filtered.length === 1 ? "schemapost" : "schemaposter"}`;
  elements.summary.textContent = filterSummary();
  elements.empty.hidden = filtered.length !== 0;
  elements.list.replaceChildren();

  if (!filtered.length) return;

  const groupedWeeks = groupBy(filtered, (event) => isoWeekKey(parseLocalDate(event.date)));
  const past = [];
  const presentAndFuture = [];

  for (const [key, events] of groupedWeeks) {
    const monday = weekStart(parseLocalDate(events[0].date));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const group = { key, events, monday, sunday };
    (sunday < today ? past : presentAndFuture).push(group);
  }

  const flattenPast = state.week !== "all" || state.range !== "all";
  if (past.length && !flattenPast) {
    const details = document.createElement("details");
    details.className = "past-weeks";
    const summary = document.createElement("summary");
    summary.textContent = `Tidigare veckor (${past.length})`;
    const content = document.createElement("div");
    content.className = "past-weeks-content";
    for (const group of past) content.append(renderWeek(group, now, nextEvent));
    details.append(summary, content);
    elements.list.append(details);
  } else {
    for (const group of past) elements.list.append(renderWeek(group, now, nextEvent));
  }

  for (const group of presentAndFuture) elements.list.append(renderWeek(group, now, nextEvent));
}

function groupBy(items, keyFunction) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFunction(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function renderWeek(group, now, nextEvent) {
  const section = document.createElement("section");
  section.className = "week-section";
  section.setAttribute("aria-labelledby", `heading-${group.key}`);

  const parts = isoWeekParts(group.monday);
  const relation = group.key === currentWeekKey ? "Nu" : group.key === nextWeekKey ? "Nästa" : (group.sunday < today ? "Tidigare" : "Kommande");
  const endLabel = shortDateFormatter.format(group.sunday).replace(".", "");
  const startLabel = shortDateFormatter.format(group.monday).replace(".", "");
  section.insertAdjacentHTML("beforeend", `
    <div class="week-heading">
      <div class="week-label-wrap">
        <span class="week-relation">${relation}</span>
        <h3 class="week-title" id="heading-${escapeHtml(group.key)}">Vecka ${parts.week}</h3>
        <span class="week-range">${escapeHtml(startLabel)}–${escapeHtml(endLabel)} ${parts.year}</span>
      </div>
    </div>
  `);

  const campusWeek = campusWeeksByKey.get(group.key);
  if (campusWeek) section.append(renderCampusWeekPlan(campusWeek));

  const days = groupBy(group.events, (event) => event.date);
  for (const [date, events] of days) {
    const day = document.createElement("section");
    day.className = "day-section";
    const formatted = dateFormatter.format(parseLocalDate(date));
    const [weekday, ...rest] = formatted.split(" ");
    day.insertAdjacentHTML("beforeend", `<h4 class="day-heading"><span>${escapeHtml(weekday)}</span><time datetime="${date}">${escapeHtml(rest.join(" "))}</time></h4>`);
    const list = document.createElement("div");
    list.className = "event-list";
    for (const event of events) list.append(renderEvent(event, now, nextEvent));
    day.append(list);
    section.append(day);
  }
  return section;
}

function renderWeaponCourseIntro(campusWeek) {
  if (campusWeek.key !== "2026-W36" || !TERM_INFO.weaponCourse) return "";

  const course = TERM_INFO.weaponCourse;
  return `
    <details class="weapon-course-intro">
      <summary>
        <span>
          <span class="weapon-summary-kicker">Vapen · Termin 5</span>
          <strong>Kursupplägg och examination</strong>
        </span>
      </summary>
      <div class="weapon-course-intro-content">
        <p><strong>${escapeHtml(course.introduction)}</strong></p>
        <p>${escapeHtml(course.focus)}</p>
        <p class="weapon-examination-note">${escapeHtml(course.examination)}</p>
        <p class="weapon-responsible"><strong>${escapeHtml(course.responsible.name)}</strong><span>${escapeHtml(course.responsible.role)}</span></p>
      </div>
    </details>
  `;
}

function renderWeaponLessonDetails(item) {
  const lesson = TERM_INFO.weaponCourse?.lessons?.[item.lessonId];
  if (!lesson) return "";

  const textSection = (heading, content) => content ? `
    <section class="weapon-detail-section">
      <h5>${escapeHtml(heading)}</h5>
      <p>${escapeHtml(content)}</p>
    </section>
  ` : "";
  const examParts = lesson.examParts?.length ? `
    <section class="weapon-detail-section">
      <h5>Behörighetsprovet</h5>
      <ul>${lesson.examParts.map((part) => `<li>${escapeHtml(part)}</li>`).join("")}</ul>
    </section>
  ` : "";
  const resources = lesson.resources?.length ? `
    <section class="weapon-detail-section weapon-resources">
      <h5>Material i Canvas</h5>
      <ul>${lesson.resources.map((resource) => `<li>${escapeHtml(resource)}</li>`).join("")}</ul>
    </section>
  ` : "";

  return `
    <details class="weapon-lesson-details">
      <summary>
        <span class="weapon-lesson-summary-text">Läs mer om lektionen</span>
        <span class="weapon-lesson-badge">V ${escapeHtml(item.lessonId)}</span>
      </summary>
      <div class="weapon-lesson-content">
        <p class="weapon-lesson-detail-title">V ${escapeHtml(item.lessonId)} · ${escapeHtml(lesson.title)}</p>
        ${textSection("Innehåll", lesson.content)}
        ${textSection("Mål", lesson.goal)}
        ${textSection("Förberedelser", lesson.preparation)}
        ${textSection("Målgrupp", lesson.audience)}
        ${examParts}
        ${textSection("Godkänt resultat", lesson.passCriteria)}
        ${resources}
      </div>
    </details>
  `;
}

function renderCampusWeekPlan(campusWeek) {
  const details = document.createElement("details");
  details.className = "campus-week-plan";
  details.open = state.week === campusWeek.key;

  const teacherNames = [...new Set(campusWeek.moments.flatMap((item) => item.teachers))];
  const momentCards = campusWeek.moments.map((item) => `
    <article class="campus-moment">
      <div class="campus-moment-meta">
        <span class="campus-subject">${escapeHtml(item.subject)}</span>
        ${item.teachers.length ? `<span class="campus-teachers"><strong>Lärare:</strong> ${item.teachers.map(escapeHtml).join(", ")}</span>` : `<span class="campus-teachers is-missing">Lärare anges inte i Canvas</span>`}
      </div>
      <h4>${escapeHtml(item.moment)}</h4>
      ${item.preparation ? `<p class="campus-preparation"><strong>Förbered:</strong> ${escapeHtml(item.preparation)}</p>` : ""}
      ${renderWeaponLessonDetails(item)}
    </article>
  `).join("");

  details.innerHTML = `
    <summary>
      <span>
        <span class="section-kicker">Momentöversikt från Canvas</span>
        <strong>${escapeHtml(campusWeek.label)} · Vecka ${campusWeek.week}${campusWeek.highlight ? ` · ${escapeHtml(campusWeek.highlight)}` : ""}</strong>
      </span>
      <span class="campus-week-count">${campusWeek.moments.length} moment · ${teacherNames.length} lärare</span>
    </summary>
    <div class="campus-week-content">
      <p class="campus-week-note">${escapeHtml(TERM_INFO.campusWeekDisclaimer)}</p>
      ${renderWeaponCourseIntro(campusWeek)}
      <div class="campus-moment-list">${momentCards}</div>
      <a class="canvas-source-link" href="${escapeHtml(campusWeek.canvasUrl)}" target="_blank" rel="noopener noreferrer">Öppna originalet i Canvas</a>
    </div>
  `;
  return details;
}

function renderEvent(event, now, nextEvent) {
  const article = document.createElement("article");
  const start = eventStart(event);
  const end = eventEnd(event);
  const status = end <= now ? "finished" : start <= now && end > now ? "ongoing" : nextEvent?.id === event.id ? "next" : "upcoming";
  article.className = `event-card is-${event.category} is-${status}`;

  const statusLabel = status === "ongoing" ? "Pågår nu" : status === "next" ? "Nästa aktivitet" : "";
  const time = event.allDay ? "Hela dagen" : `${event.startTime}–${event.endTime}`;
  const timeDetail = event.endDate !== event.date && !event.allDay ? `till ${event.endDate}` : "";
  const groupLabel = event.groups.length ? event.groups.join(" + ") : "Alla basgrupper";
  const showGroup = event.category === "teaching" || event.category === "examination";
  const moment = event.momentText && event.momentText !== event.title ? `<p class="event-moment">${escapeHtml(event.momentText)}</p>` : "";
  const examClass = event.category === "examination" ? " exam" : "";
  const typeBadge = event.type && event.type !== event.title ? `<span class="badge${examClass}">${escapeHtml(event.type)}</span>` : "";
  const groupBadge = showGroup ? `<span class="badge group">${escapeHtml(groupLabel)}</span>` : "";
  const location = event.locations || event.locationIds ? `
    <p class="location"><strong>${escapeHtml(event.locations || "Lokal")}</strong>${event.locationIds ? `<span class="location-id">${escapeHtml(event.locationIds)}</span>` : ""}</p>` : "";

  const details = [];
  if (event.momentNumber) details.push(["Moment", event.momentNumber]);
  if (event.examInfo) details.push(["Tentamensinfo", event.examInfo]);
  if (event.audience && event.audience !== event.title) details.push(["Klass/grupp", event.audience]);
  const extra = details.length ? `
    <details class="event-extra">
      <summary>Mer information</summary>
      <dl>${details.map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>
    </details>` : "";

  article.setAttribute("aria-label", `${time}, ${event.title}${event.momentText && event.momentText !== event.title ? `, ${event.momentText}` : ""}`);
  article.innerHTML = `
    ${statusLabel ? `<span class="status-flag">${statusLabel}</span>` : ""}
    <time class="event-time" datetime="${event.date}T${event.startTime}">${escapeHtml(time)}${timeDetail ? `<span>${escapeHtml(timeDetail)}</span>` : ""}</time>
    <div class="event-content">
      <h4>${escapeHtml(event.title)}</h4>
      ${moment}
      ${(groupBadge || typeBadge) ? `<div class="badge-row">${groupBadge}${typeBadge}</div>` : ""}
      ${location}
      ${extra}
    </div>
  `;
  return article;
}

function filterSummary() {
  const parts = [];
  if (state.group !== "all") parts.push(state.group);
  if (state.week !== "all") {
    const [year, week] = state.week.split("-W");
    parts.push(`vecka ${Number(week)} (${year})`);
  } else if (state.range !== "all") {
    parts.push({ today: "idag", current: "denna vecka", next: "nästa vecka" }[state.range]);
  }
  if (state.search) parts.push(`sökning: ”${state.search}”`);
  return parts.length ? `Visar ${parts.join(" · ")}` : "Visar alla schemaposter";
}

function setRange(range) {
  state.range = range;
  state.week = "all";
  elements.week.value = "all";
  for (const button of elements.quick) {
    const active = button.dataset.range === range;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  render();
}

function resetFilters() {
  state.group = "all";
  state.week = "all";
  state.search = "";
  elements.group.value = "all";
  elements.week.value = "all";
  elements.search.value = "";
  saveGroup("all");
  setRange("all");
}

elements.group.addEventListener("change", () => {
  state.group = elements.group.value;
  saveGroup(state.group);
  render();
});

elements.week.addEventListener("change", () => {
  state.week = elements.week.value;
  state.range = "all";
  for (const button of elements.quick) {
    const active = button.dataset.range === "all";
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  render();
});

elements.search.addEventListener("input", () => {
  state.search = elements.search.value.trim();
  render();
});
for (const button of elements.quick) button.addEventListener("click", () => setRange(button.dataset.range));
elements.reset.addEventListener("click", resetFilters);
elements.emptyReset.addEventListener("click", resetFilters);

let installPrompt;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.install.hidden = false;
  elements.install.textContent = "Installera app";
});

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if (isIos && !isStandalone) {
  elements.install.hidden = false;
  elements.install.textContent = "Lägg till på hemskärmen";
}

elements.install.addEventListener("click", async () => {
  if (installPrompt) {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    elements.install.hidden = true;
  } else if (isIos) {
    if (typeof elements.iosDialog.showModal === "function") elements.iosDialog.showModal();
    else elements.iosDialog.setAttribute("open", "");
  }
});
function closeIosInstallDialog() {
  if (typeof elements.iosDialog.close === "function") elements.iosDialog.close();
  else elements.iosDialog.removeAttribute("open");
}
elements.closeIosDialog.addEventListener("click", closeIosInstallDialog);
elements.iosDialog.addEventListener("click", (event) => {
  if (event.target === elements.iosDialog) closeIosInstallDialog();
});
window.addEventListener("appinstalled", () => { elements.install.hidden = true; });

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js?v=16"));
}

initTheme();
initExamCountdown();
initTermInfo();
initFilters();
render();

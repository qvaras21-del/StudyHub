"use strict";
/* Planner: tasks with deadlines and priorities, month calendar, due reminders, Pomodoro timer, productivity stats. */
const PS = {
  ru: { add: "Добавить задачу", what: "Задача", due: "Срок", prio: "Приоритет", p1: "Высокий", p2: "Средний", p3: "Низкий", none: "Задач пока нет.", overdue: "Просрочено", today: "Сегодня срок",
    doneToday: "Выполнено сегодня", doneAll: "Выполнено всего", rate: "Доля выполненных", focus: "Фокус", rest: "Отдых", start: "Старт", pause: "Пауза", reset: "Сброс", sessions: "Pomodoro сегодня",
    del: "Удалить", remind: "Напоминание", wd: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] },
  uz: { add: "Vazifa qo‘shish", what: "Vazifa", due: "Muddat", prio: "Muhimlik", p1: "Yuqori", p2: "O‘rta", p3: "Past", none: "Hozircha vazifalar yo‘q.", overdue: "Muddati o‘tgan", today: "Bugun muddat",
    doneToday: "Bugun bajarildi", doneAll: "Jami bajarildi", rate: "Bajarilgan ulushi", focus: "Diqqat", rest: "Dam", start: "Boshlash", pause: "Pauza", reset: "Qayta", sessions: "Bugungi Pomodoro",
    del: "O‘chirish", remind: "Eslatma", wd: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"] },
};
const ps = (k) => PS[db.lang][k];
const pomo = { mode: "focus", left: 25 * 60, end: null, id: null };
let calMonth = new Date();

function pomoTick() {
  pomo.left = Math.max(0, Math.round((pomo.end - Date.now()) / 1000));
  if (pomo.left === 0) {
    clearInterval(pomo.id); pomo.id = null; pomo.end = null;
    if (pomo.mode === "focus") { const u = me(); if (u) { (u.pomo = u.pomo || []).push(Date.now()); save(); } }
    pomo.mode = pomo.mode === "focus" ? "rest" : "focus"; pomo.left = (pomo.mode === "focus" ? 25 : 5) * 60;
    toast(pomo.mode === "focus" ? ps("focus") : ps("rest"));
    if ($("#pomo")) plannerV();
  }
  if ($("#pclock")) $("#pclock").textContent = fmtClock(pomo.left);
}
const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function plannerV() {
  const u = me(); u.tasks = u.tasks || []; u.pomo = u.pomo || [];
  const today = day(Date.now()), open = u.tasks.filter((x) => !x.done);
  const late = open.filter((x) => x.due && x.due < today), dueNow = open.filter((x) => x.due === today);
  const doneToday = u.tasks.filter((x) => x.done && day(x.doneAt) === today).length, doneAll = u.tasks.filter((x) => x.done).length;
  const rate = u.tasks.length ? Math.round((doneAll / u.tasks.length) * 100) : 0, sess = u.pomo.filter((ts_) => day(ts_) === today).length;
  const sorted = [...u.tasks].sort((a, b) => a.done - b.done || (a.due || "9").localeCompare(b.due || "9") || a.prio - b.prio);
  const y = calMonth.getFullYear(), m = calMonth.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
  const dueDays = new Set(open.map((x) => x.due));
  const cells = [...Array(first).fill("<span></span>"), ...[...Array(n)].map((_, k) => {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(k + 1).padStart(2, "0")}`;
    return `<button type="button" class="cal ${ds === today ? "now" : ""}" data-d="${ds}" aria-label="${ds}">${k + 1}${dueDays.has(ds) ? "<i></i>" : ""}</button>`;
  })].join("");
  view(`<h1>${t("planner")}</h1>
    ${late.length || dueNow.length ? `<div class="card" role="status" style="border-color:var(--err)">🔔 ${ps("remind")}: ${late.length ? `${ps("overdue")}: ${late.length}. ` : ""}${dueNow.length ? `${ps("today")}: ${dueNow.length}` : ""}</div>` : ""}
    <div class="grid" style="margin-top:14px"><div class="card stat"><b>${doneToday}</b>${ps("doneToday")}</div><div class="card stat"><b>${doneAll}</b>${ps("doneAll")}</div><div class="card stat"><b>${rate}%</b>${ps("rate")}${bar(rate)}</div><div class="card stat"><b>${sess}</b>${ps("sessions")}</div></div>
    <div class="grid" style="margin-top:16px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
    <div class="card" id="pomo"><h3>🍅 ${ps(pomo.mode)}</h3><b id="pclock" style="font-size:3rem">${fmtClock(pomo.left)}</b>
      <div class="row"><button id="pgo" class="btn">${pomo.id ? ps("pause") : ps("start")}</button><button id="prs" class="btn ghost">${ps("reset")}</button></div></div>
    <div class="card"><div class="row" style="margin:0 0 8px;align-items:center"><button class="chip" id="pm" aria-label="prev">‹</button><b style="text-align:center">${calMonth.toLocaleDateString(db.lang === "ru" ? "ru" : "uz", { month: "long", year: "numeric" })}</b><button class="chip" id="nm" aria-label="next">›</button></div>
      <div class="calg">${ps("wd").map((d) => `<small class="mute">${d}</small>`).join("")}${cells}</div></div></div>
    <h2>${ps("add")}</h2><form class="card" id="pf"><div class="row" style="margin:0"><div><label for="pt">${ps("what")}</label><input id="pt" maxlength="120" required></div>
      <div><label for="pd">${ps("due")}</label><input id="pd" type="date"></div><div><label for="pp">${ps("prio")}</label><select id="pp"><option value="1">${ps("p1")}</option><option value="2" selected>${ps("p2")}</option><option value="3">${ps("p3")}</option></select></div></div>
      <button class="btn" type="submit" style="margin-top:14px">${ps("add")}</button></form>
    <div style="margin-top:16px">${sorted.map((x) => `<div class="card task ${x.done ? "isdone" : ""}" style="margin-bottom:8px;padding:12px 16px"><label style="margin:0;display:flex;gap:10px;align-items:center;color:var(--ink);flex:1">
      <input type="checkbox" data-t="${x.id}" ${x.done ? "checked" : ""} style="width:auto"><span>${esc(x.title)}</span></label>
      ${x.due ? `<span class="tag" style="${!x.done && x.due < today ? "color:var(--err)" : ""}">${esc(x.due)}</span>` : ""}<span class="tag">${ps("p" + x.prio)}</span><button class="chip" data-x="${x.id}" aria-label="${ps("del")}">✕</button></div>`).join("") || `<p class="mute">${ps("none")}</p>`}</div>`);

  $("#pf").addEventListener("submit", (e) => {
    e.preventDefault(); const title = $("#pt").value.trim(); if (!title) return;
    u.tasks.push({ id: "k" + Date.now() + Math.random().toString(36).slice(2, 6), title, due: $("#pd").value, prio: +$("#pp").value, done: false }); save(); plannerV();
  });
  document.querySelectorAll("[data-t]").forEach((c) => c.addEventListener("change", () => { const x = u.tasks.find((k) => k.id === c.dataset.t); x.done = c.checked; x.doneAt = c.checked ? Date.now() : null; save(); plannerV(); }));
  document.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", () => { u.tasks = u.tasks.filter((k) => k.id !== b.dataset.x); save(); plannerV(); }));
  document.querySelectorAll(".cal").forEach((b) => b.addEventListener("click", () => { $("#pd").value = b.dataset.d; $("#pt").focus(); }));
  $("#pm").addEventListener("click", () => { calMonth = new Date(y, m - 1, 1); plannerV(); });
  $("#nm").addEventListener("click", () => { calMonth = new Date(y, m + 1, 1); plannerV(); });
  $("#pgo").addEventListener("click", () => {
    if (pomo.id) { clearInterval(pomo.id); pomo.id = null; pomo.end = null; }
    else { pomo.end = Date.now() + pomo.left * 1000; pomo.id = setInterval(pomoTick, 500); }
    plannerV();
  });
  $("#prs").addEventListener("click", () => { clearInterval(pomo.id); pomo.id = null; pomo.end = null; pomo.mode = "focus"; pomo.left = 25 * 60; plannerV(); });
}

window.EXTRA = Object.assign(window.EXTRA || {}, { planner: plannerV });

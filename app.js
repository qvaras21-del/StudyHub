"use strict";
/* StudyHub – stage 1. DEMO MODE: accounts and progress live in this browser's localStorage.
   Real security (shared accounts, roles, server-side checks) needs the Supabase backend (stage 2). */

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const L = {
  ru: { dash: "Панель", tests: "Тесты", planner: "Планировщик", courses: "Курсы", home: "Главная", login: "Войти", register: "Регистрация", logout: "Выйти", name: "Имя", email: "Почта", pass: "Пароль (мин. 8 символов)",
    hero: "Учись. Practice. Расти.", heroSub: "Курсы, уроки с проверкой, баллы и серии дней — всё в одном месте.", popular: "Популярные курсы", start: "Начать",
    hi: "Привет", active: "Курсов в процессе", percent: "Общий прогресс", points: "Баллы", level: "Уровень", streak: "Серия дней", last: "Продолжить", none: "Пока нет уроков — начните с каталога.",
    activity: "Активность за 7 дней", search: "Поиск курсов", all: "Все категории", prog: "Программирование", web: "Веб", math: "Алгоритмы и математика", lessons: "уроков", empty: "Ничего не найдено.",
    prev: "Назад", next: "Дальше", ok: "Верно! +10 баллов", already: "Урок уже пройден", bad: "Неверно, попробуйте ещё раз", back: "К курсу", exists: "Эта почта уже зарегистрирована",
    badLogin: "Неверная почта или пароль", badInput: "Проверьте имя, почту и пароль (мин. 8 символов)", demo: "Демо-режим: данные хранятся только в этом браузере.", level1: "Начальный", level2: "Средний", done: "Пройдено" },
  uz: { dash: "Panel", tests: "Testlar", planner: "Rejalashtirgich", courses: "Kurslar", home: "Bosh sahifa", login: "Kirish", register: "Ro‘yxatdan o‘tish", logout: "Chiqish", name: "Ism", email: "Pochta", pass: "Parol (kamida 8 belgi)",
    hero: "O‘rgan. Mashq qil. O‘s.", heroSub: "Kurslar, tekshiruvli darslar, ballar va ketma-ket kunlar — bir joyda.", popular: "Mashhur kurslar", start: "Boshlash",
    hi: "Salom", active: "Jarayondagi kurslar", percent: "Umumiy progress", points: "Ballar", level: "Daraja", streak: "Ketma-ket kunlar", last: "Davom etish", none: "Hozircha darslar yo‘q — katalogdan boshlang.",
    activity: "7 kunlik faollik", search: "Kurs qidirish", all: "Barcha toifalar", prog: "Dasturlash", web: "Veb", math: "Algoritm va matematika", lessons: "dars", empty: "Hech narsa topilmadi.",
    prev: "Orqaga", next: "Keyingi", ok: "To‘g‘ri! +10 ball", already: "Dars allaqachon o‘tilgan", bad: "Noto‘g‘ri, qayta urinib ko‘ring", back: "Kursga", exists: "Bu pochta ro‘yxatdan o‘tgan",
    badLogin: "Pochta yoki parol noto‘g‘ri", badInput: "Ism, pochta va parolni tekshiring (kamida 8 belgi)", demo: "Demo rejim: ma’lumotlar faqat shu brauzerda saqlanadi.", level1: "Boshlang‘ich", level2: "O‘rta", done: "O‘tildi" },
};

/* ---------- State ---------- */
const fresh = () => ({ users: {}, session: null, lang: "ru", theme: "dark" });
let db;
try { db = Object.assign(fresh(), JSON.parse(localStorage.getItem("sh_db"))); } catch (e) { db = fresh(); }
const save = () => { try { localStorage.setItem("sh_db", JSON.stringify(db)); } catch (e) { toast("Storage unavailable"); } };
const t = (k) => L[db.lang][k] || k;
const tx = (a) => a[db.lang === "ru" ? 0 : 1];
const me = () => db.users[db.session];
let toastTimer;
function toast(m) { const e = $("#toast"); e.textContent = m; e.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => e.classList.remove("show"), 2800); }

async function sha(s) {
  if (!crypto.subtle) throw new Error("Open the site via https:// or localhost");
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- Progress maths (all derived from real completed lessons) ---------- */
const day = (ts) => new Date(ts).toLocaleDateString("sv");
const totalLessons = () => COURSES.reduce((n, c) => n + c.lessons.length, 0);
const doneIn = (u, c) => c.lessons.filter((_, i) => u.done[c.id + ":" + i]).length;
const level = (u) => Math.floor(u.points / 50) + 1;
function streak(u) {
  const days = new Set(Object.values(u.done).map(day));
  let d = new Date(), n = 0;
  if (!days.has(day(d))) d.setDate(d.getDate() - 1);
  while (days.has(day(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function complete(c, i) {
  const u = me(), k = c.id + ":" + i, first = !u.done[k];
  if (first) { u.done[k] = Date.now(); u.points += 10; }
  u.last = { c: c.id, i };
  save();
  return first;
}

/* ---------- Views ---------- */
const view = (h) => { $("#view").innerHTML = h; };
const bar = (p) => `<div class="bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
const courseCard = (c, u) => {
  const n = u ? doneIn(u, c) : 0, p = Math.round((n / c.lessons.length) * 100);
  return `<a class="card" href="#/course/${c.id}"><span class="tag">${t(c.cat)}</span><span class="tag">${t("level" + c.level)}</span>
    <h3>${esc(tx(c.t))}</h3><p class="mute">${esc(tx(c.d))}</p><small class="mute">${c.lessons.length} ${t("lessons")}</small>${u ? bar(p) : ""}</a>`;
};

function landing() {
  const u = me();
  view(`<section class="hero"><h1>Study<span style="color:var(--a)">Hub</span><br>${esc(t("hero"))}</h1><p>${esc(t("heroSub"))}</p>
    ${u ? `<a class="btn" href="#/dashboard">${t("dash")}</a>` : `<a class="btn" href="#/auth/register">${t("register")}</a> <a class="btn ghost" href="#/auth/login">${t("login")}</a>`}</section>
    <div class="grid"><div class="card stat"><b>${COURSES.length}</b>${t("courses")}</div><div class="card stat"><b>${totalLessons()}</b>${t("lessons")}</div></div>
    <h2>${t("popular")}</h2><div class="grid">${COURSES.map((c) => courseCard(c, u)).join("")}</div>`);
}

function authV(mode) {
  const reg = mode === "register";
  view(`<div class="card auth"><h1>${t(reg ? "register" : "login")}</h1><p class="mute">${t("demo")}</p>
    <form id="f" novalidate>${reg ? `<label for="n">${t("name")}</label><input id="n" autocomplete="name" required maxlength="40">` : ""}
    <label for="e">${t("email")}</label><input id="e" type="email" autocomplete="email" required>
    <label for="p">${t("pass")}</label><input id="p" type="password" autocomplete="${reg ? "new" : "current"}-password" required minlength="8">
    <p id="err" role="alert" style="color:var(--err)"></p><button class="btn" type="submit">${t(reg ? "register" : "login")}</button></form>
    <p><a class="mute" href="#/auth/${reg ? "login" : "register"}">${t(reg ? "login" : "register")}</a></p></div>`);
  $("#f").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = reg ? $("#n").value.trim() : "", email = $("#e").value.trim().toLowerCase(), pw = $("#p").value, err = $("#err");
    if (!/^\S+@\S+\.\S+$/.test(email) || pw.length < 8 || (reg && !name)) return (err.textContent = t("badInput"));
    try {
      if (reg) {
        if (db.users[email]) return (err.textContent = t("exists"));
        const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
        db.users[email] = { name, salt, hash: await sha(salt + pw), done: {}, points: 0, last: null };
      } else {
        const u = db.users[email];
        if (!u || (await sha(u.salt + pw)) !== u.hash) return (err.textContent = t("badLogin"));
      }
      db.session = email; save(); location.hash = "#/dashboard";
    } catch (e) { err.textContent = e.message; }
  });
}

function dashV() {
  const u = me(), done = Object.keys(u.done).length, pct = Math.round((done / totalLessons()) * 100);
  const active = COURSES.filter((c) => doneIn(u, c) > 0).length, last = u.last && COURSES.find((c) => c.id === u.last.c);
  const days = [...Array(7)].map((_, k) => { const d = new Date(); d.setDate(d.getDate() - 6 + k); return d; });
  const counts = days.map((d) => Object.values(u.done).filter((ts) => day(ts) === day(d)).length), max = Math.max(1, ...counts);
  view(`<h1>${t("hi")}, ${esc(u.name)}!</h1>
    <div class="grid"><div class="card stat"><b>${active}</b>${t("active")}</div><div class="card stat"><b>${pct}%</b>${t("percent")}${bar(pct)}</div>
    <div class="card stat"><b>${u.points}</b>${t("points")}</div><div class="card stat"><b>${level(u)}</b>${t("level")}</div><div class="card stat"><b>${streak(u)}</b>${t("streak")}</div></div>
    <h2>${t("last")}</h2>${last ? `<a class="card" href="#/lesson/${last.id}/${u.last.i}"><h3>${esc(tx(last.t))}</h3><p class="mute">${esc(tx(last.lessons[u.last.i].t))}</p></a>` : `<p class="mute">${t("none")}</p>`}
    <h2>${t("activity")}</h2><div class="card"><div class="chart">${counts.map((n, k) => `<div><i style="height:${(n / max) * 100}%" title="${n}"></i>${days[k].getDate()}</div>`).join("")}</div></div>`);
}

function coursesV() {
  const u = me();
  view(`<h1>${t("courses")}</h1><div class="row"><input id="q" type="search" placeholder="${t("search")}" aria-label="${t("search")}">
    <select id="cat" aria-label="${t("all")}"><option value="">${t("all")}</option>${["prog", "web", "math"].map((c) => `<option value="${c}">${t(c)}</option>`).join("")}</select></div><div id="list" class="grid"></div>`);
  const draw = () => {
    const q = $("#q").value.trim().toLowerCase(), cat = $("#cat").value;
    const r = COURSES.filter((c) => (!cat || c.cat === cat) && (tx(c.t) + tx(c.d)).toLowerCase().includes(q));
    $("#list").innerHTML = r.map((c) => courseCard(c, u)).join("") || `<p class="mute">${t("empty")}</p>`;
  };
  $("#q").addEventListener("input", draw); $("#cat").addEventListener("change", draw); draw();
}

function courseV(id) {
  const c = COURSES.find((x) => x.id === id), u = me();
  if (!c) return coursesV();
  view(`<h1>${esc(tx(c.t))}</h1><p class="mute">${esc(tx(c.d))}</p>${bar(Math.round((doneIn(u, c) / c.lessons.length) * 100))}<h2>${t("lessons")}</h2>
    <div class="grid">${c.lessons.map((l, i) => `<a class="card" href="#/lesson/${c.id}/${i}"><h3>${i + 1}. ${esc(tx(l.t))}</h3>${u.done[c.id + ":" + i] ? `<span class="tag">✓ ${t("done")}</span>` : ""}</a>`).join("")}</div>`);
}

function lessonV(id, idx) {
  const c = COURSES.find((x) => x.id === id), i = +idx, l = c && c.lessons[i], u = me();
  if (!l) return (location.hash = "#/courses");
  u.last = { c: c.id, i }; save();
  const q = l.q, k = id + ":" + i;
  view(`<p><a class="mute" href="#/course/${c.id}">← ${t("back")}: ${esc(tx(c.t))}</a></p><h1>${esc(tx(l.t))}</h1>
    <div class="card"><p>${esc(tx(l.b))}</p></div><h2>${esc(tx(q.q))}</h2>
    <div id="opts">${q.o.map((o, n) => `<button class="opt" data-n="${n}">${esc(o)}</button>`).join("")}</div><p id="msg" role="status" class="mute">${u.done[k] ? t("already") : ""}</p>
    <div class="row">${i > 0 ? `<a class="btn ghost" href="#/lesson/${c.id}/${i - 1}">← ${t("prev")}</a>` : ""}${i < c.lessons.length - 1 ? `<a class="btn" href="#/lesson/${c.id}/${i + 1}">${t("next")} →</a>` : ""}</div>`);
  $("#opts").addEventListener("click", (e) => {
    const b = e.target.closest(".opt"); if (!b || b.disabled) return;
    if (+b.dataset.n !== q.a) { b.classList.add("bad"); $("#msg").textContent = t("bad"); return; }
    const first = complete(c, i);
    document.querySelectorAll(".opt").forEach((x) => (x.disabled = true)); b.classList.add("ok");
    $("#msg").textContent = first ? t("ok") : t("already"); if (first) toast(t("ok"));
  });
}

/* ---------- Shell: nav, theme, language, router ---------- */
function shell() {
  const u = me();
  document.documentElement.dataset.theme = db.theme; document.documentElement.lang = db.lang;
  const links = u ? [["dashboard", "dash"], ["courses", "courses"], ["tests", "tests"], ["planner", "planner"]] : [["", "home"], ["auth/login", "login"]];
  const cur = location.hash.slice(2).split("/")[0];
  $("#nav").innerHTML = links.map(([h, k]) => `<a href="#/${h}" class="${cur === h.split("/")[0] ? "on" : ""}">${t(k)}</a>`).join("");
  $("#lang").textContent = db.lang === "ru" ? "UZ" : "RU";
  $("#theme").textContent = db.theme === "dark" ? "☀" : "☾";
  $("#user").innerHTML = u ? `${esc(u.name)} <button id="out" class="chip">${t("logout")}</button>` : "";
  if (u) $("#out").addEventListener("click", () => { db.session = null; save(); location.hash = "#/"; });
}
function route() {
  const [, p = "", a, b] = (location.hash.slice(1) || "/").split("/");
  if (["dashboard", "courses", "course", "lesson", "tests", "test", "planner"].includes(p) && !me()) return (location.hash = "#/auth/login");
  if (db.session && !me()) db.session = null;
  shell(); $("#side").classList.remove("open");
  ({ "": landing, auth: authV, dashboard: dashV, courses: coursesV, course: courseV, lesson: lessonV, ...window.EXTRA }[p] || landing)(a, b);
  window.scrollTo(0, 0);
}
$("#lang").addEventListener("click", () => { db.lang = db.lang === "ru" ? "uz" : "ru"; save(); route(); });
$("#theme").addEventListener("click", () => { db.theme = db.theme === "dark" ? "light" : "dark"; save(); route(); });
$("#menu").addEventListener("click", () => $("#side").classList.toggle("open"));
window.addEventListener("hashchange", route);
route();

"use strict";
/* Tests: built-in mixed quiz + user-created tests (multiple choice and free answer), timer, history. */
const TS = {
  ru: { mix: "Общий тест по курсам", min: "мин", create: "Создать тест", title: "Название", minutes: "Время, минут", fmt: "Формат строки: Вопрос | вариант1 ; вариант2 ; вариант3 | номер верного | пояснение. Для свободного ответа: Вопрос | =ответ | пояснение",
    save: "Сохранить тест", start: "Начать", submit: "Завершить", left: "Осталось", score: "Результат", again: "Пройти снова", history: "История попыток", noHist: "Попыток пока нет.", yours: "Ваш ответ", right: "Верно", wrong: "Неверно",
    correct: "Правильный ответ", err: "Ошибка в строке", need: "Добавьте название и хотя бы один вопрос", award: "+20 баллов за первый зачёт (от 70%)", free: "Ваш ответ", del: "Удалить", mine: "Мои тесты", empty: "Нет ответа" },
  uz: { mix: "Kurslar bo‘yicha umumiy test", min: "daq", create: "Test yaratish", title: "Nomi", minutes: "Vaqt, daqiqa", fmt: "Qator formati: Savol | variant1 ; variant2 ; variant3 | to‘g‘ri raqam | izoh. Erkin javob uchun: Savol | =javob | izoh",
    save: "Testni saqlash", start: "Boshlash", submit: "Yakunlash", left: "Qoldi", score: "Natija", again: "Qayta topshirish", history: "Urinishlar tarixi", noHist: "Hozircha urinishlar yo‘q.", yours: "Javobingiz", right: "To‘g‘ri", wrong: "Noto‘g‘ri",
    correct: "To‘g‘ri javob", err: "Qatorda xato", need: "Nom va kamida bitta savol qo‘shing", award: "+20 ball birinchi o‘tish uchun (70% dan)", free: "Javobingiz", del: "O‘chirish", mine: "Mening testlarim", empty: "Javob yo‘q" },
};
const ts = (k) => TS[db.lang][k] || k;

const builtIn = () => ({ id: "mix", title: ts("mix"), min: 5, qs: COURSES.flatMap((c) => c.lessons.map((l) => ({ q: tx(l.q.q), o: l.q.o, a: l.q.a, e: "" }))) });
const allTests = (u) => [builtIn(), ...(u.tests || [])];

function parseQuestions(text) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line, n) => {
    const p = line.split("|").map((x) => x.trim());
    const fail = () => { throw new Error(`${ts("err")} ${n + 1}`); };
    if (p.length < 2 || !p[0]) fail();
    if (p[1].startsWith("=")) { if (!p[1].slice(1).trim()) fail(); return { q: p[0], free: p[1].slice(1).trim(), e: p[2] || "" }; }
    const o = p[1].split(";").map((x) => x.trim()).filter(Boolean), a = parseInt(p[2], 10) - 1;
    if (o.length < 2 || !(a >= 0 && a < o.length)) fail();
    return { q: p[0], o, a, e: p[3] || "" };
  });
}

function testsV() {
  const u = me(); u.tests = u.tests || []; u.attempts = u.attempts || [];
  view(`<h1>${t("tests")}</h1><div class="grid">${allTests(u).map((x) => `<div class="card"><h3>${esc(x.title)}</h3><p class="mute">${x.qs.length} ${db.lang === "ru" ? "вопр." : "savol"} · ${x.min} ${ts("min")}</p>
      <a class="btn" href="#/test/${x.id}">${ts("start")}</a>${x.id !== "mix" ? ` <button class="btn ghost" data-del="${x.id}">${ts("del")}</button>` : ""}</div>`).join("")}</div>
    <h2>${ts("create")}</h2><form class="card" id="tf"><label for="tt">${ts("title")}</label><input id="tt" maxlength="60" required>
    <label for="tm">${ts("minutes")}</label><input id="tm" type="number" min="1" max="180" value="10">
    <label for="tq">${esc(ts("fmt"))}</label><textarea id="tq" rows="6" required></textarea><p id="terr" role="alert" style="color:var(--err)"></p>
    <button class="btn" type="submit">${ts("save")}</button></form>
    <h2>${ts("history")}</h2>${u.attempts.length ? `<div class="card">${u.attempts.slice(0, 15).map((a) => `<p>${esc(a.title)} — <b>${a.score}/${a.total}</b> <span class="mute">${new Date(a.at).toLocaleString()}</span></p>`).join("")}</div>` : `<p class="mute">${ts("noHist")}</p>`}`);
  document.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { u.tests = u.tests.filter((x) => x.id !== b.dataset.del); save(); testsV(); }));
  $("#tf").addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const qs = parseQuestions($("#tq").value), title = $("#tt").value.trim();
      if (!title || !qs.length) throw new Error(ts("need"));
      u.tests.push({ id: "t" + Date.now(), title, min: Math.min(180, Math.max(1, +$("#tm").value || 10)), qs }); save(); testsV();
    } catch (err) { $("#terr").textContent = err.message; }
  });
}

function testV(id) {
  const u = me(), test = allTests(u).find((x) => x.id === id);
  if (!test) return (location.hash = "#/tests");
  let left = test.min * 60;
  view(`<h1>${esc(test.title)}</h1><p class="card" id="clock" aria-live="off"></p><form id="tk">${test.qs.map((q, i) => `<div class="card" style="margin:12px 0"><b>${i + 1}. ${esc(q.q)}</b>
    ${q.free !== undefined ? `<input name="q${i}" aria-label="${ts("free")}" autocomplete="off">` : q.o.map((o, n) => `<label style="color:var(--ink)"><input type="radio" name="q${i}" value="${n}" style="width:auto"> ${esc(o)}</label>`).join("")}</div>`).join("")}
    <button class="btn" type="submit">${ts("submit")}</button></form><div id="res"></div>`);
  const form = $("#tk"), clock = $("#clock");
  const draw = () => { clock.textContent = `${ts("left")}: ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; };
  draw();
  const timer = setInterval(() => {
    if (!document.body.contains(form)) return clearInterval(timer);
    left--; draw(); if (left <= 0) finish();
  }, 1000);
  function finish() {
    clearInterval(timer);
    let score = 0;
    const rows = test.qs.map((q, i) => {
      const d = new FormData(form).get("q" + i);
      const ok = q.free !== undefined ? d !== null && d.trim().toLowerCase() === q.free.toLowerCase() : d !== null && +d === q.a;
      if (ok) score++;
      const given = d === null || d === "" ? ts("empty") : q.free !== undefined ? d : q.o[+d];
      return `<div class="card" style="margin:10px 0"><b>${i + 1}. ${esc(q.q)}</b><p>${ok ? "✅ " + ts("right") : "❌ " + ts("wrong")} · ${ts("yours")}: ${esc(given)}</p>
        ${ok ? "" : `<p>${ts("correct")}: ${esc(q.free !== undefined ? q.free : q.o[q.a])}</p>`}${q.e ? `<p class="mute">${esc(q.e)}</p>` : ""}</div>`;
    }).join("");
    u.attempts = u.attempts || []; u.attempts.unshift({ tid: test.id, title: test.title, score, total: test.qs.length, at: Date.now() });
    u.attempts = u.attempts.slice(0, 50);
    u.awards = u.awards || {};
    let award = "";
    if (score / test.qs.length >= 0.7 && !u.awards[test.id]) { u.awards[test.id] = Date.now(); u.points += 20; award = `<p class="tag">${ts("award")}</p>`; }
    save();
    form.remove(); clock.remove();
    $("#res").innerHTML = `<div class="card stat"><b>${score}/${test.qs.length}</b>${ts("score")} ${award}</div>${rows}<a class="btn" href="#/test/${test.id}" onclick="setTimeout(route,0)">${ts("again")}</a> <a class="btn ghost" href="#/tests">${t("tests")}</a>`;
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); finish(); });
}

window.EXTRA = Object.assign(window.EXTRA || {}, { tests: testsV, test: testV });

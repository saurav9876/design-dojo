(function () {
  const { el, fmt, highlight, Store, typeText, shuffle } = window.U;
  const LESSONS = window.LESSONS;
  const byId = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
  const TRACKS = [
    { id: "found", name: "Foundations", blurb: "The mindset, a repeatable framework, and estimation." },
    { id: "hld", name: "High-Level Design", blurb: "Scaling, caching, databases, queues, consistency and a full case study." },
    { id: "lld", name: "Low-Level Design", blurb: "Deep modules, SOLID, patterns, a worked design, concurrency and refactoring." },
  ];
  const main = document.getElementById("main");
  const side = document.getElementById("side");
  let cleanups = [];
  let observer = null;

  const done = () => Store.get("done", {});
  const isDone = (id) => !!done()[id];
  const doneCount = () => LESSONS.filter((l) => isDone(l.id)).length;
  function toggleDone(id) {
    const d = done(); d[id] = !d[id]; Store.set("done", d);
    buildSide();
    if (location.hash === "#/lesson/" + id) syncCompleteBtn(id);
    else if (/^#\/(home|path)?$/.test(location.hash)) { const y = window.scrollY; route(); window.scrollTo(0, y); }
  }
  function syncCompleteBtn(id) {
    const b = document.getElementById("complete-btn");
    if (!b) return;
    b.className = "btn " + (isDone(id) ? "" : "good");
    b.textContent = isDone(id) ? "Completed. Click to undo" : "Mark lesson complete";
    const st = document.querySelector(".page-head .meta span:last-child");
    if (st) st.textContent = isDone(id) ? "Completed" : "Not completed yet";
  }
  const runCleanups = () => { cleanups.forEach((f) => { try { f(); } catch (e) {} }); cleanups = []; };
  const mount = (node) => { main.replaceChildren(node); };

  function reveal(root) {
    if (observer) observer.disconnect();
    const targets = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { targets.forEach((t) => t.classList.add("in")); return; }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        if (en.target.__onShow) { en.target.__onShow(); en.target.__onShow = null; }
        observer.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    targets.forEach((t) => observer.observe(t));
  }

  /* ---------- sidebar ---------- */
  function dueCards() {
    const store = Store.get("cards", {});
    const now = Date.now();
    return allCards().filter((c) => !store[c.id] || store[c.id].due <= now);
  }
  const openTracks = new Set(TRACKS.map((t) => t.id));
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  function buildSide() {
    const link = (href, text, extra) => el("a", { href, "data-href": href }, text, extra);
    const duePill = () => el("span", { class: "pill due-pill" }, String(dueCards().length));
    const markPill = () => el("span", { class: "pill mk-pill" }, String(window.Marks.count()));
    const toggleTheme = () => {
      const light = document.documentElement.getAttribute("data-theme") === "light";
      const nxt = light ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", nxt); Store.set("theme", nxt);
    };

    /* top pill bar */
    const top = document.getElementById("top");
    top.replaceChildren(el("div", { class: "top-in" },
      el("a", { class: "brand", href: "#/home" }, "Design Dojo"),
      el("nav", { class: "top-links", "aria-label": "Primary" },
        link("#/home", "Home"), link("#/path", "Path"), link("#/hld", "HLD"), link("#/lld", "LLD"), link("#/cards", "Flashcards", duePill()), link("#/resources", "Resources")),
      el("div", { class: "top-actions" },
        el("button", { type: "button", class: "top-search", onclick: () => openSearch(), "aria-label": "Search" }, el("span", { class: "ico", "aria-hidden": "true" }, "\u2315"), el("span", { class: "lbl" }, "Search"), el("kbd", {}, isMac ? "\u2318K" : "Ctrl K")),
        el("button", { type: "button", class: "top-icon", onclick: toggleTheme, title: "Toggle light / dark", "aria-label": "Toggle light or dark theme" }, "\u25D0"),
        el("button", { type: "button", class: "top-cta", onclick: () => document.body.classList.toggle("nav-open"), "aria-label": "Open lessons menu" }, "Lessons ", el("span", { class: "cta-count" }, doneCount() + "/" + LESSONS.length)))));

    /* lessons drawer */
    side.replaceChildren();
    const nav = el("nav", { class: "nav" });
    nav.append(el("div", { class: "top" },
      link("#/home", "Home"), link("#/path", "Learning path"), link("#/hld", "High-level design (HLD)"), link("#/lld", "Low-level design (LLD)"),
      link("#/cards", "Flashcards", duePill()),
      link("#/notes", "My notes"), link("#/marks", "Highlights", markPill()), link("#/tools", "Tools and cheat sheet"), link("#/resources", "Resources and videos")));
    TRACKS.forEach((t) => {
      const det = el("details", { "data-track": t.id }, el("summary", {}, t.name));
      det.open = openTracks.has(t.id);
      det.addEventListener("toggle", () => { if (det.open) openTracks.add(t.id); else openTracks.delete(t.id); });
      if (LESSONS.filter((l) => l.track === t.id).every((l) => isDone(l.id))) det.firstChild.classList.add("is-done");
      LESSONS.filter((l) => l.track === t.id).forEach((l) => {
        const a = link("#/lesson/" + l.id, l.title, null);
        a.dataset.lesson = l.id;
        const on = isDone(l.id);
        a.classList.toggle("is-done", on);
        const tick = el("button", { type: "button", class: "tick" + (on ? " done" : ""), "aria-pressed": on ? "true" : "false",
          title: on ? "Completed. Click to undo" : "Mark as complete", "aria-label": (on ? "Completed: " : "Mark complete: ") + l.title,
          onclick: () => toggleDone(l.id) }, on ? "\u2713" : "");
        det.append(el("div", { class: "nav-row" }, tick, a));
      });
      nav.append(det);
    });
    const reset = el("button", { class: "btn sm danger", onclick: () => {
      if (confirm("Reset all progress, quiz scores, flashcards, notes, highlights and comments?")) {
        ["done", "quiz", "cards", "drills", "notes", "marks"].forEach((k) => Store.set(k, {}));
        buildSide(); route();
      }
    } }, "Reset progress");
    side.append(
      el("div", { class: "drawer-head" }, el("b", {}, "Lessons"), el("button", { type: "button", class: "top-icon", "aria-label": "Close menu", onclick: () => document.body.classList.remove("nav-open") }, "\u2715")),
      nav, el("div", { class: "side-foot" }, reset));
    markActive();
  }
  function markActive() {
    const h = location.hash || "#/home";
    const parts = h.replace(/^#\//, "").split("/");
    let section = null;   // which top-level track a page belongs to, so HLD / LLD stay highlighted inside it
    if (parts[0] === "lesson" && byId[parts[1]] && byId[parts[1]].track !== "found") section = "#/" + byId[parts[1]].track;
    if (parts[0] === "drills") { const d = (window.DRILLS || []).find((x) => x.id === parts[1]); if (d) section = "#/" + d.kind.toLowerCase(); }
    document.querySelectorAll("a[data-href]").forEach((a) => {
      const on = a.getAttribute("data-href") === h || a.getAttribute("data-href") === section;
      a.classList.toggle("active", on);
      const det = a.closest("details");
      if (on && det) det.open = true;
    });
    document.querySelectorAll(".due-pill").forEach((p) => (p.textContent = String(dueCards().length)));
    document.querySelectorAll(".mk-pill").forEach((p) => (p.textContent = String(window.Marks.count())));
    document.querySelectorAll(".cta-count").forEach((p) => (p.textContent = doneCount() + "/" + LESSONS.length));
  }

  /* ---------- shared bits ---------- */
  function codeBlock(c) {
    const pre = el("pre", { class: "code" });
    pre.innerHTML = highlight(c.text);
    const copy = el("button", { class: "btn sm", onclick: (e) => {
      try { navigator.clipboard.writeText(c.text); e.target.textContent = "Copied"; setTimeout(() => (e.target.textContent = "Copy"), 1200); } catch (err) { e.target.textContent = "Select and copy"; }
    } }, "Copy");
    return el("div", { class: "codewrap" }, el("div", { class: "cap" }, el("span", {}, c.title || "Code"), copy), pre);
  }
  function table(t) {
    const tb = el("table", { class: "t" });
    tb.append(el("thead", {}, el("tr", {}, t.head.map((h) => el("th", { html: fmt(h) })))));
    tb.append(el("tbody", {}, t.rows.map((r) => el("tr", {}, r.map((c) => el("td", { html: fmt(c) }))))));
    return tb;
  }
  function note(n) {
    const label = { tip: "Tip", warn: "Watch out", info: "Good to know" }[n.kind] || "Note";
    return el("div", { class: "note " + n.kind }, el("b", { class: "t" }, label), el("span", { html: fmt(n.text) }));
  }
  function videos(list) {
    return el("div", {}, list.map((v) => el("a", { class: "vid", href: window.YT(v.q), target: "_blank", rel: "noopener noreferrer" },
      el("span", { class: "play" }, "▶"), el("span", {}, el("b", {}, v.t), el("small", {}, "Opens YouTube search results: " + v.q)))));
  }
  function pageHead({ crumbs, eyebrow, title, lead, meta }) {
    return el("header", { class: "page-head" },
      el("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, crumbs.flatMap(([t, h], i) => [i ? el("i", {}, "/") : null, h ? el("a", { href: h }, t) : el("span", {}, t)])),
      eyebrow ? el("p", { class: "eyebrow" }, eyebrow) : null,
      el("h1", {}, title),
      lead ? el("p", { class: "lead" }, lead) : null,
      meta ? el("div", { class: "meta" }, meta.map((m) => el("span", {}, m))) : null);
  }
  function badge(track) {
    const t = TRACKS.find((x) => x.id === track);
    return el("span", { class: "badge " + track }, t ? t.name : track);
  }

  /* ---------- quiz ---------- */
  function buildQuiz(lesson) {
    const box = el("div", { class: "quiz" });
    let answered = 0, correct = 0;
    const result = el("p", { class: "result" });
    lesson.quiz.forEach((q, qi) => {
      const order = shuffle(q.o.map((_, i) => i));
      const why = el("div", { class: "why", hidden: "" });
      const btns = order.map((oi) => {
        const b = el("button", { class: "opt", onclick: () => {
          if (b.dataset.locked) return;
          btns.forEach((x) => (x.dataset.locked = "1"));
          answered++;
          if (oi === q.a) { correct++; b.classList.add("right"); } else {
            b.classList.add("wrong");
            btns[order.indexOf(q.a)].classList.add("right");
          }
          why.hidden = false;
          why.textContent = (oi === q.a ? "Correct. " : "Not quite. ") + q.why;
          if (answered === lesson.quiz.length) {
            const quiz = Store.get("quiz", {});
            quiz[lesson.id] = Math.max(quiz[lesson.id] || 0, correct);
            Store.set("quiz", quiz);
            result.textContent = "Score: " + correct + " / " + lesson.quiz.length + (correct === lesson.quiz.length ? ". Perfect, mark the lesson complete!" : ". Re-read the notes you missed, then try again tomorrow.");
          }
        } }, q.o[oi]);
        return b;
      });
      box.append(el("div", { class: "qq" }, el("p", { class: "q-t" }, (qi + 1) + ". " + q.q), btns, why));
    });
    box.append(result, el("button", { class: "btn", onclick: () => { box.replaceWith(buildQuiz(lesson)); } }, "Retry quiz"));
    return box;
  }

  /* ---------- views ---------- */
  function viewHome() {
    const total = LESSONS.length, n = doneCount();
    const next = LESSONS.find((l) => !isDone(l.id));
    const typeEl = el("h1", { class: "type caret" });
    const phrases = ["Design systems that scale.", "Draw boxes. Defend trade-offs.", "Write code that survives change.", "Learn it. Watch it move. Recall it."];
    let pi = 0, cancel = null, timer = null;
    const cycle = () => {
      cancel = typeText(typeEl, phrases[pi % phrases.length], 38, () => { timer = setTimeout(() => { pi++; cycle(); }, 1800); });
    };
    cycle();
    cleanups.push(() => { clearTimeout(timer); if (cancel) cancel(); });
    const node = el("div", { class: "wrap wide" },
      el("section", { class: "hero" },
        el("p", { class: "muted small", style: "margin:0 0 8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase" }, "High-level and low-level software design"),
        typeEl,
        el("p", { class: "lead", style: "margin:14px 0 18px;max-width:640px" }, "A local, hands-on course built from what working engineers keep recommending on Hacker News, Reddit and Blind: principles first, simulators you can break, quizzes with spaced repetition, and drills that mirror real interviews."),
        el("div", { class: "controls" },
          el("a", { class: "btn primary", href: next ? "#/lesson/" + next.id : "#/hld" }, n === 0 ? "Start learning" : next ? "Continue: " + next.title : "Go to practice drills"),
          el("a", { class: "btn", href: "#/path" }, "See the learning path")),
        el("div", { style: "margin-top:18px;max-width:420px" }, el("div", { class: "progress" }, el("i", { style: "width:" + Math.round((100 * n) / total) + "%" })), el("p", { class: "small muted", style: "margin:6px 0 0" }, n + " of " + total + " lessons complete"))),
      el("h2", { style: "margin-top:8px" }, "Three tracks"),
      el("div", { class: "grid c3" }, TRACKS.map((t) => {
        const ls = LESSONS.filter((l) => l.track === t.id);
        const d = ls.filter((l) => isDone(l.id)).length;
        return el("a", { class: "card link reveal", href: "#/lesson/" + ls[0].id }, badge(t.id), el("h3", {}, t.name), el("p", { class: "muted" }, t.blurb), el("p", { class: "small muted", style: "margin:0" }, d + "/" + ls.length + " complete, " + ls.reduce((a, l) => a + l.min, 0) + " min"));
      })),
      el("h2", {}, "What the community keeps saying"),
      el("p", { class: "muted small" }, "Themes distilled from searching public discussions, guides and roundups that reference Hacker News, Reddit and Blind threads. I could not read the live threads directly, so treat this as a synthesis and follow the sources on the Resources page for the originals."),
      el("div", { class: "grid c2" }, window.INSIGHTS.map(([t, d]) => el("div", { class: "card reveal" }, el("h3", {}, t), el("p", { class: "muted", style: "margin:0" }, d)))),
      el("h2", {}, "How to use this app"),
      el("ol", { class: "steps" },
        el("li", { html: "<b>Learn</b> a lesson (10 to 20 minutes). Watch the key idea type itself out, then read the details." }),
        el("li", { html: "<b>Play</b> with the simulator in the lesson. Try to break it." }),
        el("li", { html: "<b>Quiz</b> yourself at the end. Quiz questions become flashcards automatically." }),
        el("li", { html: "<b>Review</b> flashcards every few days. They return on a spaced schedule." }),
        el("li", { html: "<b>Drill</b>: pick a design problem, set a timer, and design it out loud on paper or a whiteboard." }),
        el("li", { html: "<b>Compare</b> with a video of the same problem and note what you missed." })));
    mount(node); reveal(node);
  }

  function viewPath() {
    const node = el("div", { class: "wrap" },
      el("h1", {}, "Learning path"),
      el("p", { class: "lead" }, "A suggested 9-week order, about 5 hours per week. Faster or slower is fine. What matters is that you play with each idea and revisit it."),
      window.PATH.map((p) => el("div", { class: "card reveal", style: "margin:14px 0" },
        el("div", { class: "muted small", style: "font-weight:700;text-transform:uppercase;letter-spacing:.06em" }, p.w),
        el("h3", { style: "margin:2px 0 8px" }, p.t),
        p.items.length ? el("div", {}, p.items.map((id) => el("a", { href: "#/lesson/" + id, class: "btn sm", style: "margin:0 6px 6px 0" }, (isDone(id) ? "✓ " : "") + byId[id].title))) : el("div", {}, el("a", { href: "#/hld", class: "btn sm", style: "margin:0 6px 6px 0" }, "HLD drills"), el("a", { href: "#/lld", class: "btn sm" }, "LLD drills")),
        el("p", { class: "small muted", style: "margin:8px 0 0" }, "Goal: " + p.goal))));
    mount(node); reveal(node);
  }

  function renderSection(s, lesson, simDiv) {
    const sec = el("section", { class: "reveal" });
    if (s.h) sec.append(el("h2", {}, s.h));
    (s.p || []).forEach((t) => sec.append(el("p", { html: fmt(t) })));
    if (s.simSlot && simDiv) sec.append(simDiv);
    if (s.ul) sec.append(el("ul", { class: "l" }, s.ul.map((t) => el("li", { html: fmt(t) }))));
    if (s.steps) sec.append(el("ol", { class: "steps" }, s.steps.map((t) => el("li", { html: fmt(t) }))));
    if (s.table) sec.append(table(s.table));
    if (s.code) sec.append(codeBlock(s.code));
    if (s.code2) sec.append(codeBlock(s.code2));
    if (s.note) sec.append(note(s.note));
    return sec;
  }

  function viewLesson(id) {
    const lesson = byId[id];
    if (!lesson) return view404();
    runCleanups();
    const idx = LESSONS.indexOf(lesson);
    document.title = lesson.title + " | Design Dojo";
    let simDiv = null;
    if (lesson.sim && window.Sims[lesson.sim]) {
      simDiv = el("div", { class: "sim" });
      const stopSim = window.Sims[lesson.sim](simDiv);
      if (typeof stopSim === "function") cleanups.push(stopSim);
    }
    const keyText = el("span", {});
    const key = el("div", { class: "key reveal" }, el("small", {}, "Key idea"), keyText);
    key.__onShow = () => { const c = typeText(keyText, lesson.key, 16); cleanups.push(c); };
    const secs = lesson.sections.map((s) => renderSection(s, lesson, simDiv));
    const hasSlot = lesson.sections.some((s) => s.simSlot);
    const quizBox = buildQuiz(lesson);
    const completeBtn = el("button", { id: "complete-btn", class: "btn " + (isDone(id) ? "" : "good"), onclick: () => toggleDone(id) },
      isDone(id) ? "Completed. Click to undo" : "Mark lesson complete");
    const prev = LESSONS[idx - 1], nextL = LESSONS[idx + 1];
    const node = el("article", { class: "wrap" },
      pageHead({
        crumbs: [["Home", "#/home"], ["Learn", "#/path"], [(TRACKS.find((t) => t.id === lesson.track) || {}).name || lesson.track]],
        eyebrow: (TRACKS.find((t) => t.id === lesson.track) || {}).name || lesson.track,
        title: lesson.title, lead: lesson.summary,
        meta: [lesson.min + " min read", "Lesson " + (idx + 1) + " of " + LESSONS.length, isDone(id) ? "Completed" : "Not completed yet"],
      }),
      key, secs,
      !hasSlot && simDiv ? el("section", { class: "reveal" }, el("h2", {}, "Try it"), simDiv) : null,
      el("section", { class: "reveal" }, el("h2", {}, "Watch and read more"),
        el("p", { class: "small muted" }, "These open YouTube search results so you always get current, popular videos. See the Resources page for recommended channels, books and sites."),
        videos(lesson.videos),
        lesson.track === "lld" ? el("div", {}, el("h3", {}, "Follow-along LLD playlists"), lldPicks(false), el("p", { class: "small" }, el("a", { href: "#/resources" }, "Why these two, and the alternatives"), " | ", el("a", { href: "#/lld" }, "LLD drills"))) : null),
      el("section", { class: "reveal" }, el("h2", {}, "Check yourself"), quizBox),
      el("section", { class: "reveal" }, el("h2", {}, "My notes"), notesBox(id)),
      el("div", { style: "margin-top:28px" }, completeBtn),
      el("div", { class: "nav-bottom" },
        prev ? el("a", { class: "btn", href: "#/lesson/" + prev.id }, "← " + prev.title) : el("span"),
        nextL ? el("a", { class: "btn primary", href: "#/lesson/" + nextL.id }, nextL.title + " →") : el("a", { class: "btn primary", href: lesson.track === "lld" ? "#/lld" : "#/hld" }, (lesson.track === "lld" ? "LLD" : "HLD") + " practice →")));
    const toc = buildToc(node);
    if (toc) {
      const grid = el("div", { class: "lesson-grid" }, toc.aside, node);
      node.querySelector(".page-head").after(toc.mobile);
      mount(grid); reveal(grid);
      toc.start();
    } else { mount(node); reveal(node); }
    markActive();
  }

  /* "On this page": every section heading in one list, with the current one highlighted as you scroll. */
  function buildToc(root) {
    const heads = [...root.querySelectorAll("section h2, section h3")].filter((h) => !h.closest(".sim, .quiz, .card") && h.textContent.trim());
    if (heads.length < 3) return null;
    const pairs = [];
    const makeList = () => {
      const ul = el("ul", { class: "toc-list" });
      heads.forEach((h, i) => {
        const link = el("a", { href: "#", class: "toc-link " + (h.tagName === "H3" ? "l3" : "l2"), onclick: (e) => {
          e.preventDefault();
          document.body.classList.remove("nav-open");
          h.scrollIntoView({ behavior: "smooth", block: "start" });
          const d = link.closest("details"); if (d) d.open = false;
        } }, h.textContent.trim());
        (pairs[i] = pairs[i] || []).push(link);
        ul.append(el("li", {}, link));
      });
      return ul;
    };
    const aside = el("aside", { class: "toc nomark", "aria-label": "On this page" }, el("p", { class: "toc-h" }, "On this page"), makeList());
    const mobile = el("details", { class: "toc-m nomark" }, el("summary", {}, "On this page (" + heads.length + " sections)"), makeList());
    let cur = -1, ticking = false;
    const spy = () => {
      ticking = false;
      let idx = 0;
      for (let i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top <= 150) idx = i; else break; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = heads.length - 1;
      if (idx === cur) return;
      cur = idx;
      pairs.forEach((ls, i) => ls.forEach((l) => l.classList.toggle("on", i === idx)));
      const l = pairs[idx][0];
      if (aside.scrollHeight > aside.clientHeight) aside.scrollTop = Math.max(0, l.offsetTop - aside.clientHeight / 2);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } };
    return {
      aside, mobile,
      start() {
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        cleanups.push(() => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); });
        setTimeout(spy, 50);
      },
    };
  }

  function lldPicks(full) {
    const ext = (u) => ({ href: u, target: "_blank", rel: "noopener noreferrer" });
    const box = el("div", {}, window.LLD_PICKS.map((p) => el("a", Object.assign({ class: "vid" }, ext(p.url)),
      el("span", { class: "play" }, "▶"),
      el("span", {}, el("b", {}, p.title), el("small", {}, p.role + " | " + p.channel + " | " + p.stat), full ? el("small", {}, p.why) : null))));
    if (full) {
      box.append(el("h3", {}, "Other LLD playlists considered"),
        el("table", { class: "t" }, el("thead", {}, el("tr", {}, ["Channel", "Playlist", "What the forums say"].map((h) => el("th", {}, h)))),
          el("tbody", {}, window.LLD_RUNNERS.map((r) => el("tr", {}, el("td", {}, el("a", ext(r[3]), r[0])), el("td", {}, r[1]), el("td", {}, r[2]))))),
        el("h3", {}, "How forum posters say to learn LLD"),
        el("ol", { class: "steps" }, window.LLD_METHOD.map((t) => el("li", { html: fmt(t) }))),
        el("p", { class: "small muted" }, "How this was chosen: from public forum posts only (Blind, dev.to, LeetCode Discuss, GitHub LLD primer lists), with no YouTube statistics. Honest limits: Reddit could not be read, most threads are from 2020 to 2023, and several lists copy each other, so they are fewer independent votes than they look. Only one commenter personally endorsed a specific LLD playlist (Udit Agarwal). Skim the first two videos and switch if the style does not suit you."));
    }
    return box;
  }

  function notesBox(id) {
    const ta = el("textarea", { class: "notes", rows: "5", placeholder: "In your own words: what clicked, what confused you, where you could use it at work..." });
    ta.value = Store.get("notes", {})[id] || "";
    ta.addEventListener("input", () => {
      const n = Store.get("notes", {});
      if (ta.value.trim()) n[id] = ta.value; else delete n[id];
      Store.set("notes", n);
    });
    return ta;
  }

  function view404() {
    mount(el("div", { class: "wrap" }, el("h1", {}, "Not found"), el("p", {}, "That page does not exist. "), el("a", { class: "btn", href: "#/home" }, "Go home")));
  }

  /* ---------- drills ---------- */
  function viewDrills(sel) {
    if (!sel) { location.replace("#/hld"); return; }
    viewDrill(window.DRILLS.find((d) => d.id === sel));
  }
  const HUBS = {
    hld: { kind: "HLD", title: "High-Level Design", track: "hld", lead: "Scaling, caching, databases, queues, consistency and a full case study. Learn each idea, then practise it in a timed drill." },
    lld: { kind: "LLD", title: "Low-Level Design", track: "lld", lead: "Deep modules, SOLID, patterns, a worked design, concurrency and refactoring. Learn each idea, then practise it in a timed drill." },
  };
  function viewTrack(id) {
    const hub = HUBS[id];
    const finished = Store.get("drills", {});
    const lessons = LESSONS.filter((l) => l.track === "found" || l.track === hub.track);
    const mine = LESSONS.filter((l) => l.track === hub.track);
    const doneN = mine.filter((l) => isDone(l.id)).length;
    const drills = window.DRILLS.filter((d) => d.kind === hub.kind);
    document.title = hub.title + " | Design Dojo";
    const node = el("div", { class: "wrap wide" },
      pageHead({
        crumbs: [["Home", "#/home"], [hub.kind]], eyebrow: "Track", title: hub.title, lead: hub.lead,
        meta: [mine.length + " lessons", mine.reduce((s, l) => s + l.min, 0) + " min of reading", doneN + " of " + mine.length + " complete", drills.length + " drills"],
      }),
      el("h2", { style: "margin-top:0" }, "Lessons"),
      el("p", { class: "muted small", style: "margin-top:-6px" }, "Foundations apply to both tracks, so they are listed first."),
      el("div", {}, lessons.map((l) => el("a", { class: "card link reveal", href: "#/lesson/" + l.id },
        el("span", { class: "badge " + (l.track === "found" ? "found" : l.track) }, l.track === "found" ? "Foundations" : hub.kind), isDone(l.id) ? el("span", { class: "badge found" }, "\u2713 Done") : null,
        el("h3", {}, l.title), el("p", { class: "muted small", style: "margin:0" }, l.summary + "  |  " + l.min + " min")))),
      el("h2", {}, "Practice drills"),
      el("p", { class: "lead", style: "font-size:18px" }, "Reading is not enough. Pick a problem, start the timer, and design on paper or in a free whiteboard like Excalidraw, talking out loud. Then check your coverage and compare with a video."),
      el("div", { class: "grid c2" }, drills.map((d) => el("a", { class: "card link reveal", href: "#/drills/" + d.id },
        finished[d.id] ? el("span", { class: "badge found" }, "\u2713 Done") : el("span", { class: "badge " + hub.track }, hub.kind),
        el("h3", {}, d.title), el("p", { class: "muted small", style: "margin:0" }, d.prompt), el("p", { class: "small muted", style: "margin:8px 0 0" }, "Suggested time: " + d.time + " min")))));
    mount(node); reveal(node);
  }
  function viewDrill(d) {
    if (!d) return view404();
    const target = d.time * 60;
    let secs = 0, timer = null;
    const clock = el("div", { class: "timer" }, "00:00");
    const fmtT = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    const startBtn = el("button", { class: "btn primary", onclick: () => {
      if (timer) { clearInterval(timer); timer = null; startBtn.textContent = "Resume"; return; }
      startBtn.textContent = "Pause";
      timer = setInterval(() => { secs++; clock.textContent = fmtT(secs) + " / " + fmtT(target); clock.style.color = secs > target ? "var(--bad)" : ""; }, 1000);
    } }, "Start timer");
    cleanups.push(() => clearInterval(timer));
    const asks = el("ul", { class: "l", hidden: "" }, d.ask.map((a) => el("li", {}, a)));
    const showAsk = el("button", { class: "btn", onclick: () => { asks.hidden = !asks.hidden; showAsk.textContent = asks.hidden ? "Show clarifying questions you should ask" : "Hide clarifying questions"; } }, "Show clarifying questions you should ask");
    const checks = el("div", { hidden: "" });
    const score = el("p", { class: "muted small" });
    const boxes = d.cover.map((c) => {
      const cb = el("input", { type: "checkbox", onchange: upd });
      checks.append(el("label", { class: "check" }, cb, el("span", {}, c)));
      return cb;
    });
    function upd() {
      const n = boxes.filter((b) => b.checked).length;
      score.textContent = "You covered " + n + " of " + boxes.length + " points. Anything unchecked is your next study topic.";
    }
    const showChecks = el("button", { class: "btn", onclick: () => { checks.hidden = !checks.hidden; upd(); showChecks.textContent = checks.hidden ? "Reveal coverage checklist (after your attempt)" : "Hide checklist"; } }, "Reveal coverage checklist (after your attempt)");
    const finishBtn = el("button", { class: "btn good", onclick: () => {
      const f = Store.get("drills", {}); f[d.id] = true; Store.set("drills", f); finishBtn.textContent = "Saved. Nice work"; finishBtn.disabled = true;
    } }, "Mark drill done");
    mount(el("div", { class: "wrap" },
      pageHead({ crumbs: [["Home", "#/home"], [d.kind, "#/" + d.kind.toLowerCase()], ["Drill"]], eyebrow: d.kind + " drill", title: d.title, meta: ["Suggested " + d.time + " min"] }),
      el("div", { class: "card" }, el("p", { style: "font-size:18px;margin:0" }, d.prompt)),
      el("div", { class: "controls", style: "margin-top:16px" }, clock, startBtn, el("button", { class: "btn", onclick: () => { clearInterval(timer); timer = null; secs = 0; clock.textContent = "00:00"; clock.style.color = ""; startBtn.textContent = "Start timer"; } }, "Reset")),
      el("p", { class: "small muted" }, "Suggested: " + d.time + " minutes. Spend the first 5 clarifying requirements and estimating."),
      el("div", { class: "controls" }, showAsk), asks,
      el("div", { class: "controls" }, showChecks), checks, score,
      el("h3", {}, "Compare with others"),
      videos([{ t: "Watch a walkthrough: " + d.title, q: d.title.replace(/^Design an? /, "") + " " + (d.kind === "HLD" ? "system design interview" : "low level design object oriented") }]),
      el("div", { style: "margin-top:16px" }, finishBtn)));
  }

  /* ---------- flashcards ---------- */
  function allCards() {
    const out = [];
    LESSONS.forEach((l) => l.quiz.forEach((q, i) => out.push({ id: l.id + ":" + i, lesson: l, front: q.q, back: q.o[q.a] + ". " + q.why })));
    return out;
  }
  function viewCards() {
    const INTERVALS = [0, 1, 3, 7, 21];
    let queue = shuffle(dueCards());
    const area = el("div");
    const draw = () => {
      if (!queue.length) {
        area.replaceChildren(el("div", { class: "card", style: "text-align:center" }, el("h3", {}, "All caught up"), el("p", { class: "muted" }, "No cards are due. Cards come back after 1, 3, 7 and 21 days as you get them right."), el("a", { class: "btn primary", href: "#/drills" }, "Try a drill")));
        markActive(); return;
      }
      const c = queue[0];
      const ans = el("div", { class: "ans", hidden: "" }, c.back);
      const row = el("div", { class: "controls", style: "justify-content:center" });
      const show = el("button", { class: "btn primary", onclick: () => {
        ans.hidden = false; row.replaceChildren(
          el("button", { class: "btn danger", onclick: () => grade(false) }, "Again"),
          el("button", { class: "btn good", onclick: () => grade(true) }, "Got it"));
      } }, "Show answer");
      row.append(show);
      const grade = (ok) => {
        const st = Store.get("cards", {});
        const cur = st[c.id] || { box: 0 };
        if (ok) { cur.box = Math.min(cur.box + 1, INTERVALS.length - 1); cur.due = Date.now() + INTERVALS[cur.box] * 86400000; queue.shift(); }
        else { cur.box = 0; cur.due = Date.now(); queue.push(queue.shift()); }
        st[c.id] = cur; Store.set("cards", st);
        draw(); markActive();
      };
      area.replaceChildren(
        el("p", { class: "small muted" }, queue.length + " card" + (queue.length === 1 ? "" : "s") + " left in this session. From: " + c.lesson.title),
        el("div", { class: "card flash" }, el("div", {}, c.front), ans), row);
    };
    draw();
    mount(el("div", { class: "wrap" }, el("h1", {}, "Flashcards"),
      el("p", { class: "lead" }, "Every quiz question becomes a flashcard. Say the answer out loud first, then reveal it. Cards you miss return in this session; cards you know come back after 1, 3, 7, then 21 days."), area));
  }

  /* ---------- tools ---------- */
  function human(n, units, base) {
    let i = 0;
    while (n >= base && i < units.length - 1) { n /= base; i++; }
    return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + " " + units[i];
  }
  const bytes = (n) => human(n, ["B", "KB", "MB", "GB", "TB", "PB", "EB"], 1000);
  const rate = (n) => (n >= 1000 ? Math.round(n).toLocaleString() : n.toFixed(n >= 10 ? 0 : 1));

  function viewTools() {
    const fields = [
      ["dau", "Daily active users", 10000000], ["writes", "Writes per user per day", 2], ["reads", "Reads per user per day", 40],
      ["size", "Average object size (KB)", 2], ["years", "Retention (years)", 5], ["peak", "Peak factor (x average)", 3], ["repl", "Replication factor", 3],
    ];
    const inputs = {};
    const out = el("div", { class: "stats" });
    const calc = () => {
      const v = {}; for (const [k] of fields) v[k] = Math.max(0, parseFloat(inputs[k].value) || 0);
      const wq = (v.dau * v.writes) / 86400, rq = (v.dau * v.reads) / 86400;
      const perDay = v.dau * v.writes * v.size * 1000;
      const total = perDay * 365 * v.years * v.repl;
      const items = [
        ["Write QPS (avg)", rate(wq)], ["Write QPS (peak)", rate(wq * v.peak)], ["Read QPS (avg)", rate(rq)], ["Read QPS (peak)", rate(rq * v.peak)],
        ["New data / day", bytes(perDay)], ["Total stored (with replicas)", bytes(total)],
        ["Ingress (peak)", bytes(wq * v.peak * v.size * 1000) + "/s"], ["Egress (peak)", bytes(rq * v.peak * v.size * 1000) + "/s"],
      ];
      out.replaceChildren(...items.map(([l, val]) => { const s = el("div", { class: "stat", style: "min-width:150px" }, el("b", {}, val), el("span", {}, l)); return s; }));
    };
    const grid = el("div", { class: "est-grid" }, fields.map(([k, l, d]) => {
      inputs[k] = el("input", { type: "number", min: 0, step: "any", value: d, oninput: calc });
      return el("label", {}, l, inputs[k]);
    }));
    calc();
    const lat = [
      ["L1 cache reference", "0.5 ns"], ["Branch mispredict", "5 ns"], ["L2 cache reference", "7 ns"], ["Mutex lock/unlock", "25 ns"], ["Main memory reference", "100 ns"],
      ["Compress 1 KB", "~3 us"], ["Send 1 KB over 1 Gbps network", "~10 us"], ["Read 4 KB random from SSD", "~150 us"], ["Read 1 MB sequentially from memory", "~250 us"],
      ["Round trip in same data centre", "~500 us"], ["Read 1 MB sequentially from SSD", "~1 ms"], ["Disk seek", "~10 ms"], ["Read 1 MB sequentially from disk", "~20 ms"], ["Packet CA to Netherlands and back", "~150 ms"],
    ];
    const pow = [["2^10", "1 thousand", "1 KB"], ["2^20", "1 million", "1 MB"], ["2^30", "1 billion", "1 GB"], ["2^40", "1 trillion", "1 TB"]];
    mount(el("div", { class: "wrap wide" },
      el("h1", {}, "Tools and cheat sheet"),
      el("h2", { style: "margin-top:20px" }, "Capacity estimator"),
      el("p", { class: "muted" }, "Change the inputs to see how traffic and storage scale. Defaults model a photo-sharing style app. Results are rough by design."),
      el("div", { class: "card" }, grid, el("div", { style: "margin-top:14px" }, out)),
      el("h2", {}, "Which tool for which problem?"),
      table({ head: ["Situation", "Reach for"], rows: window.DECISIONS }),
      el("h2", {}, "Latency numbers (order of magnitude)"),
      table({ head: ["Operation", "Time"], rows: lat }),
      el("h2", {}, "Powers of two"),
      table({ head: ["Power", "Approx. value", "Bytes"], rows: pow }),
      el("h2", {}, "Interview time plan (45 minutes)"),
      el("ol", { class: "steps" },
        el("li", { html: "<b>0 to 5:</b> clarify requirements and scope." }),
        el("li", { html: "<b>5 to 10:</b> estimate and define API and data model." }),
        el("li", { html: "<b>10 to 25:</b> draw the high-level design and walk the main flow." }),
        el("li", { html: "<b>25 to 40:</b> deep dive on the bottleneck or the part they pick. Discuss trade-offs and failures." }),
        el("li", { html: "<b>40 to 45:</b> summarise, mention monitoring, and what you would improve next." }))));
  }

  /* ---------- resources ---------- */
  function viewResources() {
    const yt = window.YT;
    const topicQ = [
      ["System design full course", "system design full course for beginners"],
      ["Low level design full course", "low level design course object oriented design interview"],
      ["Design patterns playlist", "design patterns tutorial playlist"],
      ["Distributed systems lectures", "distributed systems lecture series MIT 6.824"],
      ["Database internals", "database internals explained"],
      ["Real post-mortems", "engineering post-mortem outage explained"],
    ];
    mount(el("div", { class: "wrap wide" },
      el("h1", {}, "Resources and videos"),
      el("p", { class: "lead" }, "Curated from repeated recommendations in public discussions and roundups. Videos open YouTube search so you always get current results; channels are searched by name."),
      el("h2", {}, "The LLD playlist to follow"),
      el("p", { class: "muted" }, "Pick one main course and stick with it. Playlist-hopping is a common trap."),
      lldPicks(true),
      el("h2", {}, "YouTube channels"),
      el("div", { class: "grid c3" }, window.CHANNELS.map(([n, d]) => el("a", { class: "vid", href: yt(n), target: "_blank", rel: "noopener noreferrer" }, el("span", { class: "play" }, "▶"), el("span", {}, el("b", {}, n), el("small", {}, d))))),
      el("h2", {}, "Quick video searches"),
      el("div", { class: "grid c3" }, topicQ.map(([t, q]) => el("a", { class: "vid", href: yt(q), target: "_blank", rel: "noopener noreferrer" }, el("span", { class: "play" }, "▶"), el("span", {}, el("b", {}, t), el("small", {}, q))))),
      el("h2", {}, "Books"),
      table({ head: ["Book", "Author", "Track", "Why read it"], rows: window.BOOKS }),
      window.RESOURCES.map((g) => el("div", {}, el("h2", {}, g.group), el("div", { class: "card" }, g.items.map(([n, u, d]) => el("div", { class: "res" }, el("a", { href: u, target: "_blank", rel: "noopener noreferrer" }, n), el("span", { class: "pill" }, new URL(u).hostname.replace("www.", "")), el("div", { class: "muted small" }, d)))))),
      el("h2", {}, "Where this list came from"),
      el("p", { class: "muted small" }, "Assembled from web searches of roundups and discussions that cite Hacker News, Reddit (r/ExperiencedDevs, r/leetcode) and Blind. The searches surfaced mirrors and summaries rather than the original threads, so recommendations here are the ones that recurred across sources. Always check that a link and a resource are still current before investing time or money."),
    ));
  }

  /* ---------- search ---------- */
  let searchIndex = null;
  function getIndex() {
    if (searchIndex) return searchIndex;
    searchIndex = [];
    LESSONS.forEach((l) => {
      const parts = [l.title, l.summary, l.key];
      l.sections.forEach((s) => {
        parts.push(s.h || "", ...(s.p || []), ...(s.ul || []), ...(s.steps || []), s.note ? s.note.text : "");
        if (s.table) s.table.rows.forEach((r) => parts.push(r.join(" ")));
      });
      l.quiz.forEach((q) => parts.push(q.q, q.why));
      const kind = l.track === "found" ? "Foundations" : l.track.toUpperCase() + " lesson";
      searchIndex.push({ href: "#/lesson/" + l.id, title: l.title, kind, raw: parts.join(" ").replace(/[`*]/g, "") });
    });
    window.DRILLS.forEach((d) => searchIndex.push({ href: "#/drills/" + d.id, title: d.title, kind: "Drill", raw: [d.title, d.prompt, ...d.cover, ...d.ask].join(" ") }));
    window.RESOURCES.forEach((g) => g.items.forEach((i) => searchIndex.push({ href: "#/resources", title: i[0], kind: "Resource", raw: i[0] + " " + i[2] })));
    window.BOOKS.forEach((b) => searchIndex.push({ href: "#/resources", title: b[0], kind: "Book", raw: b.join(" ") }));
    window.LLD_PICKS.forEach((p) => searchIndex.push({ href: "#/resources", title: p.title + " (" + p.channel + ")", kind: "LLD playlist", raw: [p.title, p.channel, p.role, p.why].join(" ") }));
    window.LLD_RUNNERS.forEach((r) => searchIndex.push({ href: "#/resources", title: r[0] + ": " + r[1], kind: "LLD playlist", raw: r.slice(0, 3).join(" ") }));
    window.CHANNELS.forEach((c) => searchIndex.push({ href: "#/resources", title: c[0], kind: "Channel", raw: c.join(" ") }));
    searchIndex.forEach((e) => (e.low = e.raw.toLowerCase()));
    return searchIndex;
  }
  function runSearch(q) {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    const out = [];
    getIndex().forEach((e) => {
      if (!toks.every((t) => e.low.includes(t))) return;
      const tl = e.title.toLowerCase();
      let score = 0;
      toks.forEach((t) => { if (tl.includes(t)) score += 10; score += Math.min(5, e.low.split(t).length - 1); });
      const pos = Math.max(0, e.low.indexOf(toks[0]));
      out.push({ e, score, snip: e.raw.slice(Math.max(0, pos - 50), pos + 90) });
    });
    return out.sort((a, b) => b.score - a.score).slice(0, 12);
  }
  function openSearch() {
    if (document.getElementById("sr")) return;
    const input = el("input", { class: "sr-input", type: "text", placeholder: "Search lessons, drills, books, resources...", "aria-label": "Search" });
    const list = el("div", { class: "sr-list" });
    let items = [], sel = 0;
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey, true); };
    const draw = () => {
      list.replaceChildren(...(items.length
        ? items.map((r, i) => el("a", { class: "sr-item" + (i === sel ? " sel" : ""), href: r.e.href, onclick: close }, el("b", {}, r.e.title), el("span", { class: "pill" }, r.e.kind), el("small", {}, "\u2026" + r.snip + "\u2026")))
        : [el("p", { class: "small muted", style: "padding:10px 14px;margin:0" }, input.value.trim() ? "No matches." : "Type to search. Arrow keys and Enter to open, Esc to close.")]));
      const cur = list.querySelector(".sel");
      if (cur) cur.scrollIntoView({ block: "nearest" });
    };
    function onKey(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === "Enter" && items[sel]) { location.hash = items[sel].e.href; close(); }
    }
    input.addEventListener("input", () => { items = runSearch(input.value); sel = 0; draw(); });
    const back = el("div", { id: "sr", class: "sr-back", onclick: (e) => { if (e.target === back) close(); } }, el("div", { class: "sr" }, input, list));
    document.body.append(back);
    document.addEventListener("keydown", onKey, true);
    draw();
    input.focus();
  }

  /* ---------- notes ---------- */
  function viewNotes() {
    const notes = Store.get("notes", {});
    const ids = LESSONS.filter((l) => notes[l.id]);
    const exp = el("button", { class: "btn", onclick: () => {
      const md = "# My Design Dojo notes\n\n" + ids.map((l) => "## " + l.title + "\n\n" + notes[l.id] + "\n").join("\n");
      const a = el("a", { href: URL.createObjectURL(new Blob([md], { type: "text/markdown" })), download: "design-dojo-notes.md" });
      document.body.append(a); a.click(); a.remove();
    } }, "Download as Markdown");
    mount(el("div", { class: "wrap" }, el("h1", {}, "My notes"),
      el("p", { class: "lead" }, "Notes you write at the bottom of each lesson collect here. Writing things in your own words is one of the most reliable ways to remember them."),
      ids.length ? el("div", {}, exp, ids.map((l) => el("div", { class: "card" }, el("h3", {}, el("a", { href: "#/lesson/" + l.id }, l.title)), el("p", { style: "white-space:pre-wrap;margin:0" }, notes[l.id])))) : el("p", { class: "muted" }, "No notes yet. Open any lesson and write a few lines under \"My notes\".")));
  }

  /* ---------- router ---------- */
  function route() {
    runCleanups();
    const h = location.hash || "#/home";
    const parts = h.replace(/^#\//, "").split("/");
    document.title = "Design Dojo";
    document.body.classList.remove("nav-open");
    switch (parts[0]) {
      case "home": viewHome(); break;
      case "path": viewPath(); break;
      case "lesson": viewLesson(parts[1]); break;
      case "drills": viewDrills(parts[1]); break;
      case "cards": viewCards(); break;
      case "tools": viewTools(); break;
      case "resources": viewResources(); break;
      case "notes": viewNotes(); break;
      case "marks": mount(window.Marks.view()); break;
      case "hld": viewTrack("hld"); break;
      case "lld": viewTrack("lld"); break;
      default: view404();
    }
    markActive();
    window.scrollTo(0, 0);
  }

  // theme and boot
  const savedTheme = Store.get("theme", null);
  document.documentElement.setAttribute("data-theme", savedTheme === "light" ? "light" : "dark");
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ""));
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
  });
  document.getElementById("scrim").addEventListener("click", () => document.body.classList.remove("nav-open"));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.body.classList.remove("nav-open"); });
  window.addEventListener("hashchange", route);
  window.addEventListener("marks:changed", () => { document.querySelectorAll(".mk-pill").forEach((p) => (p.textContent = String(window.Marks.count()))); });
  // back-to-top button with a scroll-progress ring
  const toTop = el("button", { id: "to-top", type: "button", "aria-label": "Back to top", onclick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    el("span", { html: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="bg" cx="24" cy="24" r="21"/><circle class="pg" cx="24" cy="24" r="21" pathLength="100"/></svg>' }), el("b", { "aria-hidden": "true" }, "\u2191"));
  document.body.append(toTop);
  const pg = toTop.querySelector(".pg");
  let topTick = false;
  window.addEventListener("scroll", () => {
    if (topTick) return;
    topTick = true;
    requestAnimationFrame(() => {
      topTick = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      toTop.classList.toggle("on", window.scrollY > 400);
      pg.style.strokeDashoffset = String(100 - (max > 0 ? Math.min(1, window.scrollY / max) : 0) * 100);
    });
  }, { passive: true });
  buildSide();
  route();
})();

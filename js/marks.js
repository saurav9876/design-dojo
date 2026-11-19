(function () {
  // Highlights and comments. Select text anywhere in a page, pick a colour or add a comment.
  // Everything is saved in localStorage under "dojo:marks", keyed by page (the URL hash).
  // A highlight is stored as the quoted text plus a little surrounding text, so it can be
  // found again after the page is re-rendered. No page content is modified on disk.
  const { el, Store } = window.U;
  const main = document.getElementById("main");

  const COLORS = [
    ["yellow", "Key point"],
    ["green", "Got it"],
    ["blue", "Look up later"],
    ["pink", "Confusing"],
    ["purple", "Idea to use"],
  ];
  const LABEL = Object.fromEntries(COLORS);
  // Text inside these is never highlighted (controls, simulators, shuffled quizzes, text still being typed).
  const SKIP = "script,style,textarea,input,select,button,svg,a,.sim,.quiz,.typing,.mk-ui,.nomark,#sr";
  const CTX = 30;

  const pageKey = () => location.hash || "#/home";
  const loadAll = () => Store.get("marks", {});
  const saveAll = (all) => { Store.set("marks", all); window.dispatchEvent(new Event("marks:changed")); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pageTitle = () => { const h = main.querySelector("h1"); return (h && h.textContent.trim()) || document.title || "Page"; };
  const onMarksPage = () => pageKey().split("/")[1] === "marks";

  function find(id) {
    const all = loadAll();
    for (const k of Object.keys(all)) {
      const i = all[k].findIndex((h) => h.id === id);
      if (i >= 0) return { all, key: k, list: all[k], i, h: all[k][i] };
    }
    return null;
  }
  const DEAD = /^#\/examples/;   // pages that no longer exist; their highlights stay stored but are not listed
  function count() { const all = loadAll(); return Object.keys(all).filter((k) => !DEAD.test(k)).reduce((n, k) => n + all[k].length, 0); }

  /* ---------- text model ---------- */
  function textNodes() {
    const out = [];
    const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }
  const fullText = (nodes) => nodes.map((n) => n.nodeValue).join("");

  function anchorFromRange(range) {
    if (!main.contains(range.commonAncestorContainer) || onMarksPage()) return null;
    const nodes = textNodes();
    const full = fullText(nodes);
    let pos = 0, s = -1, e = -1;
    for (const n of nodes) {
      const len = n.nodeValue.length;
      if (range.intersectsNode(n)) {
        const a = n === range.startContainer ? range.startOffset : 0;
        const b = n === range.endContainer ? range.endOffset : len;
        if (b > a) { if (s < 0) s = pos + a; e = pos + b; }
      }
      pos += len;
    }
    if (s < 0 || e <= s) return null;
    while (s < e && /\s/.test(full[s])) s++;
    while (e > s && /\s/.test(full[e - 1])) e--;
    if (e - s < 1) return null;
    if (e - s > 3000) e = s + 3000;
    return {
      q: full.slice(s, e),
      pre: full.slice(Math.max(0, s - CTX), s),
      suf: full.slice(e, e + CTX),
      o: s,
      d: range.toString().replace(/\s+/g, " ").trim().slice(0, 3000) || full.slice(s, e),
    };
  }

  const commonSuffix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++; return i; };
  const commonPrefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };

  // Where in the current page text does this highlight live? -1 if it cannot be found with confidence.
  function locate(h, full) {
    const q = h.q;
    if (!q) return -1;
    let best = -1, bestScore = -1, bestDist = Infinity;
    for (let i = full.indexOf(q); i >= 0; i = full.indexOf(q, i + 1)) {
      const score = commonSuffix(full.slice(Math.max(0, i - CTX), i), h.pre || "") + commonPrefix(full.slice(i + q.length, i + q.length + CTX), h.suf || "");
      const dist = Math.abs(i - h.o);
      if (score > bestScore || (score === bestScore && dist < bestDist)) { best = i; bestScore = score; bestDist = dist; }
    }
    if (best < 0) return -1;
    const need = Math.min(8, (h.pre || "").length + (h.suf || "").length);
    if (q.length < 40 && bestScore < need) return -1;
    return best;
  }

  /* ---------- drawing marks ---------- */
  const BLOCKY = /^(UL|OL|DL|TABLE|THEAD|TBODY|TFOOT|TR|COLGROUP)$/;
  function wrap(h, s, e) {
    const nodes = textNodes();
    let pos = 0;
    const segs = [];
    for (const n of nodes) {
      const len = n.nodeValue.length;
      const a = Math.max(s, pos), b = Math.min(e, pos + len);
      if (b > a) segs.push([n, a - pos, b - pos]);
      pos += len;
      if (pos >= e) break;
    }
    const made = [];
    segs.forEach(([n, a, b]) => {
      if (BLOCKY.test(n.parentNode.nodeName) && /^\s*$/.test(n.nodeValue.slice(a, b))) return;
      if (b < n.nodeValue.length) n.splitText(b);
      const target = a > 0 ? n.splitText(a) : n;
      const m = document.createElement("mark");
      m.dataset.id = h.id;
      target.parentNode.insertBefore(m, target);
      m.appendChild(target);
      made.push(m);
    });
    made.forEach((m) => style(m, h));
    if (made.length) made[made.length - 1].classList.add("mk-end");
    return made.length;
  }
  function style(m, h) {
    m.className = "mk c-" + h.c + (h.n ? " has-note" : "") + (m.classList.contains("mk-end") ? " mk-end" : "");
    if (h.n) m.title = h.n; else m.removeAttribute("title");
  }
  const segments = (id) => Array.from(main.querySelectorAll('mark.mk[data-id="' + id + '"]'));
  function restyle(h) { segments(h.id).forEach((m) => style(m, h)); }
  function unwrap(id) {
    segments(id).forEach((m) => {
      const p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }

  let observer = null, timer = null, pendingFocus = null, applying = false;
  function observe() { if (observer) observer.observe(main, { childList: true, subtree: true, characterData: true }); }
  function applyAll() {
    if (applying || onMarksPage()) return;
    const list = loadAll()[pageKey()] || [];
    const missing = list.filter((h) => !segments(h.id).length);
    if (missing.length) {
      applying = true;
      if (observer) observer.disconnect();
      try {
        const full = fullText(textNodes());
        missing.forEach((h) => { const i = locate(h, full); if (i >= 0) wrap(h, i, i + h.q.length); });
      } finally { applying = false; observe(); }
    }
    if (pendingFocus) {
      const segs = segments(pendingFocus);
      if (segs.length) {
        const first = segs[0];
        first.scrollIntoView({ block: "center" });
        segs.forEach((m) => m.classList.add("flash"));
        setTimeout(() => segs.forEach((m) => m.classList.remove("flash")), 1800);
        pendingFocus = null;
      }
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(applyAll, 120); }
  observer = new MutationObserver(schedule);
  observe();

  /* ---------- floating colour bar ---------- */
  let pend = null, pendRange = null, pointerDown = false, barDown = false, hideTimer = null;
  const coarse = () => window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  const bar = el("div", { class: "mk-ui mk-bar", role: "toolbar", "aria-label": "Highlight selection", hidden: "hidden" },
    COLORS.map(([c, label]) => el("button", { type: "button", class: "mk-dot c-" + c, title: "Highlight: " + label, "aria-label": "Highlight " + c + " (" + label + ")", onclick: () => addMark(c, false) })),
    el("button", { type: "button", class: "mk-cbtn", title: "Highlight and add a comment", onclick: () => addMark("yellow", true) }, "Comment"));
  bar.addEventListener("mousedown", (e) => e.preventDefault());
  bar.addEventListener("pointerdown", () => { barDown = true; setTimeout(() => (barDown = false), 700); });
  document.body.append(bar);

  function hideBar() { bar.hidden = true; pend = null; pendRange = null; }
  function placeBar() {
    if (!pendRange) return;
    const r = pendRange.getBoundingClientRect();
    if (!r || (!r.width && !r.height) || r.bottom < 0 || r.top > window.innerHeight) { bar.hidden = true; return; }
    bar.hidden = false;
    const w = bar.offsetWidth, h = bar.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = coarse() ? r.bottom + 12 : r.top - h - 8;
    if (top < 8) top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
    bar.style.left = left + "px";
    bar.style.top = top + "px";
  }
  function onSelection() {
    if (pointerDown) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      if (barDown) return;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { if (!barDown) hideBar(); }, 200);
      return;
    }
    clearTimeout(hideTimer);
    const range = sel.getRangeAt(0);
    const a = anchorFromRange(range);
    if (!a) { hideBar(); return; }
    pend = a;
    pendRange = range.cloneRange();
    placeBar();
  }
  let selTimer = null;
  document.addEventListener("selectionchange", () => { clearTimeout(selTimer); selTimer = setTimeout(onSelection, coarse() ? 250 : 80); });
  document.addEventListener("pointerdown", (e) => {
    if (e.target.closest && e.target.closest(".mk-ui")) return;
    pointerDown = true;
    closePop();
  }, true);
  document.addEventListener("pointerup", () => { pointerDown = false; setTimeout(onSelection, 0); }, true);
  document.addEventListener("pointercancel", () => { pointerDown = false; }, true);
  window.addEventListener("scroll", () => { if (pendRange && !bar.hidden) requestAnimationFrame(placeBar); }, { passive: true });
  window.addEventListener("resize", () => { if (pendRange && !bar.hidden) placeBar(); });

  function addMark(color, withNote) {
    if (!pend) return;
    const h = { id: uid(), c: color, n: "", q: pend.q, pre: pend.pre, suf: pend.suf, o: pend.o, d: pend.d, t: pageTitle(), ts: Date.now() };
    const all = loadAll();
    const key = pageKey();
    (all[key] = all[key] || []).push(h);
    saveAll(all);
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    hideBar();
    applyAll();
    if (withNote) {
      const segs = segments(h.id);
      if (segs.length) openPop(h.id, segs[0]);
    }
  }

  /* ---------- popover: colour, comment, delete ---------- */
  let pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(id, anchorEl) {
    closePop();
    const f = find(id);
    if (!f) return;
    const h = f.h;
    const swatches = el("div", { class: "mk-row" }, COLORS.map(([c, label]) => el("button", {
      type: "button", class: "mk-dot c-" + c + (h.c === c ? " on" : ""), title: label, "aria-label": label,
      onclick: () => {
        const cur = find(id); if (!cur) return;
        cur.h.c = c; saveAll(cur.all); restyle(cur.h);
        swatches.querySelectorAll(".mk-dot").forEach((b) => b.classList.toggle("on", b.classList.contains("c-" + c)));
        legend.textContent = LABEL[c];
      },
    })));
    const legend = el("span", { class: "mk-legend" }, LABEL[h.c]);
    const ta = el("textarea", { class: "mk-note", rows: "3", placeholder: "Add a comment...", "aria-label": "Comment" });
    ta.value = h.n || "";
    ta.addEventListener("input", () => {
      const cur = find(id); if (!cur) return;
      cur.h.n = ta.value.trim() ? ta.value : "";
      saveAll(cur.all); restyle(cur.h);
    });
    const del = el("button", { type: "button", class: "mk-btn danger", onclick: () => {
      const cur = find(id); if (!cur) return;
      cur.list.splice(cur.i, 1);
      if (!cur.list.length) delete cur.all[cur.key];
      saveAll(cur.all); unwrap(id); closePop();
    } }, "Remove");
    const quote = h.d.length > 110 ? h.d.slice(0, 110) + "…" : h.d;
    pop = el("div", { class: "mk-ui mk-pop", role: "dialog", "aria-label": "Highlight" },
      el("div", { class: "mk-row mk-top" }, swatches, legend),
      el("p", { class: "mk-quote" }, "“" + quote + "”"),
      ta,
      el("div", { class: "mk-row mk-end-row" }, del, el("button", { type: "button", class: "mk-btn", onclick: closePop }, "Done")));
    document.body.append(pop);
    const r = anchorEl.getBoundingClientRect();
    const w = pop.offsetWidth, ph = pop.offsetHeight;
    let left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    ta.focus();
  }

  main.addEventListener("click", (e) => {
    const m = e.target.closest && e.target.closest("mark.mk");
    if (!m) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    openPop(m.dataset.id, m);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closePop(); hideBar(); }
  });
  window.addEventListener("hashchange", () => { closePop(); hideBar(); });

  /* ---------- one-time hint ---------- */
  function maybeHint() {
    if (Store.get("mkhint", false)) return;
    if (!/^#\/(lesson|examples\/|drills\/)/.test(pageKey())) return;
    Store.set("mkhint", true);
    const hint = el("div", { class: "mk-ui mk-hint", role: "status" }, "Tip: select any text to highlight it in a colour or add a comment. Saved in this browser.",
      el("button", { type: "button", class: "mk-btn", onclick: () => hint.remove() }, "Got it"));
    document.body.append(hint);
    setTimeout(() => hint.remove(), 12000);
  }
  window.addEventListener("hashchange", () => setTimeout(maybeHint, 600));
  setTimeout(maybeHint, 900);

  /* ---------- the Highlights page ---------- */
  function view() {
    pendingFocus = null;
    let color = "all", onlyNotes = false;
    const listBox = el("div", {});
    const filters = el("div", { class: "mk-filters" });

    function entries() {
      const all = loadAll();
      const out = [];
      Object.keys(all).filter((k) => !DEAD.test(k)).forEach((k) => all[k].forEach((h) => {
        if (color !== "all" && h.c !== color) return;
        if (onlyNotes && !h.n) return;
        out.push({ k, h });
      }));
      return out;
    }
    function drawFilters() {
      const chip = (id, label, extra) => el("button", { type: "button", class: "btn sm" + (color === id ? " on" : ""), onclick: () => { color = id; draw(); } }, extra, label);
      filters.replaceChildren(
        chip("all", "All"),
        ...COLORS.map(([c, label]) => chip(c, label, el("span", { class: "mk-swatch c-" + c }))),
        el("label", { class: "small mk-only" }, el("input", { type: "checkbox", checked: onlyNotes ? "checked" : null, onchange: (e) => { onlyNotes = e.target.checked; draw(); } }), " With comments only"));
    }
    function draw() {
      drawFilters();
      const items = entries();
      if (!items.length) {
        listBox.replaceChildren(el("p", { class: "muted" }, count() ? "Nothing matches this filter." : "No highlights yet. Open any lesson, select a sentence, and pick a colour or press Comment."));
        return;
      }
      const groups = {};
      items.forEach(({ k, h }) => (groups[k] = groups[k] || { title: h.t, list: [] }).list.push(h));
      listBox.replaceChildren(...Object.keys(groups).map((k) => el("section", { class: "mk-group" },
        el("h3", {}, el("a", { href: k }, groups[k].title || k)),
        groups[k].list.sort((a, b) => a.o - b.o).map((h) => {
          const ta = el("textarea", { class: "mk-note", rows: "2", placeholder: "Add a comment...", "aria-label": "Comment" });
          ta.value = h.n || "";
          ta.addEventListener("input", () => { const cur = find(h.id); if (!cur) return; cur.h.n = ta.value.trim() ? ta.value : ""; saveAll(cur.all); });
          return el("div", { class: "mk-item c-" + h.c },
            el("p", { class: "mk-q" }, h.d),
            ta,
            el("div", { class: "mk-meta small muted" }, LABEL[h.c] + " | " + new Date(h.ts).toLocaleDateString(),
              el("span", {}, el("button", { type: "button", class: "btn sm", onclick: () => { pendingFocus = h.id; location.hash = k; } }, "Open on page"), " ",
                el("button", { type: "button", class: "btn sm danger", onclick: () => {
                  const cur = find(h.id); if (!cur) return;
                  cur.list.splice(cur.i, 1); if (!cur.list.length) delete cur.all[cur.key];
                  saveAll(cur.all); draw();
                } }, "Delete"))));
        }))));
    }
    const exp = el("button", { type: "button", class: "btn", onclick: () => {
      const all = loadAll();
      const keys = Object.keys(all).filter((k) => !DEAD.test(k));
      const md = "# My Design Dojo highlights\n\n" + keys.map((k) => "## " + (all[k][0].t || k) + "\n\n" + all[k].map((h) => "- [" + LABEL[h.c] + "] > " + h.d + (h.n ? "\n  - Comment: " + h.n.replace(/\n/g, "\n    ") : "")).join("\n") + "\n").join("\n");
      const a = el("a", { href: URL.createObjectURL(new Blob([md], { type: "text/markdown" })), download: "design-dojo-highlights.md" });
      document.body.append(a); a.click(); a.remove();
    } }, "Download as Markdown");
    draw();
    return el("div", { class: "wrap wide nomark" },
      el("h1", {}, "Highlights and comments"),
      el("p", { class: "lead" }, "Select any text in a lesson, example or drill to highlight it in a colour or add a comment. Click a highlight to change its colour, edit the comment, or remove it. Everything is saved in this browser only."),
      el("p", { class: "small muted" }, "Colour meanings are only suggestions shown as tooltips: yellow key point, green got it, blue look up later, pink confusing, purple idea to use."),
      count() ? exp : null, filters, listBox);
  }

  window.Marks = { view, count, COLORS };
})();

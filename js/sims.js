(function () {
  const { el, hash32, mulberry32, typeText } = window.U;
  const Sims = {};

  function shell(root, title, tag) {
    const body = el("div");
    root.append(el("div", { class: "sim-h" }, el("b", {}, title), el("span", { class: "tag" }, tag || "Interactive")), body);
    return body;
  }
  function stat(label) {
    const b = el("b", {}, "0");
    return { node: el("div", { class: "stat" }, b, el("span", {}, label)), set: (v) => (b.textContent = v) };
  }

  /* 1. request flow ---------------------------------------------------- */
  Sims.flow = function (root) {
    const body = shell(root, "Follow one request", "Animated");
    const nodes = [
      ["client", "Client"], ["dns", "DNS"], ["cdn", "CDN"], ["lb", "Load balancer"],
      ["app", "App servers"], ["cache", "Cache"], ["db", "Database"],
    ];
    const steps = [
      ["client", "The client sends GET /profile/42. The browser first checks its own cache."],
      ["dns", "DNS resolves the hostname to an IP address. Results are cached at many layers, so this is usually instant."],
      ["cdn", "The CDN edge serves static assets itself. This dynamic request is passed through to the origin."],
      ["lb", "The load balancer picks a healthy app server, for example the one with the fewest active connections."],
      ["app", "A stateless app server handles the request. Because it keeps no local state, any server could have done this."],
      ["cache", "Cache lookup for user:42. MISS on the first call, so we must go to the database."],
      ["db", "A read replica returns the row. The database is the slowest and most precious stop, so we try to avoid it."],
      ["cache", "The app stores the result in the cache with a TTL and responds. The next request for user:42 is a HIT and never reaches the database."],
    ];
    const nodeEls = {};
    const flow = el("div", { class: "flow" });
    nodes.forEach(([id, label], i) => {
      nodeEls[id] = el("div", { class: "node" }, label);
      flow.append(nodeEls[id]);
      if (i < nodes.length - 1) flow.append(el("span", { class: "arrow" }, "→"));
    });
    const cap = el("div", { class: "caption" }, "Press Play or Next step.");
    let idx = -1, timer = null, cancel = null;
    const show = () => {
      Object.values(nodeEls).forEach((n) => n.classList.remove("act"));
      for (let i = 0; i <= idx; i++) nodeEls[steps[i][0]].classList.add("vis");
      if (idx >= 0) nodeEls[steps[idx][0]].classList.add("act");
      if (cancel) cancel();
      cancel = idx >= 0 ? typeText(cap, "Step " + (idx + 1) + " of " + steps.length + ": " + steps[idx][1], 12) : null;
    };
    const next = () => {
      if (idx < steps.length - 1) { idx++; show(); return true; }
      return false;
    };
    const stop = () => { clearInterval(timer); timer = null; play.textContent = "Play"; };
    const reset = () => {
      stop(); idx = -1;
      Object.values(nodeEls).forEach((n) => n.classList.remove("act", "vis"));
      if (cancel) cancel();
      cap.textContent = "Press Play or Next step.";
    };
    const play = el("button", { class: "btn primary", onclick: () => {
      if (timer) return stop();
      if (idx >= steps.length - 1) reset();
      play.textContent = "Pause";
      next();
      timer = setInterval(() => { if (!next()) stop(); }, 3200);
    } }, "Play");
    body.append(flow, cap, el("div", { class: "controls" }, play, el("button", { class: "btn", onclick: () => { stop(); next(); } }, "Next step"), el("button", { class: "btn", onclick: reset }, "Reset")));
    return () => { clearInterval(timer); if (cancel) cancel(); };
  };

  /* 2. load balancer --------------------------------------------------- */
  Sims.loadbalancer = function (root) {
    const body = shell(root, "Load balancer lab", "Simulation");
    const servers = [
      { name: "Server 1", speed: 1, q: 0, rem: 0, done: 0, alive: true },
      { name: "Server 2", speed: 1, q: 0, rem: 0, done: 0, alive: true },
      { name: "Server 3 (slow)", speed: 2.5, q: 0, rem: 0, done: 0, alive: true },
      { name: "Server 4", speed: 1, q: 0, rem: 0, done: 0, alive: true },
    ];
    let algo = "rr", rr = 0, running = false, lost = 0, dropped = 0, sent = 0, acc = 0;
    const rnd = mulberry32(7);
    const grid = el("div", { class: "servers" });
    const sSent = stat("sent"), sDone = stat("completed"), sLost = stat("lost / dropped");
    const sel = el("select", { onchange: (e) => { algo = e.target.value; } },
      el("option", { value: "rr" }, "Round robin"),
      el("option", { value: "lc" }, "Least connections"),
      el("option", { value: "rand" }, "Random"),
      el("option", { value: "hash" }, "Client hash (sticky)"));
    const startBtn = el("button", { class: "btn primary", onclick: () => { running = !running; startBtn.textContent = running ? "Pause traffic" : "Start traffic"; } }, "Start traffic");
    const svc = () => 500 + rnd() * 400;
    function route() {
      const alive = servers.filter((s) => s.alive);
      if (!alive.length) { dropped++; return; }
      let s;
      if (algo === "rr") { do { rr = (rr + 1) % servers.length; } while (!servers[rr].alive); s = servers[rr]; }
      else if (algo === "lc") s = alive.reduce((a, b) => (b.q < a.q ? b : a));
      else if (algo === "rand") s = alive[Math.floor(rnd() * alive.length)];
      else { const client = Math.floor(rnd() * 6); s = alive[hash32("client-" + client) % alive.length]; }
      if (s.q === 0) s.rem = svc() * s.speed;
      s.q++; sent++;
    }
    const DT = 100;
    function tick() {
      if (running) {
        acc += DT;
        while (acc >= 250) { acc -= 250; route(); }
      }
      servers.forEach((s) => {
        if (!s.alive || s.q === 0) return;
        s.rem -= DT;
        if (s.rem <= 0) { s.q--; s.done++; if (s.q > 0) s.rem = svc() * s.speed; }
      });
      draw();
    }
    function draw() {
      grid.replaceChildren(...servers.map((s, i) => {
        const q = el("div", { class: "q" });
        for (let k = 0; k < Math.min(s.q, 40); k++) q.append(el("i"));
        return el("div", { class: "srv" + (s.alive ? "" : " dead") + (s.q > 12 ? " hot" : "") },
          el("h4", {}, el("span", {}, s.name), el("span", { class: "muted" }, s.alive ? s.q + " queued" : "DOWN")),
          q,
          el("div", { class: "small muted", style: "margin-top:6px" }, "handled " + s.done),
          el("button", { class: "btn sm" + (s.alive ? " danger" : ""), style: "margin-top:6px", onclick: () => {
            if (s.alive) { lost += s.q; s.q = 0; }
            s.alive = !s.alive;
          } }, s.alive ? "Kill" : "Revive"));
      }));
      sSent.set(sent); sDone.set(servers.reduce((a, s) => a + s.done, 0)); sLost.set(lost + dropped);
    }
    const burst = el("button", { class: "btn", onclick: () => { for (let i = 0; i < 20; i++) route(); } }, "Burst of 20");
    const reset = el("button", { class: "btn", onclick: () => {
      servers.forEach((s) => { s.q = 0; s.rem = 0; s.done = 0; s.alive = true; });
      lost = dropped = sent = 0; rr = 0;
    } }, "Reset");
    body.append(el("div", { class: "controls" }, el("label", {}, "Algorithm", sel), startBtn, burst, reset),
      grid, el("div", { class: "stats" }, sSent.node, sDone.node, sLost.node),
      el("p", { class: "small muted" }, "Killing a server loses its queued requests (a real balancer would also retry them elsewhere). Dead servers get no new traffic, which models health checks."));
    draw();
    const t = setInterval(tick, DT);
    return () => clearInterval(t);
  };

  /* 3. LRU cache ------------------------------------------------------- */
  Sims.lru = function (root) {
    const body = shell(root, "LRU cache visualiser", "Simulation");
    let cap = 4, order = [], hits = 0, misses = 0;
    const row = el("div", { class: "chips" });
    const sHit = stat("hits"), sMiss = stat("misses"), sRatio = stat("hit ratio");
    const log = el("div", { class: "log" });
    const addLog = (t, cls) => { log.prepend(el("div", { class: cls || "" }, t)); while (log.children.length > 30) log.lastChild.remove(); };
    const draw = (evicted) => {
      row.replaceChildren();
      if (!order.length) row.append(el("span", { class: "muted" }, "(empty)"));
      order.forEach((k, i) => row.append(el("span", { class: "chip" + (i === 0 ? " mru" : "") }, k)));
      if (evicted) row.append(el("span", { class: "chip evict" }, evicted + " evicted"));
      sHit.set(hits); sMiss.set(misses);
      sRatio.set(hits + misses ? Math.round((100 * hits) / (hits + misses)) + "%" : "-");
    };
    function access(k) {
      const i = order.indexOf(k);
      let ev = null;
      if (i >= 0) { hits++; order.splice(i, 1); addLog("GET " + k + " -> HIT, moved to front", "ok"); }
      else {
        misses++;
        if (order.length >= cap) { ev = order.pop(); addLog("GET " + k + " -> MISS, cache full, evicted " + ev, "no"); }
        else addLog("GET " + k + " -> MISS, inserted", "no");
      }
      order.unshift(k); draw(ev);
    }
    const capSel = el("select", { onchange: (e) => { cap = +e.target.value; order = order.slice(0, cap); draw(); } },
      ...[2, 3, 4, 5, 6].map((n) => el("option", { value: n, selected: n === cap ? "selected" : null }, String(n))));
    const keys = el("div", { class: "controls" }, el("label", {}, "Capacity", capSel), ..."ABCDEFGH".split("").map((k) => el("button", { class: "btn sm", onclick: () => access(k) }, "GET " + k)));
    const results = el("div", {});
    const run = el("button", { class: "btn primary", onclick: () => {
      const r = mulberry32(42), seq = [];
      for (let i = 0; i < 2000; i++) seq.push(Math.floor(40 * Math.pow(r(), 3)));
      const rows = [2, 4, 8, 16, 32].map((c) => {
        const q = []; let h = 0;
        seq.forEach((k) => { const i = q.indexOf(k); if (i >= 0) { h++; q.splice(i, 1); } else if (q.length >= c) q.pop(); q.unshift(k); });
        return "<tr><td>" + c + " / 40 keys</td><td>" + Math.round((100 * h) / seq.length) + "%</td></tr>";
      });
      results.innerHTML = '<table class="t"><tr><th>Cache size</th><th>Hit ratio</th></tr>' + rows.join("") + "</table>" +
        '<p class="small muted">Workload: 2,000 requests over 40 keys where a few keys are very popular (skewed, like real traffic). Notice diminishing returns: a cache holding a fraction of the data can serve most reads.</p>';
    } }, "Run skewed workload at different sizes");
    body.append(keys, el("div", { class: "legend" }, "Most recently used on the left (dark), least recently used on the right (evicted next)."), row,
      el("div", { class: "stats" }, sHit.node, sMiss.node, sRatio.node), el("div", { class: "controls" }, run, el("button", { class: "btn", onclick: () => { order = []; hits = misses = 0; log.replaceChildren(); results.replaceChildren(); draw(); } }, "Reset")), results, log);
    draw();
    return () => {};
  };

  /* 4. consistent hashing ring ---------------------------------------- */
  Sims.ring = function (root) {
    const body = shell(root, "Consistent hashing ring", "Simulation");
    const COLORS = ["#4f46e5", "#0ea5a4", "#e11d48", "#d97706", "#7c3aed", "#16a34a", "#0284c7", "#be185d", "#65a30d", "#9333ea"];
    const colorOf = (n) => COLORS[parseInt(n.slice(1), 10) % COLORS.length];
    const KEYS = Array.from({ length: 240 }, (_, i) => "key-" + i);
    const TWO32 = 4294967296;
    let nodes = ["S1", "S2", "S3"], vn = 8, nextId = 4;
    let prevRing = null, prevMod = null;
    const lastMoved = { ring: null, mod: null, msg: "" };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 360 360");
    const info = el("div", { class: "stats" });
    const msg = el("p", { class: "small muted" });

    function ringPoints() {
      const pts = [];
      nodes.forEach((n) => { for (let i = 0; i < vn; i++) pts.push({ pos: hash32(n + "#" + i), node: n }); });
      return pts.sort((a, b) => a.pos - b.pos);
    }
    function ownerRing(pts, key) {
      const h = hash32(key);
      for (const p of pts) if (p.pos >= h) return p.node;
      return pts[0].node;
    }
    function assign() {
      const pts = ringPoints();
      const ring = {}, mod = {};
      const sorted = nodes.slice().sort();
      KEYS.forEach((k) => { ring[k] = ownerRing(pts, k); mod[k] = sorted[hash32(k) % sorted.length]; });
      return { pts, ring, mod };
    }
    function pct(a, b) {
      let m = 0;
      KEYS.forEach((k) => { if (a[k] !== b[k]) m++; });
      return Math.round((100 * m) / KEYS.length);
    }
    function draw(cur) {
      const C = 180, R = 140;
      const ang = (p) => (p / TWO32) * 2 * Math.PI - Math.PI / 2;
      let s = '<circle cx="180" cy="180" r="140" fill="none" stroke="currentColor" opacity=".25" stroke-width="2"/>';
      cur.pts.forEach((p) => {
        const a = ang(p.pos), c = colorOf(p.node);
        s += '<circle cx="' + (C + (R + 10) * Math.cos(a)).toFixed(1) + '" cy="' + (C + (R + 10) * Math.sin(a)).toFixed(1) + '" r="5.5" fill="' + c + '" stroke="#fff" stroke-width="1.2"/>';
      });
      KEYS.forEach((k) => {
        const a = ang(hash32(k)), c = colorOf(cur.ring[k]);
        s += '<circle cx="' + (C + (R - 12) * Math.cos(a)).toFixed(1) + '" cy="' + (C + (R - 12) * Math.sin(a)).toFixed(1) + '" r="2.4" fill="' + c + '"/>';
      });
      s += '<text x="180" y="176" text-anchor="middle" fill="currentColor" font-size="13" font-weight="700">' + nodes.length + " servers</text>";
      s += '<text x="180" y="194" text-anchor="middle" fill="currentColor" opacity=".6" font-size="11">' + KEYS.length + " keys</text>";
      svg.innerHTML = s;
      const counts = nodes.map((n) => KEYS.filter((k) => cur.ring[k] === n).length);
      info.replaceChildren(...nodes.map((n, i) => {
        const st = stat(n + " keys"); st.set(counts[i]); st.node.style.borderLeft = "5px solid " + colorOf(n); return st.node;
      }));
      if (lastMoved.ring !== null) {
        msg.innerHTML = "<b>" + lastMoved.msg + "</b>: consistent hashing moved <b>" + lastMoved.ring + "%</b> of keys. Plain <code>hash mod N</code> would have moved <b>" + lastMoved.mod + "%</b>.";
      } else msg.textContent = "Dots on the outer edge are servers (virtual nodes). Small dots inside are keys, coloured by the server that owns them.";
    }
    function apply(label) {
      const cur = assign();
      if (prevRing) { lastMoved.ring = pct(prevRing, cur.ring); lastMoved.mod = pct(prevMod, cur.mod); lastMoved.msg = label; }
      prevRing = cur.ring; prevMod = cur.mod;
      draw(cur);
    }
    const vnSel = el("select", { onchange: (e) => { vn = +e.target.value; prevRing = null; lastMoved.ring = null; apply(); } },
      ...[1, 3, 8, 20, 50].map((n) => el("option", { value: n, selected: n === vn ? "selected" : null }, String(n))));
    const add = el("button", { class: "btn primary", onclick: () => { if (nodes.length >= 10) return; nodes.push("S" + nextId++); apply("Added a server"); } }, "Add server");
    const rem = el("button", { class: "btn", onclick: () => { if (nodes.length <= 1) return; nodes.splice(Math.floor(nodes.length / 2), 1); apply("Removed a server"); } }, "Remove a server");
    body.append(el("div", { class: "controls" }, add, rem, el("label", {}, "Virtual nodes per server", vnSel)), el("div", { class: "ring-wrap" }, svg, el("div", { style: "flex:1;min-width:220px" }, info, msg)));
    apply();
    return () => {};
  };

  /* 5. quorum ---------------------------------------------------------- */
  Sims.quorum = function (root) {
    const body = shell(root, "Quorum lab", "Simulation");
    let N = 5, W = 3, R = 3, version = 0, stale = 0, reads = 0;
    let reps = Array(N).fill(0), selected = [];
    const grid = el("div", { class: "replicas" });
    const verdict = el("div", { class: "caption" });
    const log = el("div", { class: "log" });
    const addLog = (t, c) => { log.prepend(el("div", { class: c || "" }, t)); while (log.children.length > 25) log.lastChild.remove(); };
    const sReads = stat("reads"), sStale = stat("stale reads");
    const pick = (k) => { const idx = reps.map((_, i) => i); const out = []; while (out.length < k) out.push(idx.splice(Math.floor(Math.random() * idx.length), 1)[0]); return out; };
    function draw() {
      grid.replaceChildren(...reps.map((v, i) => el("div", { class: "rep" + (selected.includes(i) ? " sel" : "") + (v < version ? " stale" : "") }, el("span", {}, "Replica " + (i + 1)), el("b", {}, "v" + v))));
      const ok = R + W > N;
      verdict.innerHTML = "R + W = " + (R + W) + " vs N = " + N + ". " + (ok ? "<b>Overlap guaranteed:</b> every read set shares at least one replica with every acknowledged write set." : "<b>No overlap guarantee:</b> a read can miss the replicas that got the latest write.");
      sReads.set(reads); sStale.set(stale);
    }
    function rebuild() { reps = Array(N).fill(0); version = 0; selected = []; reads = stale = 0; W = Math.min(W, N); R = Math.min(R, N); wSel.replaceChildren(...opts(W)); rSel.replaceChildren(...opts(R)); log.replaceChildren(); draw(); }
    const opts = (cur) => Array.from({ length: N }, (_, i) => el("option", { value: i + 1, selected: i + 1 === cur ? "selected" : null }, String(i + 1)));
    const nSel = el("select", { onchange: (e) => { N = +e.target.value; rebuild(); } }, ...[3, 4, 5, 6, 7].map((n) => el("option", { value: n, selected: n === N ? "selected" : null }, String(n))));
    const wSel = el("select", { onchange: (e) => { W = +e.target.value; draw(); } }, ...opts(W));
    const rSel = el("select", { onchange: (e) => { R = +e.target.value; draw(); } }, ...opts(R));
    const write = el("button", { class: "btn primary", onclick: () => {
      version++; selected = pick(W); selected.forEach((i) => (reps[i] = version));
      addLog("WRITE v" + version + " acknowledged by replicas " + selected.map((i) => i + 1).sort().join(", "), "ok"); draw();
    } }, "Write new version");
    const read = el("button", { class: "btn", onclick: () => {
      if (!version) { addLog("Write something first"); return; }
      selected = pick(R); const got = Math.max(...selected.map((i) => reps[i])); reads++;
      const isStale = got < version; if (isStale) stale++;
      addLog("READ from replicas " + selected.map((i) => i + 1).sort().join(", ") + " -> v" + got + (isStale ? " (STALE, latest is v" + version + ")" : " (fresh)"), isStale ? "no" : "ok"); draw();
    } }, "Read");
    const many = el("button", { class: "btn", onclick: () => {
      for (let t = 0; t < 50; t++) { version++; pick(W).forEach((i) => (reps[i] = version)); reads++; if (Math.max(...pick(R).map((i) => reps[i])) < version) stale++; }
      selected = []; addLog("Ran 50 write+read pairs. Totals updated.", ""); draw();
    } }, "Run 50 write+read pairs");
    body.append(el("div", { class: "controls" }, el("label", {}, "N replicas", nSel), el("label", {}, "W (write acks)", wSel), el("label", {}, "R (read replicas)", rSel)),
      grid, verdict, el("div", { class: "controls" }, write, read, many, el("button", { class: "btn", onclick: rebuild }, "Reset")), el("div", { class: "stats" }, sReads.node, sStale.node), log);
    draw();
    return () => {};
  };

  /* 6. token bucket ---------------------------------------------------- */
  Sims.bucket = function (root) {
    const body = shell(root, "Token bucket rate limiter", "Simulation");
    let cap = 5, rate = 1, tokens = cap, ok = 0, no = 0;
    const tok = el("div", { class: "tokens" });
    const sOk = stat("allowed"), sNo = stat("rejected (429)");
    const log = el("div", { class: "log" });
    const addLog = (t, c) => { log.prepend(el("div", { class: c }, t)); while (log.children.length > 25) log.lastChild.remove(); };
    const info = el("span", { class: "small muted" });
    function draw() {
      tok.replaceChildren(...Array.from({ length: cap }, (_, i) => el("i", { class: "tok" + (i < Math.floor(tokens) ? "" : " empty") })));
      info.textContent = tokens.toFixed(1) + " tokens available";
      sOk.set(ok); sNo.set(no);
    }
    function send() {
      if (tokens >= 1) { tokens -= 1; ok++; addLog("request allowed (" + tokens.toFixed(1) + " left)", "ok"); }
      else { no++; addLog("429 Too Many Requests, retry later", "no"); }
      draw();
    }
    const t = setInterval(() => { tokens = Math.min(cap, tokens + rate * 0.1); draw(); }, 100);
    const capR = el("input", { type: "range", min: 1, max: 10, value: cap, oninput: (e) => { cap = +e.target.value; tokens = Math.min(tokens, cap); capL.textContent = cap; draw(); } });
    const capL = el("b", {}, String(cap));
    const rateR = el("input", { type: "range", min: 1, max: 10, value: rate, oninput: (e) => { rate = +e.target.value; rateL.textContent = rate + "/s"; } });
    const rateL = el("b", {}, rate + "/s");
    body.append(el("div", { class: "controls" }, el("label", {}, "Bucket capacity ", capR, capL), el("label", {}, "Refill rate ", rateR, rateL)),
      tok, info,
      el("div", { class: "controls" }, el("button", { class: "btn primary", onclick: send }, "Send request"),
        el("button", { class: "btn", onclick: () => { for (let i = 0; i < 10; i++) send(); } }, "Burst of 10"),
        el("button", { class: "btn", onclick: () => { tokens = cap; ok = no = 0; log.replaceChildren(); draw(); } }, "Reset")),
      el("div", { class: "stats" }, sOk.node, sNo.node), log);
    draw();
    return () => clearInterval(t);
  };

  /* 7. observer -------------------------------------------------------- */
  Sims.observer = function (root) {
    const body = shell(root, "Weather station (Observer pattern)", "Simulation");
    const observers = [
      { name: "PhoneAlert", on: true, fmt: (t) => (t > 35 ? "sends HEAT WARNING" : "stays quiet") },
      { name: "Dashboard", on: true, fmt: (t) => "displays " + t + " C" },
      { name: "Logger", on: false, fmt: (t) => "appends " + t + " to history" },
    ];
    let temp = 25;
    const log = el("div", { class: "log" });
    const subs = el("div", { class: "controls" });
    const tLabel = el("b", {}, temp + " C");
    function drawSubs() {
      subs.replaceChildren(el("span", { class: "small muted" }, "Subscribers:"), ...observers.map((o) =>
        el("button", { class: "btn sm" + (o.on ? " primary" : ""), onclick: () => { o.on = !o.on; drawSubs(); log.prepend(el("div", {}, o.name + (o.on ? " subscribed" : " unsubscribed"))); } }, (o.on ? "✓ " : "") + o.name)));
    }
    const range = el("input", { type: "range", min: 0, max: 45, value: temp, oninput: (e) => { temp = +e.target.value; tLabel.textContent = temp + " C"; } });
    const publish = el("button", { class: "btn primary", onclick: () => {
      const active = observers.filter((o) => o.on);
      if (!active.length) log.prepend(el("div", { class: "no" }, "  (no observers, nobody notified)"));
      active.slice().reverse().forEach((o) => log.prepend(el("div", {}, "  -> " + o.name + " " + o.fmt(temp))));
      log.prepend(el("div", { class: "ok" }, "station.set_temperature(" + temp + ")"));
    } }, "Publish");
    body.append(subs, el("div", { class: "controls" }, el("label", {}, "Temperature ", range, tLabel), publish), log);
    drawSubs();
    return () => {};
  };

  window.Sims = Sims;
})();

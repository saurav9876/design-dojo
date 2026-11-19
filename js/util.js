(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Inline formatting: `code` and **bold**. Input is escaped first.
  function fmt(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  const KW =
    "abstract|assert|break|case|catch|class|continue|default|do|else|enum|extends|final|finally|for|if|implements|import|instanceof|interface|new|null|package|private|protected|public|record|return|static|super|switch|synchronized|this|throw|throws|try|var|void|volatile|while|true|false|int|long|double|boolean|char|byte|float|short";
  const TOKEN = new RegExp(
    "(\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/)|(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*')|\\b(" + KW + ")\\b|\\b(\\d+(?:\\.\\d+)?)\\b",
    "g"
  );

  function highlight(code) {
    let out = "";
    let last = 0;
    let m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? "tk-c" : m[2] ? "tk-s" : m[3] ? "tk-k" : "tk-n";
      out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      last = m.index + m[0].length;
    }
    return out + esc(code.slice(last));
  }

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    kids.flat().forEach((c) => {
      if (c == null || c === false) return;
      e.append(c.nodeType ? c : document.createTextNode(c));
    });
    return e;
  }

  const mem = {};
  const Store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("dojo:" + k);
        if (v != null) return JSON.parse(v);
      } catch (e) {}
      return k in mem ? mem[k] : d;
    },
    set(k, v) {
      mem[k] = v;
      try {
        localStorage.setItem("dojo:" + k, JSON.stringify(v));
      } catch (e) {}
    },
  };

  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Typewriter effect. Returns a cancel function.
  function typeText(node, text, speed = 18, done) {
    if (reduced()) {
      node.textContent = text;
      if (done) done();
      return () => {};
    }
    node.textContent = "";
    node.classList.add("typing");
    let i = 0;
    let t = null;
    const step = () => {
      i++;
      node.textContent = text.slice(0, i);
      if (i < text.length) t = setTimeout(step, speed);
      else {
        node.classList.remove("typing");
        if (done) done();
      }
    };
    t = setTimeout(step, speed);
    return () => {
      clearTimeout(t);
      node.textContent = text;
      node.classList.remove("typing");
    };
  }

  function hash32(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  window.U = { esc, fmt, highlight, el, Store, typeText, hash32, mulberry32, shuffle, reduced };
  window.LESSONS = [];
})();

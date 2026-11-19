(function () {
  // Pointer-following glow and ring. Purely visual; skipped on touch screens.
  const root = document.documentElement;
  const fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine) return;
  const ring = document.createElement("div");
  ring.id = "ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.append(ring);

  let tx = window.innerWidth * 0.3, ty = window.innerHeight * 0.28;   // target (pointer)
  let gx = tx, gy = ty;                                                // glow position, eases toward the pointer
  let rx = tx, ry = ty;                                                // ring position, eases faster
  let raf = 0, seen = false;

  function frame() {
    gx += (tx - gx) * 0.08; gy += (ty - gy) * 0.08;
    rx += (tx - rx) * 0.25; ry += (ty - ry) * 0.25;
    root.style.setProperty("--mx", gx.toFixed(1) + "px");
    root.style.setProperty("--my", gy.toFixed(1) + "px");
    ring.style.transform = "translate(" + (rx - 17).toFixed(1) + "px," + (ry - 17).toFixed(1) + "px)";
    const moving = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.3 || Math.abs(tx - rx) + Math.abs(ty - ry) > 0.3;
    raf = moving ? requestAnimationFrame(frame) : 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    tx = e.clientX; ty = e.clientY;
    if (!seen) { seen = true; rx = tx; ry = ty; ring.classList.add("on"); }
    const t = e.target;
    ring.classList.toggle("hot", !!(t && t.closest && t.closest("a, button, summary, input, select, textarea, label, .opt, mark.mk")));
    kick();
  }, { passive: true });
  document.addEventListener("mouseleave", () => ring.classList.remove("on"));
  document.addEventListener("mouseenter", () => { if (seen) ring.classList.add("on"); });
  root.style.setProperty("--mx", gx + "px");
  root.style.setProperty("--my", gy + "px");
})();

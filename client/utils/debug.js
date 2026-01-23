// debugger
(() => {
  const TRIGGER_WINDOW = 5000;
  let seq = [];
  let open = false;

  const logs = [];
  const maxLogs = 300;

  function capture(type, args) {
    const line = `[${type}] ` + args.map(a =>
      typeof a === "object" ? JSON.stringify(a) : String(a)
    ).join(" ");
    logs.push(line);
    if (logs.length > maxLogs) logs.shift();
    renderLogs();
  }

  ["log", "warn", "error"].forEach(k => {
    const orig = console[k];
    console[k] = (...a) => {
      capture(k, a);
      orig(...a);
    };
  });

  window.addEventListener("error", e => {
    capture("error", [e.message, e.filename + ":" + e.lineno]);
  });

  function tl(x, y) { return x < 50 && y < 50; }
  function br(x, y) {
    return x > innerWidth - 50 && y > innerHeight - 50;
  }

  document.addEventListener("click", e => {
    const now = Date.now();
    seq = seq.filter(s => now - s.t < TRIGGER_WINDOW);
    seq.push({ t: now, x: e.clientX, y: e.clientY });

    if (seq.length < 4) return;
    const s = seq.slice(-4);

    if (tl(s[0].x, s[0].y) && tl(s[1].x, s[1].y) &&
        br(s[2].x, s[2].y) && br(s[3].x, s[3].y)) {
      openDebugger();
      seq = [];
    }
  });

  function openDebugger() {
    if (open) return;
    open = true;

    const box = document.createElement("div");
    box.id = "fetcher-debugger";
    box.style = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 520px;
      height: 420px;
      background: #111;
      color: #0f0;
      font-family: monospace;
      border: 1px solid #0f0;
      z-index: 99999;
      display: flex;
      flex-direction: column;
    `;

    box.innerHTML = `
      <div id="fd-head" style="cursor:move;padding:5px;background:#020;">
        <strong>debuggy wuggy</strong>
        <button id="fd-close" style="float:right;">x</button>
      </div>

      <div style="padding:5px;">
        <button id="fd-clear-logs">clear logs</button>
        <button id="fd-reload">reload</button>
        <button id="fd-hard-reload">hard reload</button>
        <button id="fd-dump-storage">dump storage</button>
        <button id="fd-clear-storage">clear storage</button>
        <button id="fd-clear-fetched">delete .fetched</button>
      </div>

      <pre id="fd-logs" style="
        flex:1;
        margin:5px;
        background:#000;
        overflow:auto;
        padding:5px;
        font-size:12px;
      "></pre>

      <div style="padding:5px;border-top:1px solid #0f0;">
        <input id="fd-input" placeholder="js console"
          style="width:80%;background:#000;color:#0f0;">
        <button id="fd-run">run</button>
        <pre id="fd-out"></pre>
      </div>
    `;

    document.body.appendChild(box);

    // dragging
    const head = box.querySelector("#fd-head");
    let dx, dy, drag = false;

    head.onmousedown = e => {
      drag = true;
      dx = e.clientX - box.offsetLeft;
      dy = e.clientY - box.offsetTop;
    };
    document.onmousemove = e => {
      if (!drag) return;
      box.style.left = e.clientX - dx + "px";
      box.style.top = e.clientY - dy + "px";
    };
    document.onmouseup = () => drag = false;

    // buttons
    box.querySelector("#fd-close").onclick = () => {
      box.remove();
      open = false;
    };

    box.querySelector("#fd-clear-logs").onclick = () => {
      logs.length = 0;
      renderLogs();
    };

    box.querySelector("#fd-reload").onclick = () => location.reload();
    box.querySelector("#fd-hard-reload").onclick = () => location.reload(true);

    box.querySelector("#fd-dump-storage").onclick = () => {
      capture("storage", [localStorage]);
    };

    box.querySelector("#fd-clear-storage").onclick = () => {
      localStorage.clear();
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "")
          .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
      });
      alert("local data cleared (init will trigger)");
    };

    box.querySelector("#fd-clear-fetched").onclick = async () => {
      try {
        const root = await showDirectoryPicker();
        const d = await root.getDirectoryHandle(".fetched");
        for await (const e of d.values()) {
          await d.removeEntry(e.name, { recursive: true });
        }
        await root.removeEntry(".fetched", { recursive: true });
        alert(".fetched deleted");
      } catch (e) {
        alert("failed: " + e.message);
      }
    };

    box.querySelector("#fd-run").onclick = () => {
      const input = box.querySelector("#fd-input").value;
      try {
        const r = eval(input);
        box.querySelector("#fd-out").textContent = String(r);
      } catch (e) {
        box.querySelector("#fd-out").textContent = "error: " + e.message;
      }
    };

    renderLogs();
  }

  function renderLogs() {
    const el = document.getElementById("fd-logs");
    if (!el) return;
    el.textContent = logs.join("\n");
  }

})();

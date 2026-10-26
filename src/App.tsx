import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { CATS, films, type Cat } from "./data";
import { placed, SHIFT, TH, TW, zoom } from "./layout";
import { Table, type Cam, type TableApi } from "./Table";
import { Viewer } from "./Viewer";

const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Film-leader countdown. Any click or key skips it. */
function Leader({ out, onDone }: { out: boolean; onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (out) return;
    if (n === 0) { onDone(); return; }
    const t = setTimeout(() => setN(n - 1), 560);
    return () => clearTimeout(t);
  }, [n, out, onDone]);
  useEffect(() => {
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [onDone]);
  return (
    <div className={`leader${out ? " out" : ""}`} onPointerDown={onDone} aria-hidden>
      <div className="leader-ring">
        <span className="leader-sweep" key={n} />
        <b>{Math.max(n, 1)}</b>
      </div>
      <small>Vivek Negi — reel loading</small>
    </div>
  );
}

const pad = (n: number, l = 2) => String(Math.floor(Math.abs(n))).padStart(l, "0");

/** Coordinates, timecode and minimap, written straight to the DOM every frame. */
function Readout({ cam }: { cam: RefObject<Cam> }) {
  const coords = useRef<HTMLSpanElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  const view = useRef<HTMLSpanElement>(null);
  const S = 168 / TW;
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      const c = cam.current;
      const z = zoom();
      const cx = c.x + innerWidth / 2 / z, cy = c.y + innerHeight / 2 / z;
      if (coords.current) coords.current.textContent = `X ${cx < 0 ? "−" : "+"}${pad(cx, 5)}   Y ${cy < 0 ? "−" : "+"}${pad(cy, 5)}`;
      const f = Math.floor(((performance.now() - t0) / 1000) * 24);
      if (tc.current) tc.current.textContent = `${pad(f / 86400)}:${pad((f / 1440) % 60)}:${pad((f / 24) % 60)}:${pad(f % 24)}`;
      if (view.current) {
        const j = Math.floor(c.y / TH);
        const x = ((((c.x - j * SHIFT) % TW) + TW) % TW) * S;
        const y = (((c.y % TH) + TH) % TH) * S;
        view.current.style.transform = `translate(${x}px, ${y}px)`;
        view.current.style.width = `${(innerWidth / z) * S}px`;
        view.current.style.height = `${(innerHeight / z) * S}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cam, S]);
  return (
    <>
      <div className="readout">
        <span ref={tc} className="tc">00:00:00:00</span>
        <span ref={coords} />
        <span className="hint">Drag · scroll · click a frame</span>
      </div>
      <div className="minimap" aria-hidden style={{ width: TW * S, height: TH * S }}>
        {placed.map((p, k) => (
          <i key={k} className={p.p.type === "film" ? p.p.cat : "card"} style={{ left: p.x * S, top: p.y * S, width: p.w * S, height: p.h * S }} />
        ))}
        <span ref={view} className="mm-view" />
      </div>
    </>
  );
}

/** 1:1 dot cursor; grows into a labelled disc over films. */
function Cursor({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(pointer: coarse)").matches) return;
    const move = (e: PointerEvent) => { if (ref.current) ref.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`; };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return <div ref={ref} className={`cur${label ? " big" : ""}${label === "Drag" ? " drag" : ""}`} aria-hidden><span>{label}</span></div>;
}

export default function App() {
  const cam = useRef<Cam>({ x: 0, y: 0, vx: 0, vy: 0, tx: null, ty: null });
  const api = useRef<TableApi | null>(null);
  const [filter, setFilter] = useState<Cat | null>(null);
  const [intro, setIntro] = useState<"leader" | "out" | "done">(reduced ? "done" : "leader");
  const [hover, setHover] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const list = filter ? films.filter((f) => f.cat === filter) : films;

  const endIntro = useCallback(() => {
    setIntro((s) => (s === "leader" ? "out" : s));
    setTimeout(() => setIntro("done"), 700);
  }, []);

  const pick = (c: Cat) => {
    const next = filter === c ? null : c;
    setFilter(next);
    if (next) api.current?.flyTo((it) => it.p.type === "film" && it.p.cat === next);
  };
  const flyCard = (id: string) => { setFilter(null); api.current?.flyTo((it) => it.p.type === "card" && it.p.id === id); };

  const from = useCallback((id: string) => api.current?.find(id) ?? null, []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + list.length) % list.length)), [list.length]);
  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      <Table
        cam={cam}
        api={api}
        filter={filter}
        revealed={intro !== "leader"}
        liftedId={open !== null ? list[open].id : null}
        active={open === null}
        onOpen={(f) => { setHover(""); setOpen(list.findIndex((x) => x.id === f.id)); }}
        onHover={setHover}
      />

      <header className={`hud-top${open !== null ? " hide" : ""}`}>
        <button className="brand" onClick={() => flyCard("slate")}>
          Vivek Negi<span>Editor</span>
        </button>
        <nav className="chips" aria-label="Filter the table">
          <button className={filter === null ? "on" : ""} onClick={() => setFilter(null)}>All</button>
          {CATS.map((c) => (
            <button key={c.id} className={filter === c.id ? "on" : ""} onClick={() => pick(c.id)}>{c.label}</button>
          ))}
        </nav>
        <div className="actions">
          <button className="ghost" onClick={() => flyCard("about")}>About</button>
          <button className="talk" onClick={() => flyCard("contact")}>Let's talk</button>
        </div>
      </header>
      <Readout cam={cam} />

      {open !== null && <Viewer list={list} index={open} from={from} onStep={step} onClose={close} />}
      {intro !== "done" && <Leader out={intro === "out"} onDone={endIntro} />}
      <Cursor label={open === null ? hover : ""} />
    </>
  );
}

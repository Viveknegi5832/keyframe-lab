import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
import { AboutCard, ContactCard, SlateCard } from "./Cards";
import { loop, thumb, type Cat, type Film } from "./data";
import { placed, SHIFT, TH, TW, zoom, type Placed } from "./layout";

export type Cam = { x: number; y: number; vx: number; vy: number; tx: number | null; ty: number | null };
export type TableApi = {
  flyTo: (match: (it: Placed) => boolean) => void;
  find: (filmId: string) => { rect: DOMRect; w: number; h: number; rot: number } | null;
};
type Inst = { key: string; it: Placed; wx: number; wy: number };

const MARGIN = 280;
const LIVE = 5; // films closest to the centre play their loop; the rest show posters
const SETTLE = 240; // ms of stillness before swapping which films play (starting decoders mid-pan stalls the GPU)
const GRID = 200; // background grid period in px

type Props = {
  cam: RefObject<Cam>;
  api: RefObject<TableApi | null>;
  filter: Cat | null;
  revealed: boolean;
  liftedId: string | null;
  active: boolean;
  onOpen: (film: Film) => void;
  onHover: (label: string) => void;
};

export function Table({ cam, api, filter, revealed, liftedId, active, onOpen, onHover }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const torchEl = useRef<HTMLDivElement>(null);
  // where the light points: follows the cursor, glides to the screen centre after a fly-to or on touch
  const torch = useRef({ x: innerWidth / 2, y: innerHeight / 2, center: false });
  const els = useRef(new Map<string, { el: HTMLDivElement; tf: string; z: string }>());
  const delays = useRef(new Map<string, string>());
  const instRef = useRef<Inst[]>([]);
  const [inst, setInst] = useState<Inst[]>([]);
  const [live, setLive] = useState("");
  const ptr = useRef({ x: innerWidth / 2, y: innerHeight / 2, touch: matchMedia("(pointer: coarse)").matches });
  const drag = useRef<{ x: number; y: number; sx: number; sy: number; t: number; moved: boolean } | null>(null);
  const dirty = useRef(true);
  const hoverLabel = useRef("");

  // start centred on the slate card
  useLayoutEffect(() => {
    const s = placed.find((p) => p.p.type === "card" && p.p.id === "slate")!;
    const z = zoom();
    cam.current.x = s.x + s.w / 2 - innerWidth / 2 / z;
    cam.current.y = s.y + s.h / 2 - innerHeight / 2 / z;
  }, [cam]);

  useEffect(() => {
    api.current = {
      flyTo(match) {
        const c = cam.current;
        const z = zoom();
        const cx = c.x + innerWidth / 2 / z, cy = c.y + innerHeight / 2 / z;
        let best: { d: number; x: number; y: number } | null = null;
        const jc = Math.floor(cy / TH);
        for (let j = jc - 1; j <= jc + 1; j++) {
          const off = j * SHIFT;
          const ic = Math.floor((cx - off) / TW);
          for (let i = ic - 1; i <= ic + 1; i++) {
            for (const it of placed) {
              if (!match(it)) continue;
              const x = i * TW + off + it.x + it.w / 2, y = j * TH + it.y + it.h / 2;
              const d = Math.hypot(x - cx, y - cy);
              if (!best || d < best.d) best = { d, x, y };
            }
          }
        }
        if (best) { c.tx = best.x - innerWidth / 2 / z; c.ty = best.y - innerHeight / 2 / z; c.vx = c.vy = 0; torch.current.center = true; }
      },
      find(filmId) {
        let best: { d: number; el: HTMLDivElement; it: Placed } | null = null;
        for (const n of instRef.current) {
          if (n.it.p.type !== "film" || n.it.p.id !== filmId) continue;
          const e = els.current.get(n.key);
          if (!e) continue;
          const r = e.el.getBoundingClientRect();
          const d = Math.hypot(r.x + r.width / 2 - innerWidth / 2, r.y + r.height / 2 - innerHeight / 2);
          if (!best || d < best.d) best = { d, el: e.el, it: n.it };
        }
        if (!best) return null;
        const m = best.el.querySelector<HTMLElement>(".media")!;
        const z = zoom();
        return { rect: m.getBoundingClientRect(), w: m.offsetWidth * z, h: m.offsetHeight * z, rot: best.it.rot };
      },
    };
  }, [api, cam]);

  // camera loop: inertia, fly-to, visible set, spotlight + magnify
  useEffect(() => {
    let raf = 0;
    let lastKeys = "";
    let lastLive = "";
    let lastX = NaN, lastY = NaN, movedAt = 0, settledOnce = false;
    let amp = 1; // strength of the lift/magnify effect: eases off while the table moves, so panning restyles nothing
    const tick = () => {
      const c = cam.current;
      const vw = innerWidth, vh = innerHeight;
      const z = zoom();
      if (!drag.current) {
        if (c.tx !== null && c.ty !== null) {
          const dx = c.tx - c.x, dy = c.ty - c.y;
          c.x += dx * 0.075; c.y += dy * 0.075;
          if (Math.hypot(dx, dy) < 0.5) { c.x = c.tx; c.y = c.ty; c.tx = c.ty = null; }
          dirty.current = true;
        } else if (Math.abs(c.vx) + Math.abs(c.vy) > 0.05) {
          c.x += c.vx; c.y += c.vy;
          c.vx *= 0.94; c.vy *= 0.94;
          dirty.current = true;
        }
      }
      const now = performance.now();
      if (c.x !== lastX || c.y !== lastY) { lastX = c.x; lastY = c.y; movedAt = now; settledOnce = false; }
      const settled = now - movedAt > SETTLE;
      if (settled && !settledOnce) { settledOnce = true; dirty.current = true; }
      const ampTo = now - movedAt < 140 ? 0 : 1;
      if (Math.abs(ampTo - amp) > 0.002) { amp += (ampTo - amp) * (ampTo ? 0.09 : 0.2); dirty.current = true; } else amp = ampTo;
      const p = ptr.current, tr = torch.current;
      const toCenter = p.touch || tr.center;
      const lx = toCenter ? vw / 2 : p.x, ly = toCenter ? vh / 2 : p.y;
      if (Math.abs(lx - tr.x) + Math.abs(ly - tr.y) > 0.5) { tr.x += (lx - tr.x) * 0.22; tr.y += (ly - tr.y) * 0.22; dirty.current = true; }
      if (dirty.current) {
        dirty.current = false;
        if (world.current) world.current.style.transform = `translate3d(${-c.x * z}px, ${-c.y * z}px, 0) scale(${z})`;
        // the grid is an oversized layer nudged by the remainder: compositor-only, no full-screen repaint
        const gx = (((c.x * z) % GRID) + GRID) % GRID, gy = (((c.y * z) % GRID) + GRID) % GRID;
        if (grid.current) grid.current.style.transform = `translate3d(${-gx}px, ${-gy}px, 0)`;

        const x0 = c.x - MARGIN, x1 = c.x + vw / z + MARGIN, y0 = c.y - MARGIN, y1 = c.y + vh / z + MARGIN;
        const list: Inst[] = [];
        for (let j = Math.floor(y0 / TH); j <= Math.floor(y1 / TH); j++) {
          const off = j * SHIFT;
          for (let i = Math.floor((x0 - off) / TW); i <= Math.floor((x1 - off) / TW); i++) {
            for (let k = 0; k < placed.length; k++) {
              const it = placed[k];
              const wx = i * TW + off + it.x, wy = j * TH + it.y;
              if (wx + it.w > x0 && wx < x1 && wy + it.h > y0 && wy < y1) list.push({ key: `${k}@${i},${j}`, it, wx, wy });
            }
          }
        }
        const keys = list.map((n) => n.key).join("|");
        if (keys !== lastKeys) { lastKeys = keys; instRef.current = list; setInst(list); }

        const px = tr.x, py = tr.y;
        const R = Math.max(380, Math.min(vw, 1900) * 0.3);
        const cand: [number, string][] = [];
        for (const n of instRef.current) {
          const sx = (n.wx + n.it.w / 2 - c.x) * z, sy = (n.wy + n.it.h / 2 - c.y) * z;
          const k = Math.max(0, 1 - Math.hypot(sx - px, sy - py) / R);
          const e = k * k * (3 - 2 * k) * amp;
          const r = els.current.get(n.key);
          if (r) {
            // only touch the DOM when a value actually changes
            const tf = `rotate(${(n.it.rot * (1 - e)).toFixed(2)}deg) scale(${(1 + 0.09 * e).toFixed(3)})`;
            const zi = e > 0.4 ? "2" : "";
            if (tf !== r.tf) { r.tf = tf; r.el.style.transform = tf; }
            if (zi !== r.z) { r.z = zi; r.el.style.zIndex = zi; }
          }
          if (n.it.p.type === "film" && sx > 0 && sx < vw && sy > 0 && sy < vh) cand.push([Math.hypot(sx - vw / 2, sy - vh / 2), n.key]);
        }
        cand.sort((a, b) => a[0] - b[0]);
        const lv = cand.slice(0, LIVE).map((n) => n[1]).sort().join("|");
        if (settled && lv !== lastLive) { lastLive = lv; setLive(lv); }
        // one darkness layer with a soft hole replaces a shade on every print
        if (torchEl.current) torchEl.current.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const resize = () => { dirty.current = true; };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [cam]);

  // wheel / trackpad pans the table
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const k = (e.deltaMode === 1 ? 32 : 1) / zoom();
      const c = cam.current;
      const sideways = e.shiftKey && !e.deltaX;
      c.x += (sideways ? e.deltaY : e.deltaX) * k;
      c.y += (sideways ? 0 : e.deltaY) * k;
      c.tx = c.ty = null; c.vx = c.vy = 0;
      dirty.current = true;
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [cam]);

  // arrow keys glide the camera
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      const c = cam.current;
      c.tx = (c.tx ?? c.x) + d[0] * 420; c.ty = (c.ty ?? c.y) + d[1] * 320;
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, cam]);

  const setHover = (label: string) => { if (label !== hoverLabel.current) { hoverLabel.current = label; onHover(label); } };

  const down = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    stage.current?.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
    const c = cam.current;
    c.tx = c.ty = null; c.vx = c.vy = 0;
  };
  const move = (e: PointerEvent) => {
    ptr.current = { x: e.clientX, y: e.clientY, touch: e.pointerType !== "mouse" };
    torch.current.center = false;
    dirty.current = true;
    const d = drag.current;
    if (!d) {
      const hit = (e.target as HTMLElement).closest("[data-film]");
      setHover(hit ? "Play" : "");
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    const c = cam.current;
    const z = zoom();
    c.x -= dx / z; c.y -= dy / z;
    c.vx = c.vx * 0.4 - (dx / z) * 0.6; c.vy = c.vy * 0.4 - (dy / z) * 0.6;
    d.x = e.clientX; d.y = e.clientY; d.t = performance.now();
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) { d.moved = true; setHover("Drag"); }
  };
  const up = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const c = cam.current;
    if (performance.now() - d.t > 90) { c.vx = c.vy = 0; } // paused before letting go: no fling
    if (!d.moved) {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-film]");
      const n = hit && instRef.current.find((x) => x.key === hit.dataset.key);
      if (n && n.it.p.type === "film") onOpen(n.it.p);
    }
    setHover("");
  };

  const register = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) { els.current.set(key, { el, tf: "", z: "" }); dirty.current = true; }
    else els.current.delete(key);
  }, []);
  const liveSet = new Set(live.split("|"));
  const vw = innerWidth, vh = innerHeight, z = zoom();
  return (
    <div
      ref={stage}
      className={`stage${revealed ? " revealed" : ""}${filter ? " filtered" : ""}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={() => setHover("")}
    >
      <div ref={grid} className="grid" aria-hidden />
      <div ref={world} className="world">
        {inst.map((n) => {
          const p = n.it.p;
          const isFilm = p.type === "film";
          // reveal ripples outward from the centre of the first view; fixed once per piece so re-renders keep it
          let d = delays.current.get(n.key);
          if (!d) {
            const dist = Math.hypot((n.wx + n.it.w / 2 - cam.current.x) * z - vw / 2, (n.wy + n.it.h / 2 - cam.current.y) * z - vh / 2);
            d = `${Math.min(1.1, dist / 1900).toFixed(2)}s`;
            delays.current.set(n.key, d);
          }
          return (
            <Piece
              key={n.key}
              n={n}
              delay={d}
              dim={filter !== null && (!isFilm || p.cat !== filter)}
              lifted={isFilm && p.id === liftedId}
              live={liveSet.has(n.key)}
              register={register}
            />
          );
        })}
      </div>
      <div ref={torchEl} className="torch" aria-hidden />
    </div>
  );
}

type PieceProps = { n: Inst; delay: string; dim: boolean; lifted: boolean; live: boolean; register: (key: string, el: HTMLDivElement | null) => void };

/** One print on the table. Memoised: panning only renders the pieces that enter the view. */
const Piece = memo(function Piece({ n, delay, dim, lifted, live, register }: PieceProps) {
  const p = n.it.p;
  const isFilm = p.type === "film";
  const ref = useCallback((el: HTMLDivElement | null) => register(n.key, el), [register, n.key]);
  return (
    <div
      ref={ref}
      data-key={n.key}
      data-film={isFilm ? "" : undefined}
      className={`piece is-${p.type}${dim ? " dim" : ""}${lifted ? " lifted" : ""}`}
      style={{ left: n.wx, top: n.wy, width: n.it.w, "--d": delay } as CSSProperties}
    >
      <div className={`media${isFilm && p.vertical ? " vert" : ""}`} style={{ height: n.it.mh }}>
        {isFilm ? (
          <>
            <img src={thumb(p.id)} alt="" draggable={false} decoding="async" />
            {live && <video src={loop(p.id)} autoPlay muted loop playsInline />}
          </>
        ) : p.id === "slate" ? <SlateCard /> : p.id === "about" ? <AboutCard /> : <ContactCard />}
      </div>
      {isFilm && (
        <div className="cap">
          <b>{p.title}</b>
          <span>{p.tag} · {p.length}</span>
        </div>
      )}
    </div>
  );
});

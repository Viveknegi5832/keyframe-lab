import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { poster, src, type Film } from "./data";

type From = { rect: DOMRect; w: number; h: number; rot: number } | null;

function fit(vertical?: boolean) {
  const a = vertical ? 9 / 16 : 16 / 9;
  const w = Math.min(innerWidth * (innerWidth < 700 ? 0.94 : 0.84), innerHeight * 0.76 * a);
  const h = w / a;
  return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2 - 18, width: w, height: h };
}

const fromStyle = (f: From): CSSProperties =>
  f
    ? {
        left: f.rect.x + f.rect.width / 2 - f.w / 2,
        top: f.rect.y + f.rect.height / 2 - f.h / 2,
        width: f.w,
        height: f.h,
        transform: `rotate(${f.rot}deg)`,
      }
    : { ...fit(), transform: "scale(0.6)", opacity: 0 };

/** The film lifts off the table, flies to centre and plays with sound; closing drops it back where it came from. */
export function Viewer({ list, index, from, onStep, onClose }: {
  list: Film[];
  index: number;
  from: (id: string) => From;
  onStep: (d: number) => void;
  onClose: () => void;
}) {
  const f = list[index];
  const [phase, setPhase] = useState<"from" | "open" | "leave">("from");
  const [origin, setOrigin] = useState<From>(() => from(f.id));
  const [, setSize] = useState(0);

  useEffect(() => {
    let r = requestAnimationFrame(() => { r = requestAnimationFrame(() => setPhase("open")); });
    return () => cancelAnimationFrame(r);
  }, []);
  useEffect(() => {
    const on = () => setSize((n) => n + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const close = useCallback(() => {
    if (phase === "leave") return;
    setOrigin(from(f.id));
    setPhase("leave");
    setTimeout(onClose, 640);
  }, [phase, from, f.id, onClose]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close, onStep]);

  const box = phase === "open" ? { ...fit(f.vertical), transform: "rotate(0deg)" } : fromStyle(origin);
  return (
    <div className={`viewer ${phase}`} onClick={close} role="dialog" aria-label={f.title}>
      <div className="vbox" style={box} onClick={(e) => e.stopPropagation()}>
        <img src={poster(f.id)} alt="" />
        <video key={f.id} src={src(f.id)} poster={poster(f.id)} autoPlay playsInline controls={phase === "open"} onEnded={() => onStep(1)} />
      </div>
      <div className="vbar" onClick={(e) => e.stopPropagation()}>
        <span className="vmeta">
          <em>{String(index + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}</em>
          <b>{f.title}</b>
          <span>{f.tag} · {f.length}</span>
        </span>
        <span className="vnav">
          <button onClick={() => onStep(-1)}>← Prev</button>
          <button onClick={() => onStep(1)}>Next →</button>
          <button onClick={close}>Close ✕</button>
        </span>
      </div>
    </div>
  );
}

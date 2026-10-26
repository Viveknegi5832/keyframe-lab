import { films, type Piece } from "./data";

/** One tile of the table. It repeats forever in both directions; each tile row is shifted sideways so repeats don't line up. */
export type Placed = { p: Piece; x: number; y: number; w: number; h: number; mh: number; rot: number };

const COLS = [440, 320, 500, 360, 460, 330, 420];
const GAP = 96;
export const CAP = 46; // caption strip under each film

const ORDER = [
  "slate", "saas-holo", "madoff", "short-a", "saas-tally", "route-hub", "saas-drift", "reddit", "kinetic-interview", "about",
  "ten-million", "short-b", "saas-wander", "volkswagen", "cold-email", "saas-sprout", "news-launch", "contact", "tudor-jones",
  "short-c", "thousand-demos", "dropshipping", "vibescaling", "nine-to-five",
];
const CARD_H = { slate: 0.8, about: 0.92, contact: 0.84 };

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build() {
  const rand = rng(7);
  const pieces: Piece[] = ORDER.map((id) => films.find((f) => f.id === id) ?? { type: "card", id: id as "slate" | "about" | "contact" });
  const cols: { w: number; items: { p: Piece; h: number; mh: number }[]; h: number }[] = COLS.map((w) => ({ w, items: [], h: 0 }));
  for (const p of pieces) {
    const vertical = p.type === "film" && p.vertical;
    const ok = cols.filter((c) => (vertical ? c.w <= 360 : p.type === "card" ? c.w >= 420 : true));
    const col = ok.reduce((a, b) => (b.h < a.h ? b : a));
    const mh = p.type === "card" ? Math.round(col.w * CARD_H[p.id]) : Math.round(vertical ? (col.w * 16) / 9 : (col.w * 9) / 16);
    const h = p.type === "card" ? mh : mh + CAP;
    col.items.push({ p, h, mh });
    col.h += h + GAP;
  }
  const TH = Math.max(...cols.map((c) => c.h));
  const out: Placed[] = [];
  let x = GAP / 2;
  for (const c of cols) {
    // spread each column's spare height across its gaps so every column fills the tile exactly
    const gap = GAP + (TH - c.h) / c.items.length;
    let y = gap / 2;
    for (const it of c.items) {
      out.push({ p: it.p, x: Math.round(x + (rand() - 0.5) * 24), y: Math.round(y), w: c.w, h: it.h, mh: it.mh, rot: (rand() - 0.5) * 2.6 });
      y += it.h + gap;
    }
    x += c.w + GAP;
  }
  return { placed: out, TW: x - GAP / 2, TH };
}

export const { placed, TW, TH } = build();
export const SHIFT = Math.round(TW * 0.37);

/** Table scale: smaller screens see the table from further away. */
export const zoom = () =>
  innerWidth < 700 ? 0.6 : innerWidth < 1100 ? 0.8 : Math.min(1.35, Math.max(1, Math.min(innerWidth / 1600, innerHeight / 900)));

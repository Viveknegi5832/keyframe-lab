const c = (f: string) => `${import.meta.env.BASE_URL}cinema/${f}`;
export const src = (id: string) => c(`${id}.mp4`);
export const loop = (id: string) => c(`${id}-loop.mp4`);
export const poster = (id: string) => c(`${id}.jpg`);
export const thumb = (id: string) => c(`${id}-thumb.jpg`); // 720px stills for the table

export type Cat = "saas" | "doc" | "b2b" | "shorts";

export const CATS: { id: Cat; label: string }[] = [
  { id: "saas", label: "SaaS launch" },
  { id: "doc", label: "Documentary" },
  { id: "b2b", label: "B2B" },
  { id: "shorts", label: "Shorts & reels" },
];

export type Film = { type: "film"; id: string; title: string; tag: string; cat: Cat; length: string; vertical?: boolean };
export type Card = { type: "card"; id: "slate" | "about" | "contact" };
export type Piece = Film | Card;

export const films: Film[] = [
  { type: "film", id: "saas-holo", title: "Holo", tag: "Spec ad", cat: "saas", length: "0:36" },
  { type: "film", id: "saas-tally", title: "Tally", tag: "Product launch", cat: "saas", length: "0:40" },
  { type: "film", id: "saas-drift", title: "Drift", tag: "Product launch", cat: "saas", length: "0:30" },
  { type: "film", id: "saas-wander", title: "Wander", tag: "Product launch", cat: "saas", length: "0:36" },
  { type: "film", id: "saas-sprout", title: "Sprout", tag: "Product launch", cat: "saas", length: "0:25" },
  { type: "film", id: "madoff", title: "Madoff", tag: "Trailer", cat: "doc", length: "0:55" },
  { type: "film", id: "reddit", title: "The Deadly Truth About Reddit", tag: "Documentary", cat: "doc", length: "0:30" },
  { type: "film", id: "volkswagen", title: "The Disturbing History of Volkswagen", tag: "Documentary", cat: "doc", length: "0:29" },
  { type: "film", id: "tudor-jones", title: "Paul Tudor Jones", tag: "Documentary", cat: "doc", length: "0:28" },
  { type: "film", id: "route-hub", title: "Not Every Buyer", tag: "Product film", cat: "b2b", length: "0:24" },
  { type: "film", id: "news-launch", title: "Breaking News", tag: "Launch film", cat: "b2b", length: "0:15" },
  { type: "film", id: "kinetic-interview", title: "Founder Interview", tag: "Cold open", cat: "b2b", length: "0:42" },
  { type: "film", id: "ten-million", title: "$10.6M in Cash", tag: "YouTube intro", cat: "b2b", length: "0:22" },
  { type: "film", id: "cold-email", title: "5M Cold Emails", tag: "YouTube intro", cat: "b2b", length: "0:31" },
  { type: "film", id: "thousand-demos", title: "1,000 Product Demos", tag: "YouTube intro", cat: "b2b", length: "0:24" },
  { type: "film", id: "dropshipping", title: "3 Lies About Dropshipping", tag: "YouTube intro", cat: "b2b", length: "0:19" },
  { type: "film", id: "vibescaling", title: "1,000,000 Views", tag: "YouTube intro", cat: "b2b", length: "0:25" },
  { type: "film", id: "nine-to-five", title: "Quit Your 9–5", tag: "YouTube intro", cat: "b2b", length: "0:27" },
  { type: "film", id: "short-a", title: "Short 01", tag: "Vertical", cat: "shorts", length: "0:15", vertical: true },
  { type: "film", id: "short-b", title: "Short 02", tag: "Vertical", cat: "shorts", length: "0:15", vertical: true },
  { type: "film", id: "short-c", title: "Short 03", tag: "Vertical", cat: "shorts", length: "0:15", vertical: true },
];

export const contact = {
  name: "Vivek Negi",
  email: "singhvivek5832@gmail.com",
  whatsapp: "https://wa.me/919821506819",
  linkedin: "https://www.linkedin.com/in/vivek-negi-380a211b7/",
  instagram: "https://www.instagram.com/lastkeyframe/",
};

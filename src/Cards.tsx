import { useState } from "react";
import { contact } from "./data";

const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

/** Clapperboard with the name on it: the first thing on the table. */
export function SlateCard() {
  return (
    <div className="card slate">
      <div className="clap">
        <span className="clap-top" />
        <span className="clap-base" />
      </div>
      <div className="slate-body">
        <div className="slate-name">
          <small>Prod.</small>
          <h1>Vivek Negi</h1>
          <p>Video editor &amp; motion designer</p>
        </div>
        <dl>
          <div><dt>Scene</dt><dd>SaaS · Docs · B2B · Shorts</dd></div>
          <div><dt>Take</dt><dd>50+</dd></div>
          <div><dt>Roll</dt><dd>{today}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export function AboutCard() {
  return (
    <div className="card about">
      <small>About</small>
      <p className="about-lead">
        One editor, <i>every cut.</i> Story, pacing, motion graphics and sound — for founders, creators and SaaS brands.
      </p>
      <div className="about-nums">
        <div><b>50+</b><span>videos delivered</span></div>
        <div><b>20+</b><span>creators &amp; brands</span></div>
        <div><b>8–10</b><span>videos a month</span></div>
      </div>
    </div>
  );
}

export function ContactCard() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(contact.email); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { window.prompt("Email", contact.email); }
  };
  return (
    <div className="card contact">
      <div>
        <small className="avail"><span />Available for new projects</small>
        <h2>Got footage?</h2>
        <p className="contact-sub"><i>Let's make it worth watching.</i></p>
      </div>
      <div className="contact-foot">
        <button className="contact-mail" onClick={copy} title="Copy email">
          <span>{contact.email}</span>
          <em>{copied ? "Copied ✓" : "Copy"}</em>
        </button>
        <div className="contact-btns">
          <a className="cbtn solid" href={`mailto:${contact.email}?subject=${encodeURIComponent("Video editing enquiry")}`}>Email me</a>
          <a className="cbtn" href={contact.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
        <div className="contact-soc">
          <a href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
          <a href={contact.instagram} target="_blank" rel="noreferrer">Instagram ↗</a>
        </div>
      </div>
    </div>
  );
}

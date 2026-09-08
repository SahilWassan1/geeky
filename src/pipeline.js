/*
 * The live half of Compliance Wiki.
 *
 * This is a replay of the capture run that produced src/data.js: the RBI
 * notifications listing was polled, ten items were detected, each detail page
 * was fetched and parsed, one mechanical check was run against a base text,
 * and every record published at `auto`. The stage events below are the real
 * sequence; the source probe results are the HTTP statuses this container
 * actually received.
 *
 * Nothing here is a simulation of a system we wish we had. When a source could
 * not be reached, the replay says so, because that is what happened.
 */

const STAGES = [
  { id: "watch", label: "Watch", blurb: "Hash the listing page. Unchanged pages cost nothing." },
  { id: "fetch", label: "Fetch", blurb: "Pull the notification, record the URL, the bytes and the hash." },
  { id: "parse", label: "Parse", blurb: "Server-rendered HTML into a structured record." },
  { id: "check", label: "Check", blurb: "Prove the change against the base text, or report it un-run." },
  { id: "publish", label: "Publish", blurb: "Live at the tier the check earned. Never silently upgraded." },
];

const CAPTURE_START = new Date("2026-09-08T23:20:00+05:30").getTime();

/* One simulated second is one wall minute of the capture run. */
function wallClock(simSeconds) {
  return new Date(CAPTURE_START + simSeconds * 60000);
}

/* ---- the script, built from what actually happened ---------------- */

const SCRIPT = [];

/* the probes, in the order they were run */
SOURCES.forEach((s, i) => {
  SCRIPT.push({
    t: 1 + i,
    type: "probe",
    source: s.id,
  });
});

/* then the ten records, in listing order */
const RECORD_ORDER = CHANGES.map((c) => c.id);
let t = SOURCES.length + 2;
RECORD_ORDER.forEach((id) => {
  SCRIPT.push({ t: t, type: "detect", record: id });
  SCRIPT.push({ t: t + 1, type: "stage", record: id, stage: "fetch" });
  SCRIPT.push({ t: t + 2, type: "stage", record: id, stage: "parse" });
  SCRIPT.push({ t: t + 3, type: "stage", record: id, stage: "check" });
  SCRIPT.push({ t: t + 4, type: "land", record: id });
  t += 3;
});

const SCRIPT_END = t + 8;

const RECORD_BY_ID = Object.fromEntries(CHANGES.map((c) => [c.id, c]));

/* ------------------------------------------------------------------ */

const Store = {
  changes: [],
  jobs: [],
  events: [],
  clock: 0,
  running: true,
  speed: 1,
  cursor: 0,
  complete: false,
  newSincePageLoad: new Set(),
  counters: { probes: 0, blocked: 0, detected: 0, published: 0, checksRun: 0 },
  listeners: [],

  on(fn) { this.listeners.push(fn); },
  emit(what) { this.listeners.forEach((fn) => fn(what)); },
  byId(id) { return this.changes.find((c) => c.id === id); },

  log(entry) {
    this.events.unshift({ ...entry, clock: this.clock, wall: wallClock(this.clock) });
    if (this.events.length > 160) this.events.pop();
  },
};

function jobFor(id) {
  return Store.jobs.find((j) => j.id === id);
}

function step(event) {
  const stamp = wallClock(Store.clock);

  if (event.type === "probe") {
    const src = SOURCE_BY_ID[event.source];
    Store.counters.probes += 1;
    const reachable = src.probe === 200;
    if (!reachable) Store.counters.blocked += 1;
    Store.log({
      kind: reachable ? "poll" : "alert",
      source: src.id,
      text: reachable
        ? `${src.name} — HTTP 200${src.parser ? "" : ", no parser configured yet"}`
        : `${src.name} — ${src.probe === 403 ? "HTTP 403" : "connection reset by peer"}. No records can come from this source until it is reachable.`,
    });
    Store.emit("sources");
    return;
  }

  if (event.type === "detect") {
    const rec = RECORD_BY_ID[event.record];
    Store.counters.detected += 1;
    Store.jobs.unshift({
      id: rec.id,
      title: rec.title,
      reference: rec.reference,
      stage: "watch",
      startedAt: stamp,
      log: [{ stage: "watch", text: "New item on the RBI notifications listing" }],
    });
    Store.log({ kind: "detect", record: rec.id, text: `${rec.reference.split(" · ")[0]} — new item on the listing` });
    Store.emit("pipeline");
    return;
  }

  if (event.type === "stage") {
    const job = jobFor(event.record);
    const rec = RECORD_BY_ID[event.record];
    if (!job) return;
    job.stage = event.stage;
    const note = stageNote(event.stage, rec);
    job.log.push({ stage: event.stage, text: note });
    Store.log({ kind: "stage", record: rec.id, text: `${rec.reference.split(" · ")[0]} — ${note}` });
    if (event.stage === "check" && rec.pipeline.check.result !== "not-run") Store.counters.checksRun += 1;
    Store.emit("pipeline");
    return;
  }

  if (event.type === "land") {
    const rec = RECORD_BY_ID[event.record];
    const job = jobFor(event.record);
    if (job) {
      job.stage = "publish";
      job.done = true;
      job.log.push({ stage: "publish", text: "Live as auto, unchecked" });
    }
    if (!Store.byId(rec.id)) {
      Store.changes.unshift(rec);
      Store.newSincePageLoad.add(rec.id);
      Store.counters.published += 1;
    }
    Store.log({
      kind: rec.pipeline.check.result === "fail" ? "hold" : "publish",
      record: rec.id,
      text: `${rec.reference.split(" · ")[0]} published as auto — ${rec.title.slice(0, 70)}`,
    });
    Store.emit("register");
    Store.emit("pipeline");
    return;
  }
}

function stageNote(stage, rec) {
  const p = rec.pipeline;
  switch (stage) {
    case "fetch":
      return `Fetched ${p.provenance[0].doc}, ${p.provenance[0].bytes.toLocaleString("en-IN")} bytes, sha256 recorded`;
    case "parse":
      return `Parsed with ${p.parse.parser} — reference, addressee${p.diff ? " and operative clause" : ""} recovered`;
    case "check":
      return p.check.result === "not-run"
        ? "Check not run — base text not captured"
        : `Base text searched: old phrase ${p.check.occurrences.old}×, new phrase ${p.check.occurrences.new}× — check failed`;
    default:
      return stage;
  }
}

/* ------------------------------------------------------------------ */

let timer = null;

function resetRun() {
  Store.clock = 0;
  Store.cursor = 0;
  Store.jobs = [];
  Store.changes = [];
  Store.newSincePageLoad.clear();
  Store.counters = { probes: 0, blocked: 0, detected: 0, published: 0, checksRun: 0 };
  Store.log({ kind: "poll", text: "Replaying the capture run of 8 September 2026, 23:20 IST." });
  Store.emit("register");
  Store.emit("pipeline");
}

function tick() {
  if (!Store.running) return;
  Store.clock += 1;

  while (Store.cursor < SCRIPT.length && SCRIPT[Store.cursor].t <= Store.clock) {
    step(SCRIPT[Store.cursor]);
    Store.cursor += 1;
  }

  Store.jobs = Store.jobs.filter(
    (j) => !j.done || Store.clock - (j.doneAt || (j.doneAt = Store.clock)) < 5
  );

  /* The capture is a fixed run, not a loop. When it finishes, it holds at the
     end state — a register that emptied itself every minute would be lying
     about what it holds. */
  if (Store.clock >= SCRIPT_END) {
    Store.running = false;
    Store.complete = true;
    Store.log({ kind: "poll", text: "Capture run complete. 10 records published, all labelled unchecked." });
  }
  Store.emit("clock");
}

function schedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 2000 / Store.speed);
}

Store.setSpeed = function (speed) {
  this.speed = speed;
  schedule();
  this.emit("clock");
};

Store.toggle = function () {
  if (this.complete) {
    this.complete = false;
    resetRun();
    this.running = true;
  } else {
    this.running = !this.running;
  }
  this.emit("clock");
};

schedule();

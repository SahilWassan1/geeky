/*
 * The live half of Compliance Wiki.
 *
 * This is a scripted run of the ingestion pipeline described in the README:
 * watchers hash listing pages, changed pages are fetched, the document is
 * extracted against a strict JSON schema, the extraction is checked
 * mechanically, and the record publishes at the tier the check earns it.
 *
 * The script is deterministic so the same story plays every time. Swap
 * `SCRIPT` for a websocket and the rest of the application is unchanged —
 * every view here renders from Store state and re-renders on the same events.
 */

const STAGES = [
  { id: "watch", label: "Watch", blurb: "Hash the listing page. Unchanged pages cost nothing." },
  { id: "fetch", label: "Fetch", blurb: "Pull the notification, record the URL, the bytes and the hash." },
  { id: "extract", label: "Extract", blurb: "PDF to a structured record via the Claude API, strict JSON schema." },
  { id: "check", label: "Check", blurb: "Prove the change mechanically against the base text, or route to review." },
  { id: "publish", label: "Publish", blurb: "Live at the tier the check earned. Never silently upgraded." },
];

/* Records that arrive during the session, fully formed. Same schema as the
   seeded register — the pipeline's only job is to produce objects in this shape. */

const INBOUND = [
  {
    id: "cbdt-2026-form3ceb",
    title: "Income-tax (Twenty-first Amendment) Rules, 2026",
    family: "Income tax",
    amends: "Income-tax Rules, 1962 — r.10E, Form 3CEB",
    changeType: "substitution",
    summary:
      "Form 3CEB substituted. The accountant's report on international and specified domestic transactions gains a separate schedule for intra-group financing arrangements.",
    body: "Central Board of Direct Taxes",
    reference: "Notification 112/2026",
    published: "2026-09-08",
    effective: "2026-10-01",
    status: "auto",
    sourceUrl: "https://www.incometax.gov.in/",
    appliesTo: ["Entities with international transactions", "Transfer pricing accountants"],
    pipeline: {
      firstSeen: null,
      provenance: [],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.99, amends: 0.97, changeType: 0.98, effective: 0.98, reference: 0.99 },
        tokens: 11840,
        retries: 0,
      },
      check: {
        name: "Verbatim old-text match",
        result: "pass",
        occurrences: 1,
        detail:
          "The substituted form is quoted in full in the notification and matches the base text at r.10E exactly once. Provable, so it published unattended.",
      },
      diff: {
        cite: "Income-tax Rules, 1962 — Form 3CEB, Part C",
        before: "[Clause 21 — particulars of transactions in the nature of lending or borrowing]",
        after:
          "[Clause 21 substituted — particulars of transactions in the nature of lending, borrowing or guarantee, with a separate schedule for intra-group financing]",
      },
      audit: [],
    },
    _source: "incometax-notifications",
    _doc: "notification-112-2026.pdf",
  },
  {
    id: "rbi-2026-digital-lending",
    title: "Digital Lending Directions — amendment to para 6.2",
    family: "RBI",
    amends: "RBI (Digital Lending) Directions, 2025 — para 6.2",
    changeType: "insertion",
    summary:
      "Key Fact Statement must additionally carry the annualised cost of any bundled insurance, stated separately from the annual percentage rate.",
    body: "Reserve Bank of India",
    reference: "RBI/2026-27/71",
    published: "2026-09-08",
    effective: "2026-12-01",
    status: "auto",
    sourceUrl: "https://www.rbi.org.in/",
    appliesTo: ["Regulated entities running digital lending", "Lending service providers"],
    pipeline: {
      firstSeen: null,
      provenance: [],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.98, amends: 0.96, changeType: 0.97, effective: 0.99, reference: 0.98 },
        tokens: 7320,
        retries: 0,
      },
      check: {
        name: "Insertion anchor match",
        result: "pass",
        occurrences: 1,
        detail: "Anchor clause located once at para 6.2; the new sub-clause number is unoccupied.",
      },
      diff: {
        cite: "RBI (Digital Lending) Directions, 2025 — para 6.2",
        before: "[Key Fact Statement carries the APR and the recovery mechanism]",
        after:
          "(iv) where any insurance product is bundled with the loan, the annualised cost of such product shall be disclosed separately from the APR…",
      },
      audit: [],
    },
    _source: "rbi-notifications",
    _doc: "digital-lending-amendment.html",
  },
  {
    id: "mca-2026-commencement-s230",
    title: "Commencement notification — sections 230 to 232, Companies Act 2013",
    family: "Companies Act",
    amends: "Companies Act, 2013 — ss.230-232",
    changeType: "commencement",
    summary:
      "Central Government appoints the date for the amended compromise and arrangement provisions. Held at auto: which sub-sections this switches on cannot be read off the text.",
    body: "Ministry of Corporate Affairs",
    reference: "S.O. 4021(E)",
    published: "2026-09-08",
    effective: "2026-10-15",
    status: "auto",
    sourceUrl: "https://www.mca.gov.in/",
    appliesTo: ["Companies in a scheme of arrangement", "NCLT practitioners"],
    pipeline: {
      firstSeen: null,
      provenance: [],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.99, amends: 0.99, changeType: 0.99, effective: 0.99, reference: 0.99 },
        tokens: 1980,
        retries: 0,
      },
      check: {
        name: "Commencement hard block",
        result: "blocked",
        occurrences: null,
        detail:
          "Every field scored above 0.98 and the record still cannot promote. Commencement entries never auto-promote past auto, regardless of confidence.",
      },
      diff: {
        cite: "Companies Act, 2013 — ss.230-232",
        before: "[Amended provisions not in force]",
        after: "[In force from 15 October 2026 — sub-section scope unconfirmed]",
      },
      audit: [],
    },
    _source: "mca-notifications",
    _doc: "SO_4021E_2026.pdf",
  },
  {
    id: "cbic-2026-notif-23",
    title: "CGST (Fourth Amendment) Rules, 2026",
    family: "GST",
    amends: "CGST Rules, 2017 — r.88B",
    changeType: "substitution",
    summary:
      "Manner of computing interest on delayed payment revised where the credit ledger carried a sufficient balance through the default period.",
    body: "Central Board of Indirect Taxes and Customs",
    reference: "Notification 23/2026 — Central Tax",
    published: "2026-09-08",
    effective: "2026-10-01",
    status: "auto",
    sourceUrl: "https://www.cbic.gov.in/",
    appliesTo: ["Every registered person paying interest under s.50", "ERP tax engines"],
    pipeline: {
      firstSeen: null,
      provenance: [],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.97, amends: 0.88, changeType: 0.95, effective: 0.96, reference: 0.99 },
        tokens: 9940,
        retries: 1,
      },
      check: {
        name: "Verbatim old-text match",
        result: "fail",
        occurrences: 2,
        detail:
          "The quoted old text occurs twice in the base text — once at r.88B(1) and once in the proviso to r.88B(2). A substitution that could attach to either position is not mechanically provable. Held at auto and routed to review.",
      },
      diff: {
        cite: "CGST Rules, 2017 — r.88B(1)",
        before: "…interest shall be calculated on the portion of tax paid by debiting the electronic cash ledger…",
        after:
          "…interest shall be calculated on the portion of tax paid by debiting the electronic cash ledger, excluding any period during which the electronic credit ledger carried a balance sufficient to discharge the liability…",
      },
      audit: [],
    },
    _source: "cbic-central-tax",
    _doc: "notfn-23-central-tax-2026.pdf",
  },
];

const INBOUND_BY_ID = Object.fromEntries(INBOUND.map((c) => [c.id, c]));

/*
 * The script. Each step fires at `t` seconds of simulated pipeline time.
 * Types:
 *   poll      a watcher ran and the listing was unchanged
 *   detect    listing hash changed — a job opens
 *   stage     a job moves to a stage
 *   land      the job publishes and the record enters the register
 *   promote   an existing record changes tier
 *   alert     dead-man's-switch or operational warning
 */

const SCRIPT = [
  { t: 1, type: "poll", source: "mca-notifications" },
  { t: 2, type: "poll", source: "cbic-central-tax" },
  { t: 3, type: "detect", record: "cbdt-2026-form3ceb" },
  { t: 4, type: "stage", record: "cbdt-2026-form3ceb", stage: "fetch" },
  { t: 5, type: "poll", source: "sebi-legal" },
  { t: 6, type: "stage", record: "cbdt-2026-form3ceb", stage: "extract" },
  { t: 8, type: "stage", record: "cbdt-2026-form3ceb", stage: "check" },
  { t: 9, type: "land", record: "cbdt-2026-form3ceb" },
  { t: 11, type: "poll", source: "rbi-notifications" },
  { t: 12, type: "promote", record: "sebi-2026-icdr-rights", to: "verified", by: "R. Menon" },
  { t: 13, type: "detect", record: "cbic-2026-notif-23" },
  { t: 14, type: "stage", record: "cbic-2026-notif-23", stage: "fetch" },
  { t: 15, type: "poll", source: "labour-gsr" },
  { t: 16, type: "stage", record: "cbic-2026-notif-23", stage: "extract" },
  { t: 19, type: "stage", record: "cbic-2026-notif-23", stage: "check" },
  { t: 20, type: "land", record: "cbic-2026-notif-23" },
  { t: 22, type: "alert", level: "warn", text: "EPFO circulars: 21 days without a result against a 7-day expected gap. Dead-man's-switch fired — the parser is the suspect, not the ministry." },
  { t: 24, type: "poll", source: "incometax-notifications" },
  { t: 25, type: "detect", record: "rbi-2026-digital-lending" },
  { t: 26, type: "stage", record: "rbi-2026-digital-lending", stage: "fetch" },
  { t: 27, type: "stage", record: "rbi-2026-digital-lending", stage: "extract" },
  { t: 29, type: "stage", record: "rbi-2026-digital-lending", stage: "check" },
  { t: 30, type: "land", record: "rbi-2026-digital-lending" },
  { t: 32, type: "poll", source: "egazette-weekly" },
  { t: 33, type: "promote", record: "sebi-2026-lodr-amd", to: "reconciled", by: "reconciler", note: "Gazette copy arrived and matched field-for-field. The failed base-text check was our stale baseline, not the extraction." },
  { t: 35, type: "detect", record: "mca-2026-commencement-s230" },
  { t: 36, type: "stage", record: "mca-2026-commencement-s230", stage: "fetch" },
  { t: 37, type: "stage", record: "mca-2026-commencement-s230", stage: "extract" },
  { t: 38, type: "stage", record: "mca-2026-commencement-s230", stage: "check" },
  { t: 39, type: "land", record: "mca-2026-commencement-s230" },
  { t: 42, type: "poll", source: "mca-notifications" },
  { t: 44, type: "promote", record: "cbdt-2026-tds-194q", to: "verified", by: "A. Iyer" },
  { t: 46, type: "poll", source: "cbic-central-tax" },
  { t: 48, type: "promote", record: "cbdt-2026-form3ceb", to: "reconciled", by: "reconciler", note: "Gazette Part II §3(ii) carried an identical record." },
];

const SCRIPT_END = 52;

/* ------------------------------------------------------------------ */

const Store = {
  changes: CHANGES.map((c) => ({ ...c })),
  jobs: [],            /* live jobs moving through the stages */
  events: [],          /* newest first */
  clock: 0,            /* simulated seconds */
  running: true,
  speed: 1,
  cursor: 0,
  newSincePageLoad: new Set(),
  counters: { polls: 0, detected: 0, published: 0, promoted: 0, held: 0 },
  listeners: [],

  on(fn) { this.listeners.push(fn); },
  emit(what) { this.listeners.forEach((fn) => fn(what)); },

  byId(id) { return this.changes.find((c) => c.id === id); },

  log(entry) {
    this.events.unshift({ ...entry, clock: this.clock, wall: wallClock(this.clock) });
    if (this.events.length > 160) this.events.pop();
  },
};

const START_WALL = new Date("2026-09-08T11:20:00+05:30").getTime();

function wallClock(simSeconds) {
  /* one simulated second is one wall minute, so a session covers a working morning */
  return new Date(START_WALL + simSeconds * 60000);
}

function jobFor(id) {
  return Store.jobs.find((j) => j.id === id);
}

function step(event) {
  const stamp = wallClock(Store.clock);

  if (event.type === "poll") {
    const src = SOURCE_BY_ID[event.source];
    src.lastCheckMin = 0;
    Store.counters.polls += 1;
    Store.log({
      kind: "poll",
      source: src.id,
      text: `${src.name} — listing hash unchanged (${src.listingHash})`,
    });
    Store.emit("sources");
    return;
  }

  if (event.type === "detect") {
    const rec = INBOUND_BY_ID[event.record];
    const src = SOURCE_BY_ID[rec._source];
    src.lastCheckMin = 0;
    src.lastChangeHours = 0;
    Store.counters.detected += 1;
    Store.jobs.unshift({
      id: rec.id,
      title: rec.title,
      body: rec.body,
      changeType: rec.changeType,
      source: rec._source,
      doc: rec._doc,
      stage: "watch",
      startedAt: stamp,
      log: [{ stage: "watch", text: `Listing hash moved ${src.listingHash} → ${randomHash()}` }],
    });
    Store.log({
      kind: "detect",
      source: src.id,
      text: `${src.name} — listing changed, new document: ${rec._doc}`,
    });
    Store.emit("pipeline");
    return;
  }

  if (event.type === "stage") {
    const job = jobFor(event.record);
    const rec = INBOUND_BY_ID[event.record];
    if (!job) return;
    job.stage = event.stage;
    job.log.push({ stage: event.stage, text: stageNote(event.stage, rec) });
    Store.log({ kind: "stage", record: rec.id, text: `${rec.reference} — ${stageNote(event.stage, rec)}` });
    Store.emit("pipeline");
    return;
  }

  if (event.type === "land") {
    const rec = INBOUND_BY_ID[event.record];
    const src = SOURCE_BY_ID[rec._source];
    const job = jobFor(event.record);
    if (job) {
      job.stage = "publish";
      job.log.push({ stage: "publish", text: "Published as auto, unchecked" });
      job.done = true;
      job.finishedAt = stamp;
    }
    const landed = JSON.parse(JSON.stringify(rec));
    delete landed._source;
    delete landed._doc;
    landed.pipeline.firstSeen = stamp.toISOString();
    landed.pipeline.provenance = [
      { source: src.id, at: stamp.toISOString(), hash: `sha256:${randomHash()}…`, doc: rec._doc, pages: null },
    ];
    landed.pipeline.audit = [
      { at: stamp.toISOString(), actor: "watcher", action: `Listing hash changed on ${src.name}` },
      { at: stamp.toISOString(), actor: "extractor", action: `Extracted against ${rec.pipeline.extraction.schema}, ${rec.pipeline.extraction.retries} retries` },
      {
        at: stamp.toISOString(),
        actor: "checker",
        action:
          rec.pipeline.check.result === "pass"
            ? "Mechanical check PASSED — publishable unattended"
            : rec.pipeline.check.result === "blocked"
            ? "Commencement hard block — auto-promotion refused"
            : "Mechanical check FAILED — routed to review",
      },
      { at: stamp.toISOString(), actor: "publisher", action: "Live as auto, unchecked" },
    ];
    Store.changes.unshift(landed);
    Store.newSincePageLoad.add(landed.id);
    Store.counters.published += 1;
    if (rec.pipeline.check.result !== "pass") Store.counters.held += 1;
    Store.log({
      kind: rec.pipeline.check.result === "pass" ? "publish" : "hold",
      record: rec.id,
      text: `${rec.reference} published as auto${
        rec.pipeline.check.result === "pass" ? "" : " and routed to review"
      } — ${rec.title}`,
    });
    Store.emit("register");
    Store.emit("pipeline");
    return;
  }

  if (event.type === "promote") {
    const rec = Store.byId(event.record);
    if (!rec) return;
    const from = rec.status;
    rec.status = event.to;
    rec.pipeline.audit = rec.pipeline.audit.concat([
      {
        at: stamp.toISOString(),
        actor: event.by,
        action:
          event.to === "verified"
            ? "Read against the source document, cleared → verified"
            : "Second independent source matched field-for-field → reconciled",
      },
    ]);
    if (event.note) rec.pipeline.check.detail += " " + event.note;
    Store.counters.promoted += 1;
    Store.newSincePageLoad.add(rec.id);
    Store.log({
      kind: "promote",
      record: rec.id,
      text: `${rec.reference} ${from} → ${event.to} (${event.by})`,
    });
    Store.emit("register");
    return;
  }

  if (event.type === "alert") {
    Store.log({ kind: "alert", text: event.text });
    Store.emit("sources");
    return;
  }
}

function stageNote(stage, rec) {
  switch (stage) {
    case "fetch":
      return `Fetched ${rec._doc}, hash recorded, robots.txt honoured`;
    case "extract":
      return `Claude API — ${rec.pipeline.extraction.schema}, ${rec.pipeline.extraction.tokens.toLocaleString(
        "en-IN"
      )} tokens, ${rec.pipeline.extraction.retries} retries`;
    case "check":
      return rec.pipeline.check.result === "pass"
        ? `${rec.pipeline.check.name}: pass (${rec.pipeline.check.occurrences} occurrence)`
        : rec.pipeline.check.result === "blocked"
        ? `${rec.pipeline.check.name}: auto-promotion refused for this changeType`
        : `${rec.pipeline.check.name}: fail (${rec.pipeline.check.occurrences} occurrences) → review`;
    default:
      return stage;
  }
}

function randomHash() {
  return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */

let timer = null;

function tick() {
  if (!Store.running) return;
  Store.clock += 1;

  SOURCES.forEach((s) => {
    s.lastCheckMin += 1;
  });

  while (Store.cursor < SCRIPT.length && SCRIPT[Store.cursor].t <= Store.clock) {
    step(SCRIPT[Store.cursor]);
    Store.cursor += 1;
  }

  /* jobs that finished a while back drop off the board */
  Store.jobs = Store.jobs.filter((j) => !j.done || Store.clock - (j.doneAt || (j.doneAt = Store.clock)) < 6);

  if (Store.clock >= SCRIPT_END) resetRun();

  Store.emit("clock");
}

/* The scripted morning loops. Rewind cleanly rather than landing the same
   record twice — a register that duplicates entries on a replay would be
   lying about the very thing this page is for. */
function resetRun() {
  Store.clock = 0;
  Store.cursor = 0;
  Store.jobs = [];
  Store.changes = CHANGES.map((c) => JSON.parse(JSON.stringify(c)));
  Store.newSincePageLoad.clear();
  Store.counters = { polls: 0, detected: 0, published: 0, promoted: 0, held: 0 };
  Store.log({ kind: "poll", text: "Replaying the morning from 11:20 — the register rewinds with it." });
  Store.emit("register");
  Store.emit("pipeline");
}

function schedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 2200 / Store.speed);
}

Store.setSpeed = function (speed) {
  this.speed = speed;
  schedule();
  this.emit("clock");
};

Store.toggle = function () {
  this.running = !this.running;
  this.emit("clock");
};

schedule();

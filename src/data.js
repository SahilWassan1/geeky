/*
 * Compliance Wiki — working data layer.
 *
 * Everything the front end can show is defined here, because everything here
 * is something the ingestion pipeline must be able to produce. Treat this file
 * as the working schema until it moves into a real database with version
 * history (README, next steps §7).
 *
 * status:
 *   "auto"        machine-extracted, nobody has checked it. Published immediately.
 *   "reconciled"  two independent sources produced an identical record.
 *   "verified"    a human cleared it.
 *
 * changeType decides which automated rules may apply, and which entries are
 * force-routed to a reviewer regardless of confidence.
 */

const FAMILIES = [
  "Companies Act",
  "GST",
  "Income tax",
  "SEBI",
  "Labour",
  "RBI",
];

/* ------------------------------------------------------------------ *
 * Source registry — one entry per watched source (README next steps §2)
 * ------------------------------------------------------------------ */

const SOURCES = [
  {
    id: "egazette-weekly",
    name: "Gazette of India — Weekly Part II §3(i)",
    body: "Department of Publication",
    url: "https://egazette.gov.in/",
    tier: "authority",
    cadence: 30,
    parser: "gazette-pdf-v4",
    expectedGapHours: 72,
    lastCheckMin: 4,
    lastChangeHours: 19,
    listingHash: "b41c9e07",
    health: "healthy",
    note: "Authoritative text. Slow to appear, never wrong.",
  },
  {
    id: "mca-notifications",
    name: "MCA — Notifications & circulars",
    body: "Ministry of Corporate Affairs",
    url: "https://www.mca.gov.in/content/mca/global/en/notifications-tender/notifications.html",
    tier: "speed",
    cadence: 15,
    parser: "mca-listing-v2",
    expectedGapHours: 96,
    lastCheckMin: 2,
    lastChangeHours: 6,
    listingHash: "7f30ad12",
    health: "healthy",
    note: "First to publish. Reconciled against the gazette before promotion.",
  },
  {
    id: "cbic-central-tax",
    name: "CBIC — Central Tax notifications",
    body: "Central Board of Indirect Taxes and Customs",
    url: "https://www.cbic.gov.in/entities/cbic-content-mst/",
    tier: "speed",
    cadence: 15,
    parser: "cbic-listing-v3",
    expectedGapHours: 120,
    lastCheckMin: 1,
    lastChangeHours: 142,
    listingHash: "0ce88b55",
    health: "healthy",
    note: "Numbered series. Gaps in numbering are a reliable missed-fetch signal.",
  },
  {
    id: "sebi-legal",
    name: "SEBI — Legal / regulations",
    body: "Securities and Exchange Board of India",
    url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=6",
    tier: "speed",
    cadence: 20,
    parser: "sebi-legal-v2",
    expectedGapHours: 96,
    lastCheckMin: 7,
    lastChangeHours: 31,
    listingHash: "aa19f2b6",
    health: "healthy",
    note: "",
  },
  {
    id: "incometax-notifications",
    name: "Income Tax — Notifications",
    body: "Central Board of Direct Taxes",
    url: "https://www.incometax.gov.in/iec/foportal/latest-news",
    tier: "speed",
    cadence: 30,
    parser: "cbdt-listing-v1",
    expectedGapHours: 120,
    lastCheckMin: 12,
    lastChangeHours: 88,
    listingHash: "31d7c904",
    health: "healthy",
    note: "",
  },
  {
    id: "rbi-notifications",
    name: "RBI — Notifications & master directions",
    body: "Reserve Bank of India",
    url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
    tier: "speed",
    cadence: 15,
    parser: "rbi-notif-v5",
    expectedGapHours: 48,
    lastCheckMin: 3,
    lastChangeHours: 27,
    listingHash: "5b0a7731",
    health: "healthy",
    note: "Master directions are re-issued in place. Diffed against the last capture.",
  },
  {
    id: "labour-gsr",
    name: "Ministry of Labour — G.S.R. notifications",
    body: "Ministry of Labour and Employment",
    url: "https://labour.gov.in/whatsnew",
    tier: "speed",
    cadence: 60,
    parser: "labour-listing-v1",
    expectedGapHours: 168,
    lastCheckMin: 22,
    lastChangeHours: 210,
    listingHash: "c7741ae9",
    health: "slow",
    note: "Listing markup changed twice in a year. Parser is the fragile one.",
  },
  {
    id: "indiacode-baseline",
    name: "India Code — consolidated base text",
    body: "Legislative Department",
    url: "https://www.indiacode.nic.in/",
    tier: "baseline",
    cadence: 1440,
    parser: "indiacode-section-v2",
    expectedGapHours: 720,
    lastCheckMin: 96,
    lastChangeHours: 400,
    listingHash: "e2f10b8d",
    health: "healthy",
    note: "Not a change feed. This is the base text every substitution is checked against.",
  },
  {
    id: "epfo-circulars",
    name: "EPFO — Circulars",
    body: "Employees' Provident Fund Organisation",
    url: "https://www.epfindia.gov.in/site_en/Circulars.php",
    tier: "speed",
    cadence: 120,
    parser: "epfo-listing-v1",
    expectedGapHours: 168,
    lastCheckMin: 41,
    lastChangeHours: 512,
    listingHash: "9a02cc41",
    health: "silent",
    note: "Zero results for 21 days against a 7-day expected gap, since 2026-09-07. Treat the EPFO column as stale until a human confirms the parser is still reading the page.",
  },
];

const SOURCE_TOTAL = 42; /* full registry; nine shown here */

/* ------------------------------------------------------------------ *
 * Golden dataset scoring (README next steps §1)
 * Auto-publish is enabled per changeType only above 99%.
 * ------------------------------------------------------------------ */

const GOLDEN = [
  {
    changeType: "substitution",
    n: 61,
    accuracy: 0.993,
    gate: 0.99,
    autoPublish: true,
    lastRun: "2026-09-06",
    failNote: "Two failures, both scanned pages older than 2011.",
  },
  {
    changeType: "insertion",
    n: 48,
    accuracy: 0.996,
    gate: 0.99,
    autoPublish: true,
    lastRun: "2026-09-06",
    failNote: "One failure: sub-rule numbering read as a footnote marker.",
  },
  {
    changeType: "omission",
    n: 33,
    accuracy: 1.0,
    gate: 0.99,
    autoPublish: true,
    lastRun: "2026-09-06",
    failNote: "No failures. Omissions are the easiest class to extract.",
  },
  {
    changeType: "supersession",
    n: 24,
    accuracy: 0.958,
    gate: 0.99,
    autoPublish: false,
    lastRun: "2026-09-06",
    failNote:
      "Below gate. The model under-reports which allied rule sets a supersession sweeps up. Every supersession routes to review.",
  },
  {
    changeType: "commencement",
    n: 34,
    accuracy: 0.882,
    gate: 0.99,
    autoPublish: false,
    lastRun: "2026-09-06",
    failNote:
      "Hard-blocked regardless of score. Commencement scope in Indian law cannot be determined mechanically — sections are brought into force in tranches years apart.",
  },
];

/* ------------------------------------------------------------------ *
 * The register.
 *
 * Public fields are the twelve in the README. Everything under `pipeline`
 * is the audit surface: where the record came from, what the extractor
 * produced, whether the mechanical check passed, and who touched it.
 * ------------------------------------------------------------------ */

const CHANGES = [
  {
    id: "mca-2026-gsr-612e",
    title: "Companies (CSR Policy) Amendment Rules, 2026",
    family: "Companies Act",
    amends: "Companies Act, 2013 — s.135, r.4(1)",
    changeType: "substitution",
    summary:
      "Impact assessment threshold revised. Companies with average CSR obligation above the prescribed limit must now commission an independent assessment for projects crossing the revised outlay.",
    body: "Ministry of Corporate Affairs",
    reference: "G.S.R. 612(E)",
    published: "2026-09-02",
    effective: "2026-10-01",
    status: "verified",
    sourceUrl: "https://www.mca.gov.in/",
    appliesTo: ["Every company crossing the s.135 CSR trigger", "CSR committees", "Statutory auditors"],
    pipeline: {
      firstSeen: "2026-09-02T09:14:00+05:30",
      provenance: [
        { source: "mca-notifications", at: "2026-09-02T09:14:00+05:30", hash: "sha256:7f30ad12…", doc: "GSR_612E_2026.pdf", pages: 3 },
        { source: "egazette-weekly", at: "2026-09-03T06:40:00+05:30", hash: "sha256:b41c9e07…", doc: "Part II §3(i) 02-09-2026", pages: 3 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.99, amends: 0.98, changeType: 0.99, effective: 0.97, reference: 0.99 },
        tokens: 8420,
        retries: 0,
      },
      check: {
        name: "Verbatim old-text match",
        result: "pass",
        occurrences: 1,
        detail:
          "The old text quoted by the amendment appears exactly once at r.4(1) of the base text on India Code as it stood on 2026-09-01. The change is mechanically provable.",
      },
      diff: {
        cite: "Companies (CSR Policy) Rules, 2014 — r.4(1)",
        before:
          "…every company having average CSR obligation of ten crore rupees or more in the three immediately preceding financial years shall undertake impact assessment for projects having outlays of one crore rupees or more…",
        after:
          "…every company having average CSR obligation of five crore rupees or more in the three immediately preceding financial years shall undertake impact assessment for projects having outlays of fifty lakh rupees or more…",
      },
      audit: [
        { at: "2026-09-02T09:14:00+05:30", actor: "watcher", action: "Listing hash changed on MCA notifications" },
        { at: "2026-09-02T09:15:00+05:30", actor: "extractor", action: "Record extracted from PDF, published as auto" },
        { at: "2026-09-03T06:41:00+05:30", actor: "reconciler", action: "Gazette copy matched field-for-field → reconciled" },
        { at: "2026-09-03T11:02:00+05:30", actor: "R. Menon", action: "Read against the gazette PDF, cleared → verified" },
      ],
    },
  },
  {
    id: "cbic-2026-notif-19",
    title: "CGST (Third Amendment) Rules, 2026",
    family: "GST",
    amends: "Central Goods and Services Tax Rules, 2017 — r.36(4)",
    changeType: "omission",
    summary:
      "Rule 36(4) omitted. Provisional input tax credit restriction on invoices not reflected in GSTR-2B is withdrawn.",
    body: "Central Board of Indirect Taxes and Customs",
    reference: "Notification 19/2026 — Central Tax",
    published: "2026-09-02",
    effective: "2026-09-15",
    status: "reconciled",
    sourceUrl: "https://www.cbic.gov.in/",
    appliesTo: ["Every registered person claiming ITC", "GST practitioners", "ERP tax engines"],
    pipeline: {
      firstSeen: "2026-09-02T17:31:00+05:30",
      provenance: [
        { source: "cbic-central-tax", at: "2026-09-02T17:31:00+05:30", hash: "sha256:0ce88b55…", doc: "notfn-19-central-tax-2026.pdf", pages: 2 },
        { source: "egazette-weekly", at: "2026-09-03T06:40:00+05:30", hash: "sha256:b41c9e07…", doc: "Part II §3(i) 02-09-2026", pages: 2 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.99, amends: 0.99, changeType: 1.0, effective: 0.98, reference: 0.99 },
        tokens: 5110,
        retries: 0,
      },
      check: {
        name: "Verbatim old-text match",
        result: "pass",
        occurrences: 1,
        detail:
          "Rule 36(4) exists exactly once in the base text at the cited position, so the omission is unambiguous.",
      },
      diff: {
        cite: "CGST Rules, 2017 — r.36(4)",
        before:
          "Input tax credit to be availed by a registered person in respect of invoices or debit notes, the details of which have not been furnished by the suppliers under sub-section (1) of section 37, shall not exceed 5 per cent of the eligible credit…",
        after: "[Omitted]",
      },
      audit: [
        { at: "2026-09-02T17:31:00+05:30", actor: "watcher", action: "New notification number in CBIC series" },
        { at: "2026-09-02T17:33:00+05:30", actor: "extractor", action: "Record extracted, published as auto" },
        { at: "2026-09-03T06:41:00+05:30", actor: "reconciler", action: "Gazette copy matched field-for-field → reconciled" },
        { at: "2026-09-03T06:41:00+05:30", actor: "queue", action: "Queued for human verification (position 2)" },
      ],
    },
  },
  {
    id: "sebi-2026-lodr-amd",
    title: "SEBI (LODR) Amendment Regulations, 2026",
    family: "SEBI",
    amends: "SEBI (LODR) Regulations, 2015 — reg.30",
    changeType: "substitution",
    summary:
      "Disclosure timelines for material events shortened. Machine-extracted from the gazette PDF — open the source before relying on the dates.",
    body: "Securities and Exchange Board of India",
    reference: "No. SEBI/LAD-NRO/GN/2026/241",
    published: "2026-09-01",
    effective: "2026-11-01",
    status: "auto",
    sourceUrl: "https://www.sebi.gov.in/",
    appliesTo: ["Listed entities", "Company secretaries", "Compliance officers under reg.6"],
    pipeline: {
      firstSeen: "2026-09-01T20:07:00+05:30",
      provenance: [
        { source: "sebi-legal", at: "2026-09-01T20:07:00+05:30", hash: "sha256:aa19f2b6…", doc: "lodr-amendment-2026.pdf", pages: 11 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.97, amends: 0.94, changeType: 0.96, effective: 0.71, reference: 0.98 },
        tokens: 21980,
        retries: 1,
      },
      check: {
        name: "Verbatim old-text match",
        result: "fail",
        occurrences: 0,
        detail:
          "The old text quoted in the amendment could not be located verbatim at reg.30 of the captured base text. The base capture predates an earlier 2026 amendment, so the mismatch may be in our baseline rather than in the extraction. Routed to review; stays labelled unchecked until a human clears it.",
      },
      diff: {
        cite: "SEBI (LODR) Regulations, 2015 — reg.30(6)",
        before:
          "…shall first disclose to stock exchange(s) all events or information which are material… as soon as reasonably possible and not later than twenty four hours from the occurrence of the event or information…",
        after:
          "…as soon as reasonably possible and not later than twelve hours from the occurrence of the event or information, and where the event emanates from a decision of the board of directors, not later than thirty minutes from the closure of the meeting…",
      },
      audit: [
        { at: "2026-09-01T20:07:00+05:30", actor: "watcher", action: "New item on SEBI legal listing" },
        { at: "2026-09-01T20:11:00+05:30", actor: "extractor", action: "Extraction retried once on schema violation, then passed" },
        { at: "2026-09-01T20:12:00+05:30", actor: "checker", action: "Verbatim old-text check FAILED → held at auto, routed to review" },
        { at: "2026-09-01T20:12:00+05:30", actor: "queue", action: "Queued for human verification (position 1)" },
      ],
    },
  },
  {
    id: "mol-2026-ss-rules",
    title: "Social Security (Central) Rules, 2026",
    family: "Labour",
    amends: "Code on Social Security, 2020",
    changeType: "supersession",
    summary:
      "Supersedes the Employee's Compensation Rules and several allied rule sets. Individual chapters are being brought into force in tranches, so check the commencement column before applying any provision.",
    body: "Ministry of Labour and Employment",
    reference: "G.S.R. 588(E)",
    published: "2026-08-30",
    effective: "Notified in tranches",
    status: "verified",
    sourceUrl: "https://labour.gov.in/",
    appliesTo: ["Establishments under the Social Security Code", "Payroll operators", "EPFO/ESIC filers"],
    pipeline: {
      firstSeen: "2026-08-30T13:02:00+05:30",
      provenance: [
        { source: "labour-gsr", at: "2026-08-30T13:02:00+05:30", hash: "sha256:c7741ae9…", doc: "GSR_588E_2026.pdf", pages: 74 },
        { source: "egazette-weekly", at: "2026-08-31T06:40:00+05:30", hash: "sha256:b41c9e07…", doc: "Part II §3(i) 30-08-2026", pages: 74 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.98, amends: 0.9, changeType: 0.93, effective: 0.4, reference: 0.99 },
        tokens: 96400,
        retries: 0,
      },
      check: {
        name: "Supersession sweep",
        result: "review",
        occurrences: null,
        detail:
          "Supersession scores 95.8% on the golden set, below the 99% gate. Auto-publish is disabled for this class: the extractor under-reports which allied rule sets are swept up. A reviewer listed the superseded sets by hand.",
      },
      diff: {
        cite: "Employee's Compensation Rules, 1924 — whole",
        before: "[Rule set in force]",
        after:
          "[Superseded, save as respects things done or omitted to be done before such supersession]",
      },
      audit: [
        { at: "2026-08-30T13:02:00+05:30", actor: "watcher", action: "New G.S.R. on labour.gov.in" },
        { at: "2026-08-30T13:20:00+05:30", actor: "extractor", action: "74-page extraction, published as auto" },
        { at: "2026-08-30T13:20:00+05:30", actor: "gate", action: "changeType supersession below accuracy gate → auto-promotion blocked" },
        { at: "2026-08-31T10:44:00+05:30", actor: "A. Iyer", action: "Superseded rule sets enumerated by hand; commencement left as tranches → verified" },
      ],
    },
  },
  {
    id: "mca-2026-dir3-kyc",
    title: "Companies (Appointment and Qualification of Directors) Amendment Rules, 2026",
    family: "Companies Act",
    amends: "Companies Act, 2013 — r.12A",
    changeType: "substitution",
    summary:
      "DIR-3 KYC filing window moved. Annual verification for directors holding a DIN as on 31 March now falls due on 30 September.",
    body: "Ministry of Corporate Affairs",
    reference: "G.S.R. 574(E)",
    published: "2026-08-27",
    effective: "2026-08-27",
    status: "verified",
    sourceUrl: "https://www.mca.gov.in/",
    appliesTo: ["Every DIN holder", "Company secretaries", "Directors' KYC filers"],
    pipeline: {
      firstSeen: "2026-08-27T11:26:00+05:30",
      provenance: [
        { source: "mca-notifications", at: "2026-08-27T11:26:00+05:30", hash: "sha256:7f30ad12…", doc: "GSR_574E_2026.pdf", pages: 2 },
        { source: "egazette-weekly", at: "2026-08-28T06:40:00+05:30", hash: "sha256:b41c9e07…", doc: "Part II §3(i) 27-08-2026", pages: 2 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.99, amends: 0.99, changeType: 0.99, effective: 0.99, reference: 0.99 },
        tokens: 4380,
        retries: 0,
      },
      check: {
        name: "Verbatim old-text match",
        result: "pass",
        occurrences: 1,
        detail: "Old date string located once at r.12A. Substitution provable without a reviewer.",
      },
      diff: {
        cite: "Companies (Appointment and Qualification of Directors) Rules, 2014 — r.12A",
        before: "…shall submit e-form DIR-3-KYC … on or before 30th day of April of the immediate next financial year.",
        after: "…shall submit e-form DIR-3-KYC … on or before 30th day of September of the immediate next financial year.",
      },
      audit: [
        { at: "2026-08-27T11:26:00+05:30", actor: "watcher", action: "Listing hash changed on MCA notifications" },
        { at: "2026-08-27T11:27:00+05:30", actor: "extractor", action: "Record extracted, published as auto" },
        { at: "2026-08-28T06:41:00+05:30", actor: "reconciler", action: "Gazette copy matched field-for-field → reconciled" },
        { at: "2026-08-28T09:15:00+05:30", actor: "R. Menon", action: "Cleared → verified" },
      ],
    },
  },
  {
    id: "cbdt-2026-tds-194q",
    title: "Income-tax (Nineteenth Amendment) Rules, 2026",
    family: "Income tax",
    amends: "Income-tax Rules, 1962 — r.31A",
    changeType: "insertion",
    summary:
      "New reporting sub-rule inserted for quarterly TDS statements covering section 194Q transactions above the revised turnover threshold.",
    body: "Central Board of Direct Taxes",
    reference: "Notification 104/2026",
    published: "2026-08-25",
    effective: "2026-10-01",
    status: "reconciled",
    sourceUrl: "https://www.incometax.gov.in/",
    appliesTo: ["Buyers liable to deduct under s.194Q", "TDS return preparers"],
    pipeline: {
      firstSeen: "2026-08-25T15:48:00+05:30",
      provenance: [
        { source: "incometax-notifications", at: "2026-08-25T15:48:00+05:30", hash: "sha256:31d7c904…", doc: "notification-104-2026.pdf", pages: 4 },
        { source: "egazette-weekly", at: "2026-08-26T06:40:00+05:30", hash: "sha256:b41c9e07…", doc: "Part II §3(ii) 25-08-2026", pages: 4 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.98, amends: 0.97, changeType: 0.99, effective: 0.96, reference: 0.99 },
        tokens: 9260,
        retries: 0,
      },
      check: {
        name: "Insertion anchor match",
        result: "pass",
        occurrences: 1,
        detail:
          "The anchor sub-rule the insertion attaches after exists once at r.31A, and no sub-rule already occupies the new number.",
      },
      diff: {
        cite: "Income-tax Rules, 1962 — r.31A(4)",
        before: "[No sub-rule (4B)]",
        after:
          "(4B) The person responsible for paying any sum under section 194Q shall furnish, in the quarterly statement, particulars of every buyer-supplier pair where aggregate consideration exceeds the prescribed threshold…",
      },
      audit: [
        { at: "2026-08-25T15:48:00+05:30", actor: "watcher", action: "New notification on the CBDT feed" },
        { at: "2026-08-25T15:50:00+05:30", actor: "extractor", action: "Record extracted, published as auto" },
        { at: "2026-08-26T06:41:00+05:30", actor: "reconciler", action: "Gazette copy matched field-for-field → reconciled" },
        { at: "2026-08-26T06:41:00+05:30", actor: "queue", action: "Queued for human verification (position 4)" },
      ],
    },
  },
  {
    id: "mca-2026-commencement-s129a",
    title: "Commencement notification — section 129A, Companies Act 2013",
    family: "Companies Act",
    amends: "Companies Act, 2013 — s.129A",
    changeType: "commencement",
    summary:
      "Central Government appoints the date on which section 129A comes into force. Routed to a reviewer because commencement scope cannot be determined mechanically.",
    body: "Ministry of Corporate Affairs",
    reference: "S.O. 3914(E)",
    published: "2026-08-21",
    effective: "2026-09-01",
    status: "auto",
    sourceUrl: "https://www.mca.gov.in/",
    appliesTo: ["Prescribed classes of unlisted companies", "Audit committees"],
    pipeline: {
      firstSeen: "2026-08-21T18:12:00+05:30",
      provenance: [
        { source: "mca-notifications", at: "2026-08-21T18:12:00+05:30", hash: "sha256:7f30ad12…", doc: "SO_3914E_2026.pdf", pages: 1 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.99, amends: 0.98, changeType: 0.99, effective: 0.99, reference: 0.99 },
        tokens: 1720,
        retries: 0,
      },
      check: {
        name: "Commencement hard block",
        result: "blocked",
        occurrences: null,
        detail:
          "Confidence is high on every field and it does not matter. Commencement entries never auto-promote past auto. Sections of an act are routinely brought into force in tranches years apart, and which sub-provisions this notification actually switches on cannot be read off the text.",
      },
      diff: {
        cite: "Companies Act, 2013 — s.129A",
        before: "[Not in force]",
        after: "[In force from 1 September 2026 — scope unconfirmed]",
      },
      audit: [
        { at: "2026-08-21T18:12:00+05:30", actor: "watcher", action: "New S.O. on MCA notifications" },
        { at: "2026-08-21T18:13:00+05:30", actor: "extractor", action: "Record extracted, published as auto" },
        { at: "2026-08-21T18:13:00+05:30", actor: "gate", action: "changeType commencement → auto-promotion permanently blocked" },
        { at: "2026-08-21T18:13:00+05:30", actor: "queue", action: "Queued for human verification (position 3)" },
      ],
    },
  },
  {
    id: "rbi-2026-kyc-master",
    title: "Master Direction — Know Your Customer, 2026 update",
    family: "RBI",
    amends: "Master Direction DBR.AML.BC.No.81/14.01.001/2015-16",
    changeType: "substitution",
    summary:
      "Periodic KYC updation intervals revised for low-risk customers, with a corresponding change to the record retention clause.",
    body: "Reserve Bank of India",
    reference: "RBI/2026-27/64",
    published: "2026-08-19",
    effective: "2026-08-19",
    status: "verified",
    sourceUrl: "https://www.rbi.org.in/",
    appliesTo: ["Regulated entities under the KYC Directions", "Bank compliance functions", "NBFC onboarding teams"],
    pipeline: {
      firstSeen: "2026-08-19T10:03:00+05:30",
      provenance: [
        { source: "rbi-notifications", at: "2026-08-19T10:03:00+05:30", hash: "sha256:5b0a7731…", doc: "master-direction-kyc.html", pages: null },
        { source: "rbi-notifications", at: "2026-08-19T10:03:00+05:30", hash: "sha256:5b0a7732…", doc: "prior capture 2026-05-02 (diff base)", pages: null },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.96, amends: 0.95, changeType: 0.94, effective: 0.99, reference: 0.98 },
        tokens: 43110,
        retries: 0,
      },
      check: {
        name: "In-place re-issue diff",
        result: "pass",
        occurrences: 2,
        detail:
          "Master directions are re-published at the same URL rather than amended by a separate instrument. Two clauses differ from the 2026-05-02 capture; both were extracted as substitutions and both located verbatim in the prior capture.",
      },
      diff: {
        cite: "Master Direction — KYC, para 38",
        before: "…periodic updation shall be carried out at least once in every ten years for low risk customers…",
        after: "…periodic updation shall be carried out at least once in every eight years for low risk customers…",
      },
      audit: [
        { at: "2026-08-19T10:03:00+05:30", actor: "watcher", action: "Page hash changed at a stable URL — re-issue detected" },
        { at: "2026-08-19T10:05:00+05:30", actor: "extractor", action: "Diffed against prior capture, two substitutions extracted" },
        { at: "2026-08-19T10:05:00+05:30", actor: "checker", action: "Both old texts located verbatim in prior capture → pass" },
        { at: "2026-08-20T14:30:00+05:30", actor: "A. Iyer", action: "Cleared → verified" },
      ],
    },
  },
  {
    id: "cbic-2026-gstr9-relax",
    title: "Annual return filing relaxation for FY 2025-26",
    family: "GST",
    amends: "CGST Rules, 2017 — r.80",
    changeType: "substitution",
    summary:
      "Registered persons below the prescribed aggregate turnover are exempted from filing the reconciliation statement in GSTR-9C for the financial year.",
    body: "Central Board of Indirect Taxes and Customs",
    reference: "Notification 17/2026 — Central Tax",
    published: "2026-08-14",
    effective: "2026-08-14",
    status: "verified",
    sourceUrl: "https://www.cbic.gov.in/",
    appliesTo: ["Registered persons below the turnover threshold", "GST auditors"],
    pipeline: {
      firstSeen: "2026-08-14T16:20:00+05:30",
      provenance: [
        { source: "cbic-central-tax", at: "2026-08-14T16:20:00+05:30", hash: "sha256:0ce88b55…", doc: "notfn-17-central-tax-2026.pdf", pages: 2 },
        { source: "egazette-weekly", at: "2026-08-15T06:40:00+05:30", hash: "sha256:b41c9e07…", doc: "Part II §3(i) 14-08-2026", pages: 2 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.98, amends: 0.98, changeType: 0.97, effective: 0.99, reference: 0.99 },
        tokens: 5240,
        retries: 0,
      },
      check: {
        name: "Verbatim old-text match",
        result: "pass",
        occurrences: 1,
        detail: "Proviso text located once at r.80(3).",
      },
      diff: {
        cite: "CGST Rules, 2017 — r.80(3), proviso",
        before: "…every registered person whose aggregate turnover during a financial year exceeds five crore rupees shall also furnish a self-certified reconciliation statement in FORM GSTR-9C…",
        after: "…every registered person whose aggregate turnover during a financial year exceeds ten crore rupees shall also furnish a self-certified reconciliation statement in FORM GSTR-9C…",
      },
      audit: [
        { at: "2026-08-14T16:20:00+05:30", actor: "watcher", action: "New notification number in CBIC series" },
        { at: "2026-08-14T16:22:00+05:30", actor: "extractor", action: "Record extracted, published as auto" },
        { at: "2026-08-15T06:41:00+05:30", actor: "reconciler", action: "Gazette copy matched → reconciled" },
        { at: "2026-08-16T12:10:00+05:30", actor: "R. Menon", action: "Cleared → verified" },
      ],
    },
  },
  {
    id: "sebi-2026-icdr-rights",
    title: "SEBI (ICDR) Second Amendment Regulations, 2026",
    family: "SEBI",
    amends: "SEBI (ICDR) Regulations, 2018 — reg.71",
    changeType: "substitution",
    summary:
      "Rights issue timeline compressed. The gap between record date and issue opening is reduced, with consequential changes to the notice period.",
    body: "Securities and Exchange Board of India",
    reference: "No. SEBI/LAD-NRO/GN/2026/228",
    published: "2026-08-11",
    effective: "2026-09-01",
    status: "reconciled",
    sourceUrl: "https://www.sebi.gov.in/",
    appliesTo: ["Issuers making a rights issue", "Merchant bankers", "Registrars to an issue"],
    pipeline: {
      firstSeen: "2026-08-11T19:02:00+05:30",
      provenance: [
        { source: "sebi-legal", at: "2026-08-11T19:02:00+05:30", hash: "sha256:aa19f2b6…", doc: "icdr-second-amendment-2026.pdf", pages: 8 },
        { source: "egazette-weekly", at: "2026-08-12T06:40:00+05:30", hash: "sha256:b41c9e07…", doc: "Part III §4 11-08-2026", pages: 8 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.98, amends: 0.96, changeType: 0.97, effective: 0.93, reference: 0.98 },
        tokens: 16700,
        retries: 0,
      },
      check: {
        name: "Verbatim old-text match",
        result: "pass",
        occurrences: 1,
        detail: "Old timeline clause located once at reg.71(1).",
      },
      diff: {
        cite: "SEBI (ICDR) Regulations, 2018 — reg.71(1)",
        before: "…the issue shall open within twelve months from the date of issuance of the observation letter…",
        after: "…the issue shall open within nine months from the date of issuance of the observation letter…",
      },
      audit: [
        { at: "2026-08-11T19:02:00+05:30", actor: "watcher", action: "New item on SEBI legal listing" },
        { at: "2026-08-11T19:04:00+05:30", actor: "extractor", action: "Record extracted, published as auto" },
        { at: "2026-08-12T06:41:00+05:30", actor: "reconciler", action: "Gazette copy matched → reconciled" },
        { at: "2026-08-12T06:41:00+05:30", actor: "queue", action: "Queued for human verification (position 5)" },
      ],
    },
  },
  {
    id: "mca-2026-maintenance-books",
    title: "Companies (Accounts) Amendment Rules, 2026",
    family: "Companies Act",
    amends: "Companies Act, 2013 — r.3",
    changeType: "insertion",
    summary:
      "Audit trail requirements extended to books of account maintained in electronic mode by branch offices outside India.",
    body: "Ministry of Corporate Affairs",
    reference: "G.S.R. 549(E)",
    published: "2026-08-06",
    effective: "2027-04-01",
    status: "verified",
    sourceUrl: "https://www.mca.gov.in/",
    appliesTo: ["Companies with overseas branches", "Statutory auditors reporting under CARO"],
    pipeline: {
      firstSeen: "2026-08-06T12:41:00+05:30",
      provenance: [
        { source: "mca-notifications", at: "2026-08-06T12:41:00+05:30", hash: "sha256:7f30ad12…", doc: "GSR_549E_2026.pdf", pages: 3 },
        { source: "egazette-weekly", at: "2026-08-07T06:40:00+05:30", hash: "sha256:b41c9e07…", doc: "Part II §3(i) 06-08-2026", pages: 3 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.99, amends: 0.98, changeType: 0.98, effective: 0.99, reference: 0.99 },
        tokens: 6110,
        retries: 0,
      },
      check: {
        name: "Insertion anchor match",
        result: "pass",
        occurrences: 1,
        detail: "Proviso anchor located once at r.3(1); no competing proviso at the new position.",
      },
      diff: {
        cite: "Companies (Accounts) Rules, 2014 — r.3(1)",
        before: "[Proviso applies to books maintained in India]",
        after:
          "Provided further that the requirement of an audit trail shall apply equally to books of account maintained in electronic mode by a branch office situated outside India…",
      },
      audit: [
        { at: "2026-08-06T12:41:00+05:30", actor: "watcher", action: "Listing hash changed on MCA notifications" },
        { at: "2026-08-06T12:43:00+05:30", actor: "extractor", action: "Record extracted, published as auto" },
        { at: "2026-08-07T06:41:00+05:30", actor: "reconciler", action: "Gazette copy matched → reconciled" },
        { at: "2026-08-07T15:55:00+05:30", actor: "A. Iyer", action: "Cleared → verified" },
      ],
    },
  },
  {
    id: "mol-2026-osh-draft",
    title: "Occupational Safety, Health and Working Conditions (Central) Amendment Rules, 2026",
    family: "Labour",
    amends: "OSH Code, 2020 — r.24",
    changeType: "substitution",
    summary:
      "Revised registers and returns for establishments engaging contract labour. Extracted from a scanned gazette page, so field-level accuracy is lower than usual.",
    body: "Ministry of Labour and Employment",
    reference: "G.S.R. 531(E)",
    published: "2026-08-04",
    effective: "2026-10-01",
    status: "auto",
    sourceUrl: "https://labour.gov.in/",
    appliesTo: ["Principal employers engaging contract labour", "Contractors holding a licence"],
    pipeline: {
      firstSeen: "2026-08-04T11:09:00+05:30",
      provenance: [
        { source: "labour-gsr", at: "2026-08-04T11:09:00+05:30", hash: "sha256:c7741ae9…", doc: "GSR_531E_2026.pdf (scanned, OCR)", pages: 6 },
      ],
      extraction: {
        model: "claude-opus-5",
        schema: "amendment.v3",
        confidence: { title: 0.91, amends: 0.79, changeType: 0.88, effective: 0.83, reference: 0.9 },
        tokens: 14020,
        retries: 2,
      },
      check: {
        name: "Verbatim old-text match",
        result: "fail",
        occurrences: 0,
        detail:
          "OCR noise. The quoted old text differs from the base text at four character positions, so the verbatim check cannot pass. Nothing here is safe to promote automatically — held at auto and queued.",
      },
      diff: {
        cite: "OSH (Central) Rules, 2020 — r.24, Form XII",
        before: "…the contractor shall maintain a register of workers employed in Form XIII…",
        after: "…the contractor shall maintain a register of workers employed in Form XII-A, and furnish a half-yearly return…",
      },
      audit: [
        { at: "2026-08-04T11:09:00+05:30", actor: "watcher", action: "New G.S.R. on labour.gov.in" },
        { at: "2026-08-04T11:15:00+05:30", actor: "extractor", action: "OCR pass, two retries on schema violation" },
        { at: "2026-08-04T11:16:00+05:30", actor: "checker", action: "Verbatim old-text check FAILED (OCR noise) → held at auto" },
        { at: "2026-08-04T11:16:00+05:30", actor: "queue", action: "Queued for human verification (position 6)" },
      ],
    },
  },
];

const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

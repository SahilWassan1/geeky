/*
 * Compliance Wiki — data layer.
 *
 * EVERY RECORD BELOW WAS FETCHED FROM THE ISSUING AUTHORITY'S OWN WEBSITE.
 * Nothing here is written by hand except the one-line `summary`, which
 * paraphrases the instrument's own opening paragraph.
 *
 * Capture run: 2026-09-08, 23:35 IST, from https://www.rbi.org.in/Scripts/
 * NotificationUser.aspx and the detail page of each item. `sha256` on each
 * provenance row is the hash of the bytes actually received.
 *
 * Fields the pipeline cannot yet determine are null, and the views render
 * them as unknown. They are never guessed:
 *   changeType   set only where the instrument's own words settle it
 *                ("shall be substituted"). null otherwise.
 *   effective    set only where the instrument states commencement.
 *   diff         set only where the instrument quotes the old text verbatim.
 *   check        run for one record against a base text we also fetched;
 *                "not-run" everywhere else, because the base capture is missing.
 *
 * status is "auto" on every record: machine-extracted, nobody has read it.
 * Not one record here has been reconciled against a second source or cleared
 * by a human, and the register says so on every row.
 */

const CAPTURE = {
  at: "2026-09-08T23:35:00+05:30",
  listing: "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
  parser: "rbi-notif-detail-v1",
  note:
    "Nine of the ten sources in the registry could not be captured in this run. See SOURCES for what each host actually returned.",
};

const FAMILIES = ["RBI"];

/* ------------------------------------------------------------------ *
 * Source registry.
 *
 * `probe` is not a description of these hosts in general — it is the HTTP
 * status this container received on 2026-09-08 at 23:20 IST. A 403 or a
 * connection reset from a cloud IP says nothing about whether the site is
 * up for a person in India.
 * ------------------------------------------------------------------ */

const SOURCES = [
  {
    id: "rbi-notifications",
    name: "RBI — Notifications",
    body: "Reserve Bank of India",
    url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
    parser: "rbi-notif-detail-v1",
    probe: 200,
    health: "healthy",
    captured: 10,
    note:
      "Listing carries a date header per day, the title, a detail page and a direct PDF. Detail pages are server-rendered, so the reference number, the addressee and the operative clause all parse without a browser. This is the only source that produced records in this run.",
  },
  {
    id: "rbi-master-directions",
    name: "RBI — Master Directions (base text)",
    body: "Reserve Bank of India",
    url: "https://www.rbi.org.in/scripts/BS_ViewMasDirections.aspx",
    parser: "rbi-masdir-v1",
    probe: 200,
    health: "healthy",
    captured: 1,
    note:
      "Not a change feed. This is the consolidated base text a substitution is checked against. RBI revises master directions in place, which is why the check on RBI/2026-27/245 came back the way it did.",
  },
  {
    id: "sebi-legal",
    name: "SEBI — Legal (regulations, circulars)",
    body: "Securities and Exchange Board of India",
    url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=3&smid=0",
    parser: null,
    probe: 200,
    health: "partial",
    captured: 0,
    note:
      "Listing pages parse and carry real titles, dates and URLs. Detail pages are JS-rendered stubs: the circular number and the operative text are not in the served HTML, so no record could be completed without driving a browser. Listing captured, records pending.",
  },
  {
    id: "cbic-gst",
    name: "CBIC — GST portal",
    body: "Central Board of Indirect Taxes and Customs",
    url: "https://cbic-gst.gov.in/",
    parser: null,
    probe: 200,
    health: "partial",
    captured: 0,
    note:
      "Home page serves, but the Central Tax notification index was not found at the expected path (404). The main cbic.gov.in site is an Angular application whose listing arrives over an API not yet identified.",
  },
  {
    id: "indiacode",
    name: "India Code — consolidated bare acts",
    body: "Legislative Department",
    url: "https://www.indiacode.nic.in/",
    parser: null,
    probe: 200,
    health: "partial",
    captured: 0,
    note:
      "Reachable, not yet harvested. Runs on DSpace, so OAI-PMH or the REST API should serve structured metadata for the baseline corpus — worth checking before any scraper is written.",
  },
  {
    id: "mca-notifications",
    name: "MCA — Notifications & circulars",
    body: "Ministry of Corporate Affairs",
    url: "https://www.mca.gov.in/content/mca/global/en/notifications-tender/notifications.html",
    parser: null,
    probe: 403,
    health: "blocked",
    captured: 0,
    note:
      "Returns 403 to this container. Consistent with the datacenter-IP filtering these sites apply; a request from an Indian address is likely to succeed. Every Companies Act record is blocked behind this.",
  },
  {
    id: "egazette",
    name: "Gazette of India",
    body: "Department of Publication",
    url: "https://egazette.gov.in/",
    parser: null,
    probe: null,
    health: "blocked",
    captured: 0,
    note:
      "Connection reset by peer before any response. The authority source, and the one that would let a record reach 'reconciled', is the one we cannot reach at all.",
  },
];

const SOURCE_TOTAL = SOURCES.length;
const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

/* ------------------------------------------------------------------ *
 * Golden dataset.
 *
 * The harness does not exist. There is no score to report, and reporting one
 * anyway is exactly the failure this project is built to avoid. Auto-publish
 * is therefore off for every class: nothing can promote past `auto`.
 * ------------------------------------------------------------------ */

const GOLDEN = [
  { changeType: "substitution", n: 0, accuracy: null, gate: 0.99, autoPublish: false },
  { changeType: "insertion", n: 0, accuracy: null, gate: 0.99, autoPublish: false },
  { changeType: "omission", n: 0, accuracy: null, gate: 0.99, autoPublish: false },
  { changeType: "supersession", n: 0, accuracy: null, gate: 0.99, autoPublish: false },
  { changeType: "commencement", n: 0, accuracy: null, gate: 0.99, autoPublish: false, hardBlocked: true },
];

/* ------------------------------------------------------------------ */

function prov(sha, bytes, doc, sourceId) {
  return [
    {
      source: sourceId || "rbi-notifications",
      at: CAPTURE.at,
      hash: "sha256:" + sha,
      doc: doc,
      bytes: bytes,
      pages: null,
    },
  ];
}

function parseMeta(sha, bytes) {
  return {
    method: "Server-rendered HTML, parsed with a regular-expression extractor",
    parser: CAPTURE.parser,
    fetchedAt: CAPTURE.at,
    bytes: bytes,
    sha256: sha,
    model: null,
    note:
      "No language model was involved in producing this record. Fields came out of the page's own markup, which is why there are no confidence scores to report.",
  };
}

const NOT_RUN = {
  name: "Verbatim old-text match",
  result: "not-run",
  occurrences: null,
  base: null,
  detail:
    "Not run. The check compares the old text quoted by the amendment against the base text at the cited position, and the base document for this instrument has not been captured. An un-run check is reported as un-run; it is not evidence of anything.",
};

const CHANGES = [
  {
    id: "rbi-2026-27-254",
    title: "Review of Circulars issued under Foreign Exchange Management Act, 1999 (FEMA)",
    family: "RBI",
    amends: null,
    changeType: null,
    summary:
      "Continues the Reserve Bank's review of circulars issued under FEMA since 1 June 2000, as part of its rationalisation of the regulatory framework.",
    body: "Reserve Bank of India",
    reference: "RBI/2026-27/254",
    published: "2026-09-08",
    effective: null,
    status: "auto",
    sourceUrl: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13696&Mode=0",
    pdfUrl:
      "https://rbidocs.rbi.org.in/rdocs/notification/PDFs/NT254F42FDC8A07F849ED856846F96E6FE308.PDF",
    appliesTo: ["All Authorised Persons"],
    pipeline: {
      firstSeen: CAPTURE.at,
      provenance: prov("595693325c8addcd", 112359, "NotificationUser.aspx?Id=13696"),
      parse: parseMeta("595693325c8addcd", 112359),
      check: NOT_RUN,
      diff: null,
      audit: [
        { at: CAPTURE.at, actor: "watcher", action: "Item present on the RBI notifications listing under 8 September 2026" },
        { at: CAPTURE.at, actor: "parser", action: "Detail page fetched and parsed; reference number and addressee recovered from the page" },
        { at: CAPTURE.at, actor: "publisher", action: "Published as auto, unchecked" },
      ],
    },
  },
  {
    id: "rbi-2026-27-253",
    title:
      "Implementation of Section 51A of UAPA, 1967: Updates to UNSC's 1267/1989 ISIL (Da'esh) & Al-Qaida Sanctions List: Amendment of 2 Entries",
    family: "RBI",
    amends:
      "Chapter IX of the Reserve Bank of India — Know Your Customer Directions, 2025",
    changeType: null,
    summary:
      "Communicates amendments to two entries on the UNSC 1267/1989 ISIL (Da'esh) and Al-Qaida Sanctions List for the purposes of the KYC Directions.",
    body: "Reserve Bank of India",
    reference: "RBI/2026-27/253 · DOR.AML.REC.219/14.06.001/2026-27",
    published: "2026-09-07",
    effective: null,
    status: "auto",
    sourceUrl: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13695&Mode=0",
    pdfUrl: null,
    appliesTo: [
      "Chairpersons and CEOs of Commercial Banks, Small Finance Banks, Payment Banks and Urban Co-operative Banks (per the addressee line on the circular)",
    ],
    pipeline: {
      firstSeen: CAPTURE.at,
      provenance: prov("11e413339e65db5d", 118843, "NotificationUser.aspx?Id=13695"),
      parse: parseMeta("11e413339e65db5d", 118843),
      check: NOT_RUN,
      diff: null,
      audit: [
        { at: CAPTURE.at, actor: "watcher", action: "Item present on the RBI notifications listing under 7 September 2026" },
        { at: CAPTURE.at, actor: "parser", action: "Detail page fetched and parsed; circular number recovered" },
        { at: CAPTURE.at, actor: "publisher", action: "Published as auto, unchecked" },
      ],
    },
  },
  {
    id: "rbi-2026-27-252",
    title:
      "Implementation of Section 51A of UAPA, 1967: Updates to UNSC's 1988 (2011) Taliban Sanctions List: Amendment of 01 Entry",
    family: "RBI",
    amends:
      "Chapter IX of the Reserve Bank of India — Know Your Customer Directions, 2025",
    changeType: null,
    summary:
      "Communicates an amendment to one entry on the UNSC 1988 (2011) Taliban Sanctions List for the purposes of the KYC Directions.",
    body: "Reserve Bank of India",
    reference: "RBI/2026-27/252 · DOR.AML.REC.218/14.06.001/2026-27",
    published: "2026-09-07",
    effective: null,
    status: "auto",
    sourceUrl: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13694&Mode=0",
    pdfUrl: null,
    appliesTo: [
      "Chairpersons and CEOs of Commercial Banks, Small Finance Banks, Payment Banks and Urban Co-operative Banks (per the addressee line on the circular)",
    ],
    pipeline: {
      firstSeen: CAPTURE.at,
      provenance: prov("ed8563c4611eae43", 116429, "NotificationUser.aspx?Id=13694"),
      parse: parseMeta("ed8563c4611eae43", 116429),
      check: NOT_RUN,
      diff: null,
      audit: [
        { at: CAPTURE.at, actor: "watcher", action: "Item present on the RBI notifications listing under 7 September 2026" },
        { at: CAPTURE.at, actor: "parser", action: "Detail page fetched and parsed; circular number recovered" },
        { at: CAPTURE.at, actor: "publisher", action: "Published as auto, unchecked" },
      ],
    },
  },
  {
    id: "rbi-2026-27-251",
    title: "Deposits and Accounts — Accounts of Non-resident banks",
    family: "RBI",
    amends:
      "Para B.2(ii) and B.8(i) of Part B of the A.P. (DIR Series) Circular No. 92 dated 4 April 2003",
    changeType: null,
    summary:
      "Revisits the reporting obligations placed on AD banks by the 2003 circular in respect of Rupee accounts of non-resident banks.",
    body: "Reserve Bank of India",
    reference: "RBI/2026-27/251",
    published: "2026-09-02",
    effective: null,
    status: "auto",
    sourceUrl: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13693&Mode=0",
    pdfUrl: null,
    appliesTo: ["All Authorised Dealer Category-I banks"],
    pipeline: {
      firstSeen: CAPTURE.at,
      provenance: prov("108a443c34a78641", 109231, "NotificationUser.aspx?Id=13693"),
      parse: parseMeta("108a443c34a78641", 109231),
      check: NOT_RUN,
      diff: null,
      audit: [
        { at: CAPTURE.at, actor: "watcher", action: "Item present on the RBI notifications listing under 2 September 2026" },
        { at: CAPTURE.at, actor: "parser", action: "Detail page fetched and parsed; the amended circular is named in the opening paragraph" },
        { at: CAPTURE.at, actor: "publisher", action: "Published as auto, unchecked" },
      ],
    },
  },
  {
    id: "rbi-2026-27-250",
    title:
      "Relief Measures in Areas Affected by Natural Calamities — Reporting through CIMS Portal — Introduction of Half-Yearly Return",
    family: "RBI",
    amends: "Regulatory framework governing relief measures in areas affected by natural calamities",
    changeType: null,
    summary:
      "Introduces a half-yearly return, reported through the Centralised Information Management System portal, on relief measures extended by regulated entities in areas affected by natural calamities.",
    body: "Reserve Bank of India",
    reference: "RBI/2026-27/250",
    published: "2026-09-02",
    effective: null,
    status: "auto",
    sourceUrl: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13692&Mode=0",
    pdfUrl: null,
    appliesTo: [
      "All Scheduled Commercial Banks including Regional Rural Banks and Small Finance Banks",
      "All Local Area Banks, Urban Co-operative Banks and Rural Co-operative Banks (per the addressee line on the circular)",
    ],
    pipeline: {
      firstSeen: CAPTURE.at,
      provenance: prov("664431faaebc44e6", 110378, "NotificationUser.aspx?Id=13692"),
      parse: parseMeta("664431faaebc44e6", 110378),
      check: NOT_RUN,
      diff: null,
      audit: [
        { at: CAPTURE.at, actor: "watcher", action: "Item present on the RBI notifications listing under 2 September 2026" },
        { at: CAPTURE.at, actor: "parser", action: "Detail page fetched and parsed; addressee list recovered" },
        { at: CAPTURE.at, actor: "publisher", action: "Published as auto, unchecked" },
      ],
    },
  },
  {
    id: "rbi-2026-27-249",
    title:
      "Reserve Bank of India (Urban Co-operative Banks — Classification, Valuation, and Operation of Investment Portfolio) Second Amendment Directions, 2026",
    family: "RBI",
    amends:
      "Chapter VIII of the Reserve Bank of India (Urban Co-operative Banks — Classification, Valuation, and Operation of Investment Portfolio) Directions, 2025 dated 28 November 2025, on investment in non-SLR securities",
    changeType: null,
    summary:
      "Amends the non-SLR investment instructions so that urban co-operative banks can acquire membership of the Indian Digital Payment Intelligence Corporation.",
    body: "Reserve Bank of India",
    reference: "RBI/2026-27/249 · DOR.MRG.REC.No.217/00-00-011/2026-27",
    published: "2026-09-02",
    effective: "From the date of issue",
    status: "auto",
    sourceUrl: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13691&Mode=0",
    pdfUrl: null,
    appliesTo: ["Urban co-operative banks"],
    pipeline: {
      firstSeen: CAPTURE.at,
      provenance: prov("d95391e970f4d0fe", 112013, "NotificationUser.aspx?Id=13691"),
      parse: parseMeta("d95391e970f4d0fe", 112013),
      check: {
        name: "Verbatim old-text match",
        result: "not-run",
        occurrences: null,
        base: null,
        detail:
          "Not run. The instrument states the power it is issued under and the chapter it amends, but the operative clause was not isolated by this parser, so there is no quoted old text to look for. changeType is left unset for the same reason.",
      },
      diff: null,
      audit: [
        { at: CAPTURE.at, actor: "watcher", action: "Item present on the RBI notifications listing under 2 September 2026" },
        { at: CAPTURE.at, actor: "parser", action: "Detail page fetched; commencement clause recovered, operative clause not isolated" },
        { at: CAPTURE.at, actor: "publisher", action: "Published as auto, unchecked" },
      ],
    },
  },
];

/* The four Interest Rate on Deposits amendments share one operative change:
   the temporary withdrawal of the NRE deposit rate restriction, shortened from
   30 September 2026 to 31 August 2026. Each instrument quotes the old phrase
   verbatim, which is exactly the case the mechanical check is built for. */

[
  {
    id: "rbi-2026-27-248",
    bank: "Rural Co-operative Banks",
    ordinal: "Second",
    reference: "RBI/2026-27/248 · DOR.SOG(SPE).REC.214/13.03.00/2026-27",
    docId: 13690,
    sha: "0300516dda1b45b4",
    bytes: 111797,
    paras: ["paragraph 24(4) subscript (1)", "paragraph 29(7) subscript (2)"],
  },
  {
    id: "rbi-2026-27-247",
    bank: "Urban Co-operative Banks",
    ordinal: "Third",
    reference: "RBI/2026-27/247 · DOR.SOG(SPE).REC.216/13.03.00/2026-27",
    docId: 13689,
    sha: "1338d4292bc05bd9",
    bytes: 111815,
    paras: ["paragraph 24(4) subscript (1)", "paragraph 29(7) subscript (2)"],
  },
  {
    id: "rbi-2026-27-246",
    bank: "Regional Rural Banks",
    ordinal: "Third",
    reference: "RBI/2026-27/246 · DOR.SOG(SPE).REC.213/13.03.00/2026-27",
    docId: 13688,
    sha: "7a999a576da82f9d",
    bytes: 110217,
    paras: ["paragraph 26(4) subscript (1)", "paragraph 31(7) subscript (2)"],
  },
  {
    id: "rbi-2026-27-245",
    bank: "Local Area Banks",
    ordinal: "Third",
    reference: "RBI/2026-27/245 · DOR.SOG(SPE).REC.215/13.03.00/2026-27",
    docId: 13687,
    sha: "f7d165d8f9cd80f5",
    bytes: 110197,
    paras: ["paragraph 26(4) subscript (1)", "paragraph 31(7) subscript (2)"],
    checked: true,
  },
].forEach((r) => {
  CHANGES.push({
    id: r.id,
    title: `Reserve Bank of India (${r.bank} — Interest Rate on Deposits) ${r.ordinal} Amendment Directions, 2026`,
    family: "RBI",
    amends: `Reserve Bank of India (${r.bank} — Interest Rate on Deposits) Directions, 2025 dated 28 November 2025 (updated as on 17 June 2026) — ${r.paras.join(" and ")}`,
    changeType: "substitution",
    summary:
      "Shortens the temporary withdrawal of the restriction on interest rates for fresh NRE deposits of three years and above: the relaxation now runs to 31 August 2026 instead of 30 September 2026.",
    body: "Reserve Bank of India",
    reference: r.reference,
    published: "2026-08-25",
    effective: "With immediate effect",
    status: "auto",
    sourceUrl: `https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=${r.docId}&Mode=0`,
    pdfUrl: null,
    appliesTo: [r.bank],
    pipeline: {
      firstSeen: CAPTURE.at,
      provenance: prov(r.sha, r.bytes, `NotificationUser.aspx?Id=${r.docId}`),
      parse: parseMeta(r.sha, r.bytes),
      check: r.checked
        ? {
            name: "Verbatim old-text match",
            result: "fail",
            occurrences: { old: 0, new: 2 },
            base: {
              url: "https://www.rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=13079",
              sha256: "0ba18586de515b1f4a33",
              bytes: 185781,
              at: "2026-09-08T23:45:00+05:30",
            },
            detail:
              "Run, and failed — informatively. The old phrase does not appear in the base text at all (0 occurrences); the new phrase appears twice. RBI revises master directions in place, so the consolidated text we can fetch today already carries this amendment. Proving the change would need the pre-amendment capture, which we do not hold. This is the in-place re-issue problem, observed rather than assumed.",
          }
        : {
            name: "Verbatim old-text match",
            result: "not-run",
            occurrences: null,
            base: null,
            detail:
              "Not run. The instrument quotes the old text verbatim, so the check is available for this record — the base Directions document for this bank class simply has not been captured yet. Compare rbi-2026-27-245, where it was run.",
          },
    diff: {
        cite: `${r.bank} — Interest Rate on Deposits Directions, 2025, ${r.paras[0]}`,
        quotedInInstrument: true,
        before:
          "with effect from June 17, 2026, for the period until September 30, 2026",
        after: "with effect from June 17, 2026, for the period until August 31, 2026",
      },
      audit: [
        { at: CAPTURE.at, actor: "watcher", action: "Item present on the RBI notifications listing under 25 August 2026" },
        { at: CAPTURE.at, actor: "parser", action: "Detail page fetched; operative clause isolated and both quoted phrases recovered verbatim" },
        r.checked
          ? { at: "2026-09-08T23:45:00+05:30", actor: "checker", action: "Base text fetched and searched — old phrase 0 occurrences, new phrase 2. Check failed; record held at auto" }
          : { at: CAPTURE.at, actor: "checker", action: "Check not run — base text for this bank class not captured" },
        { at: CAPTURE.at, actor: "publisher", action: "Published as auto, unchecked" },
      ],
    },
  });
});

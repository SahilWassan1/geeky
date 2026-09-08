# Handoff — swapping specimen records for real ones

Read this first. It is written for a session that starts with no memory of the
work and possibly with an empty repository.

## 1. What this project is

Compliance Wiki: every Indian Act, rule and amendment in one searchable
register, with the source and a verification status on every entry. The design
premise is three publication tiers off one ingestion pipeline —

- **auto** — machine-extracted, live immediately, labelled as unchecked
- **reconciled** — two independent sources produced an identical record
- **verified** — a human cleared it

Speed comes from tier one, trust from tier three, and the label on the record is
what keeps that honest. `commencement` entries never auto-promote past `auto`,
regardless of confidence, because commencement scope in Indian law cannot be
determined mechanically — sections are brought into force in tranches years apart.

## 2. What is built

A working front end, no build step and no dependencies. Open `index.html`.

```
index.html        five views, one page
src/styles.css    the whole design system
src/data.js       record schema, source registry, golden scores, seed register
src/pipeline.js   stages, inbound records, the scripted run, the Store
src/app.js        views, the record drawer, transport controls
README.md         schema, publication rules, next steps
```

Five views: **Register** (search, filters, and a record drawer carrying every
field, the before/after text, the mechanical check, provenance, per-field
extraction confidence and the audit trail), **Pipeline** (Watch → Fetch →
Extract → Check → Publish running live, with an event log and the verification
queue), **Sources** (the source registry with a dead-man's-switch column),
**Accuracy** (golden-dataset score per `changeType` against the 99% auto-publish
gate), **Method** (the rules in prose).

Architecture note that matters for the swap: every view renders from `Store` and
re-renders on `Store` events. `src/pipeline.js` holds a scripted run; replacing
`SCRIPT` with real events, or `CHANGES` with real records, requires no view
changes.

## 3. The task

**Every record in `src/data.js` and every inbound record in `src/pipeline.js` is
invented.** The notification numbers, dates, statutory text and source links do
not correspond to real instruments. They were written to exercise the schema.

Replace them with real Indian statutory amendments from primary sources.

The user's instruction, verbatim: *"Strictly prohibited to invent your own
records and updates. Achieve 100% accuracy."*

### Rules for the replacement

1. **Primary sources only.** India Code for the baseline, the Gazette of India
   for authority, ministry notification pages for speed. Never build the corpus
   from a competitor's compilation (ClearTax, TaxTMI, etc.) — those are
   protectable by selection and arrangement, and it is the one sourcing rule the
   project states outright.
2. **No field gets a value you did not read from a source.** This is the hard
   part, because the schema has two kinds of field:
   - *Recoverable from the notification*: `title`, `family`, `amends`,
     `changeType`, `summary`, `body`, `reference`, `published`, `effective`,
     `sourceUrl`.
   - *Pipeline outputs, which you cannot know for a historical record*:
     `pipeline.extraction.confidence`, `pipeline.extraction.tokens`,
     `pipeline.check.result`, `pipeline.provenance[].hash`, `pipeline.audit[]`.
     Do not fabricate these. Either compute them for real (fetch the PDF, hash
     the bytes you fetched, run the verbatim check against the base text) or
     represent them honestly as not-run. Prefer computing them — that is the
     product.
   - `pipeline.diff.before` / `.after`: fill only where the notification quotes
     the old text verbatim, which Indian amending instruments commonly do but
     not always. Where it does not, say so rather than paraphrasing.
3. **`sourceUrl` is the document, not the homepage.** The current seed data
   points every record at a ministry homepage. That is one of the things being
   fixed.
4. **Record provenance for every row**: the URL fetched, the timestamp, and the
   sha256 of the bytes received.

## 4. Blockers — resolve before starting

### 4a. Network egress

In the session that produced this handoff, **every primary source was blocked by
the organization's network egress policy**: `egazette.gov.in`, `www.mca.gov.in`,
`www.cbic.gov.in`, `cbic-gst.gov.in`, `www.sebi.gov.in`, `www.rbi.org.in`,
`www.incometax.gov.in`, `www.indiacode.nic.in`, plus the secondary sources.

The fix is on the cloud environment, not in code: claude.ai/code → the cloud icon
above the message box → gear on the environment → **Network access: Custom** →
allowed domains, one per line → **check "Also include default list of common
package managers"** (otherwise npm, PyPI and the Playwright download break).

```
egazette.gov.in            www.sebi.gov.in
www.mca.gov.in             www.incometax.gov.in
www.cbic.gov.in            www.rbi.org.in
cbic-gst.gov.in            rbi.org.in
taxinformation.cbic.gov.in labour.gov.in
www.indiacode.nic.in       www.epfindia.gov.in
```

The policy applies at VM provisioning, so it takes effect in a **new** session.

Verify before doing anything else:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://www.sebi.gov.in/
```

A proxy 403 means the host is still denied — report it, do not route around it.

### 4b. Datacenter IPs

Indian government sites frequently block or degrade requests from cloud IP
ranges. If hosts are allowlisted and requests still hang or 403, that is the
cause, and no config change here fixes it — production watchers need an Indian
VPS or residential egress. Establish this early; it changes the whole plan.

### 4c. Use raw fetches, not summarizers

`WebFetch` answers a prompt against the page using a small fast model. That is
fine for orientation and unacceptable for gazette numbers and dates. Fetch with
`curl` through Bash and read the bytes.

## 5. Source access map

Verify each against the live site — these are shapes, not confirmed endpoints.

| Source | Stack | Approach |
| --- | --- | --- |
| SEBI | Java `.do` listing, params for section, paginated | Plain HTTP + HTML parse. Easiest. |
| CBIC | Per-year notification index pages | Plain HTTP; number series is regular, and **gaps in it are the missed-fetch alarm**. |
| MCA | CMS pages with PDF links | Plain HTTP; some sections render client-side. |
| India Code | DSpace repository | Check for **OAI-PMH / REST** before writing a scraper. |
| RBI | ASP.NET WebForms | Check for RSS first; else postback emulation. |
| Income Tax | Angular SPA | Page is useless to a scraper; find the JSON endpoint it calls. |
| eGazette | ASP.NET WebForms, `__VIEWSTATE`/`__EVENTVALIDATION` | Hardest, most authoritative. Stateful postbacks — drive a real browser (Playwright), not `requests`. |

Playwright and Chromium are pre-installed: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`,
and the pinned binary that worked here was
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` passed as `executablePath`.
Do not run `playwright install`.

## 6. Fetch mechanics

```
listing page → normalize → sha256 → compare to last hash
   ↓ changed
diff parsed item list → new items only
   ↓
fetch each PDF → store raw bytes + sha256 + fetched_at + URL
   ↓
extract text → structured record
```

- **Store the raw bytes permanently.** Every claim must trace to a file whose
  hash was recorded at fetch time. Without that there is no provenance, and
  provenance is the product.
- **Hash the normalized item list, not raw HTML.** Government pages inject
  timestamps and session IDs; hashing raw HTML makes the dead-man's switch fire
  every poll.
- **PDFs come in three tiers**: text-layer (`pdftotext -layout` gives exact
  characters), scanned (OCR, and flag the record as OCR-derived because it
  changes what the mechanical check can prove), and form/table layouts (extract
  as structure or you will silently mangle them). Detect which tier you are in;
  an empty `pdftotext` result is the routing signal.
- Respect `robots.txt`, rate limit to roughly one request every few seconds, set
  a `User-Agent` with a contact address, and use `If-Modified-Since`/`ETag`
  where honoured.

## 7. Definition of done

- Every record in `src/data.js` traces to a document you fetched, with its URL
  and the sha256 of the bytes.
- `sourceUrl` on every record resolves to the notification itself.
- No `pipeline.*` value is invented; anything not computed is marked not-run.
- The specimen notices (see §8) are removed only once the data is real.
- Spot-check: pick three records at random and re-derive `reference`,
  `published` and `effective` from the source PDF alone.

## 8. Repository state at handoff

Two commits on `claude/web-page-mockup-build-30e2hx`, **neither pushed** — the
push returned 403: *"Claude doesn't have GitHub access to SahilWassan1/geeky for
your organization."* The remedy is installing the Claude GitHub App on the repo
(https://github.com/apps/claude/installations/select_target) or reconnecting
GitHub under claude.ai Settings → Connectors.

```
f7e9d0e  Label the seeded register as specimen data (partial)
f7b8529  Build the Compliance Wiki front end
```

**Open item:** the specimen labelling is half-finished. The register and pipeline
views carry the notice; the record drawer and the README do not. Either finish it
or drop it, depending on whether the real data lands first.

A single-file build of the app (pre-specimen-notice) is published as an artifact
at https://claude.ai/code/artifact/e09520af-b056-400b-a458-9be131faaf28 — it can
be re-read to recover the code if the repository arrives empty.

## 9. What to do first, in order

1. Confirm the repository actually contains the five source files. If it is
   empty, recover from the bundle the user attaches or from the artifact above.
2. Verify egress with the `curl` check in §4a. If blocked, stop and report.
3. Fetch one source end to end — SEBI is the easiest — and produce exactly one
   real record with real provenance. Show it to the user before scaling.
4. Only then replace the rest, and rewrite `SCRIPT` in `src/pipeline.js` so the
   live run replays real notifications in real publication order.

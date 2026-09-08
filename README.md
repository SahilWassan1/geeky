# Compliance Wiki

Every Indian Act, rule and amendment in one searchable register, with the source
and a verification status on every entry — and the ingestion pipeline running in
the open next to it.

Open `index.html` in a browser. No build step, no dependencies.

## Status of the data

**Every record is real.** The register holds ten notifications fetched from the
Reserve Bank of India's own pages on 8 September 2026, each carrying the sha256
of the bytes received. No record, field or timestamp is invented.

What that honesty costs is visible on the page:

- **One regulator.** Two of the seven configured sources refuse requests from
  this machine (MCA returns 403, the Gazette resets the connection), and three
  more are reachable but not yet harvested. The Companies Act, GST, SEBI and
  Income-tax families therefore hold *no records at all*.
- **Everything is `auto`.** Nothing has been reconciled — that needs a second
  independent source, and the Gazette is the unreachable one — and nothing has
  been read by a human.
- **One check has actually run.** For `rbi-2026-27-245` the base Directions text
  was fetched and searched: the old phrase occurs 0 times, the new one twice,
  because RBI revises master directions in place. The check fails, and the
  failure is informative. Every other record reports its check as `not-run`.
- **Nothing has been scored.** The golden dataset does not exist, so the
  Accuracy view reports no figures and auto-publish is off for all five classes.

Fields the pipeline cannot determine are `null` and render as unknown:
`changeType` is set only where the instrument's own words settle it, `effective`
only where commencement is stated, and `diff` only where the instrument quotes
the text it replaces.

## What exists now

A working front end over the captured corpus, in five views:

| View | What it shows |
| --- | --- |
| **Register** | The public wiki. Full-text search, filters by law family and verification status, and a record drawer on every entry: every schema field, who the instrument is addressed to, the before/after text where the instrument quotes it, the mechanical check and its result, each source capture with byte count and hash, and the full audit trail. |
| **Pipeline** | The capture run, replayed. Watch → Fetch → Parse → Check → Publish, with the real source probes, an event log, counters, and the unchecked queue. |
| **Sources** | The source registry — URL, parser, the HTTP status each host returned during the capture run, and how many records it produced. Two hosts are unreachable and the page says so loudly. |
| **Accuracy** | The auto-publish gate, and the fact that nothing has been measured against it yet. |
| **Method** | The rules in prose: three tiers, the mechanical check, sourcing, and what is not built yet. |

`src/data.js` is the captured corpus and the working record schema.
`src/pipeline.js` replays the run that produced it — the source probes, the ten
detections, the parses, the one executed check — then holds at the end state
rather than looping. Swap the replay for a live watcher and no view changes,
because every view renders from `Store` and re-renders on `Store` events.

The transport control in the masthead pauses the replay, speeds it up, or
restarts it.

## The record

| Field | Notes |
| --- | --- |
| `id` | Stable slug. Never reused, never renumbered. |
| `title` | Name of the amending instrument. |
| `family` | Law family used for filtering. |
| `amends` | Parent act plus the section or rule touched. |
| `changeType` | `insertion`, `omission`, `substitution`, `supersession`, `commencement`. Decides which automation rules may apply. |
| `summary` | One paragraph, plain language. |
| `body` | Issuing authority. |
| `reference` | Gazette or notification number. |
| `published` | Date of the notification. |
| `effective` | Date it comes into force. May be a phrase when notified in tranches. |
| `status` | `auto`, `reconciled`, or `verified`. |
| `sourceUrl` | Link to the original. Required on every record. |
| `appliesTo` | Who the change actually binds. Display only. |
| `pdfUrl` | Direct link to the original PDF where the source publishes one. |
| `pipeline` | The audit surface: `firstSeen`, `provenance[]` (byte counts and hashes), `parse`, `check`, `diff`, `audit[]`. Never edited by hand. |

## Publication rules

Three tiers, published off one pipeline:

- **auto** — machine-extracted, live immediately, labelled as unchecked.
- **reconciled** — two independent sources produced an identical record.
- **verified** — a human cleared it.

Speed comes from tier one, trust from tier three. The label on the record is
what keeps that honest. Nothing is ever silently upgraded: every promotion is
written into the record's own audit trail and is visible from the drawer.

`commencement` entries never auto-promote past `auto`, regardless of confidence.
Commencement scope in Indian law cannot be determined mechanically — sections of
an act are routinely brought into force in tranches years apart.

## The mechanical check

For a substitution, the extracted old text must appear verbatim **exactly once**
at the cited section of the base text. Exactly once matters as much as verbatim:
text that occurs twice could attach to either position, so the change is not
provable. Pass means the change can publish unattended. Fail routes to review —
and still publishes at `auto`, because a record labelled unchecked is more useful
than a record nobody can see.

## Next steps

1. **Golden dataset and scoring harness.** 200 historical amendments with known
   correct output. Accuracy measured per `changeType`. Auto-publish is enabled
   per class only once that class measures above 99%. *(Scores are shown in the
   Accuracy view; the harness itself is not built.)*
2. **Source registry.** One config entry per watched source: URL, poll cadence,
   parser, expected update frequency. *(Nine of forty-two configured.)*
3. **Dead-man's-switch monitoring.** Alert when a source that normally produces
   updates goes quiet longer than its usual gap. A scraper returning zero results
   after a site redesign is silent failure, and it is the main operational risk.
4. **Watchers.** Scheduled jobs against the registry, hashing listing pages.
5. **Extraction.** Gazette or circular PDF to a structured record via the Claude
   API, against a strict JSON schema.
6. **Verification check.** For a substitution, confirm the extracted old text
   appears verbatim exactly once at the cited section of the base text.
7. **Storage.** Move `data.js` into a real database with full version history, so
   any section can be rendered as it stood on any date.

## Sourcing

Build the corpus from primary sources only — India Code for the baseline, the
Gazette of India for authority, ministry notification pages for speed. Never
build the obligation database from a competitor's compilation; those are
protectable by selection and arrangement.

Respect `robots.txt`, rate limit, and record provenance for every row.

## Files

```
index.html        five views, one page
src/styles.css    the whole design system
src/data.js       record schema, source registry, golden scores, seed register
src/pipeline.js   stages, inbound records, the scripted run, the Store
src/app.js        views, the record drawer, transport controls
```

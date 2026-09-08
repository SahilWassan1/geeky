# Compliance Wiki

Every Indian Act, rule and amendment in one searchable register, with the source
and a verification status on every entry — and the ingestion pipeline running in
the open next to it.

Open `index.html` in a browser. No build step, no dependencies.

## What exists now

A working front end over seeded data, in five views:

| View | What it shows |
| --- | --- |
| **Register** | The public wiki. Full-text search, filters by law family and verification status, and a record drawer on every entry: all twelve schema fields, who the change touches, the before/after text, the mechanical check that ran, every source capture with its hash, the extraction's per-field confidence, and the full audit trail. |
| **Pipeline** | The live half. Watch → Fetch → Extract → Check → Publish, with jobs moving through it, an event log, session counters, and the verification queue. |
| **Sources** | The source registry — URL, cadence, parser, last check, last change, and the dead-man's-switch threshold per source. One source is currently silent and the page says so loudly. |
| **Accuracy** | Golden-dataset score per `changeType` against the 99% auto-publish gate, and which classes are consequently allowed to publish unattended. |
| **Method** | The rules in prose: three tiers, the mechanical check, sourcing, and what is not built yet. |

`src/data.js` is the working record schema — the ingestion pipeline's job is to
produce objects in exactly that shape. `src/pipeline.js` is a scripted run of
that pipeline; swap `SCRIPT` for a websocket and no view changes, because every
view renders from `Store` and re-renders on `Store` events.

The transport control in the masthead pauses the run or speeds it up. One
simulated second is one wall minute, so a session covers a working morning and
then loops.

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
| `pipeline` | The audit surface: `firstSeen`, `provenance[]`, `extraction`, `check`, `diff`, `audit[]`. Never edited by hand. |

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

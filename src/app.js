/*
 * Views. Every one of them renders from Store and re-renders on Store events,
 * so the live pipeline and the public register are never out of step.
 */

const STATUS_LABEL = {
  verified: "Verified",
  reconciled: "Reconciled",
  auto: "Auto, unchecked",
};

const CHECK_LABEL = {
  pass: "Check passed",
  fail: "Check failed — in review",
  blocked: "Auto-promotion blocked",
  review: "Routed to review",
};

const ACTOR_LABEL = {
  watcher: "watcher",
  extractor: "extractor",
  checker: "checker",
  reconciler: "reconciler",
  publisher: "publisher",
  gate: "gate",
  queue: "queue",
};

const state = {
  view: "register",
  query: "",
  families: new Set(),
  statuses: new Set(),
  open: null,
};

const el = {
  search: document.getElementById("search"),
  familyRow: document.getElementById("family-filters"),
  statusRow: document.getElementById("status-filters"),
  register: document.getElementById("register"),
  count: document.getElementById("count"),
  board: document.getElementById("board"),
  stats: document.getElementById("stats"),
  log: document.getElementById("log"),
  queue: document.getElementById("queue"),
  sourcesBody: document.getElementById("sources-body"),
  sourcesFoot: document.getElementById("sources-foot"),
  sourceAlert: document.getElementById("source-alert"),
  gates: document.getElementById("gates"),
  drawerRoot: document.getElementById("drawer-root"),
  simclock: document.getElementById("simclock"),
  pulse: document.getElementById("pulse"),
  syncText: document.getElementById("sync-text"),
  playpause: document.getElementById("playpause"),
  badgeNew: document.getElementById("badge-new"),
};

/* ---------------------------------------------------------------- utils */

const IST = "Asia/Kolkata"; /* every timestamp in the system is Indian standard time */

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return iso;
  const d = new Date(String(iso).slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatStamp(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: IST }) +
    " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST })
  );
}

function clockText(d) {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
}

function relMinutes(mins) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)} min ago`;
  const h = mins / 60;
  if (h < 48) return `${Math.round(h)} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function relHours(hours) {
  if (hours < 1) return "just now";
  if (hours < 48) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/* -------------------------------------------------------------- register */

function matches(change) {
  if (state.families.size && !state.families.has(change.family)) return false;
  if (state.statuses.size && !state.statuses.has(change.status)) return false;
  if (!state.query) return true;

  const haystack = [
    change.title,
    change.amends,
    change.summary,
    change.body,
    change.reference,
    change.family,
    change.changeType,
    (change.appliesTo || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return state.query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function renderEntry(change) {
  const effective =
    change.effective === "Notified in tranches"
      ? "Commencement in tranches"
      : "In force " + formatDate(change.effective);
  const check = change.pipeline.check;
  const isNew = Store.newSincePageLoad.has(change.id);

  return `
    <article class="entry${isNew ? " is-new" : ""}" data-id="${escapeHtml(change.id)}" tabindex="0" role="button"
             aria-label="Open record: ${escapeHtml(change.title)}">
      <div class="entry-date">${escapeHtml(formatDate(change.published))}</div>
      <div>
        <h2 class="entry-title">${escapeHtml(change.title)}${
    isNew ? '<span class="tag-new">new</span>' : ""
  }</h2>
        <p class="entry-amends">${escapeHtml(change.amends)}</p>
        <p class="entry-summary">${escapeHtml(change.summary)}</p>
        <div class="entry-meta">
          <span>${escapeHtml(change.body)}</span>
          <span class="ref">${escapeHtml(change.reference)}</span>
          <span>${escapeHtml(change.changeType)}</span>
          <a href="${escapeHtml(change.sourceUrl)}" rel="noreferrer" target="_blank">Source</a>
        </div>
      </div>
      <div class="entry-status">
        <span class="status status-${escapeHtml(change.status)}">${
    STATUS_LABEL[change.status] || change.status
  }</span>
        <span class="effective">${escapeHtml(effective)}</span>
        <span class="check-flag ${escapeHtml(check.result)}">${escapeHtml(
    CHECK_LABEL[check.result] || check.result
  )}</span>
      </div>
    </article>`;
}

function clearFilters() {
  state.query = "";
  state.families.clear();
  state.statuses.clear();
  el.search.value = "";
  document.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
  renderRegister();
}

function renderRegister() {
  const all = Store.changes;
  const results = all.filter(matches).sort((a, b) => new Date(b.published) - new Date(a.published));
  const fresh = Store.newSincePageLoad.size;

  el.count.innerHTML =
    (results.length === all.length
      ? `<span>${all.length} changes on record</span>`
      : `<span>${results.length} of ${all.length} changes</span>`) +
    (fresh
      ? `<span class="live">${fresh} updated since you opened this page</span>`
      : `<span>watching for updates…</span>`);

  if (fresh) {
    el.badgeNew.hidden = false;
    el.badgeNew.textContent = String(fresh);
  }

  if (!results.length) {
    el.register.innerHTML = `
      <div class="empty">
        <p>Nothing on record matches that. Try a section number, a form name, or the issuing body.</p>
        <button type="button" id="reset">Clear filters</button>
      </div>`;
    document.getElementById("reset").addEventListener("click", clearFilters);
    return;
  }

  el.register.innerHTML = results.map(renderEntry).join("");
}

function buildChips(container, values, bucket, labels) {
  container.innerHTML = values
    .map(
      (value) =>
        `<button type="button" class="chip" aria-pressed="false" data-value="${escapeHtml(value)}">${escapeHtml(
          labels ? labels[value] : value
        )}</button>`
    )
    .join("");

  container.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    const value = chip.dataset.value;
    const on = chip.getAttribute("aria-pressed") === "true";
    chip.setAttribute("aria-pressed", String(!on));
    if (on) bucket.delete(value);
    else bucket.add(value);
    renderRegister();
  });
}

/* ---------------------------------------------------------------- drawer */

function confidenceRow(field, value) {
  const pct = Math.round(value * 100);
  return `
    <div class="conf-row">
      <span>${escapeHtml(field)}</span>
      <span class="conf-bar"><span class="conf-fill${value < 0.9 ? " low" : ""}" style="width:${pct}%"></span></span>
      <span class="conf-value">${pct}%</span>
    </div>`;
}

function renderDrawer() {
  if (!state.open) {
    el.drawerRoot.innerHTML = "";
    return;
  }
  const c = Store.byId(state.open);
  if (!c) {
    el.drawerRoot.innerHTML = "";
    return;
  }
  const p = c.pipeline;

  const provenance = p.provenance.length
    ? p.provenance
        .map((row) => {
          const src = SOURCE_BY_ID[row.source];
          return `
          <li>
            <span class="when">${escapeHtml(formatStamp(row.at))}</span>
            <span class="actor">${escapeHtml(src ? src.body : row.source)}</span>
            <span>${escapeHtml(row.doc)}${row.pages ? ` · ${row.pages} pp` : ""}<br />
              <span class="ref">${escapeHtml(row.hash)}</span></span>
          </li>`;
        })
        .join("")
    : `<li><span class="when">—</span><span class="actor">none</span><span>No capture recorded.</span></li>`;

  const sourceCount = new Set(p.provenance.map((r) => r.source)).size;

  el.drawerRoot.innerHTML = `
    <div class="scrim" data-close="1"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(c.title)}">
      <div class="drawer-head">
        <div>
          <h2>${escapeHtml(c.title)}</h2>
          <span class="status status-${escapeHtml(c.status)}">${escapeHtml(
    STATUS_LABEL[c.status] || c.status
  )}</span>
          <span class="check-flag ${escapeHtml(p.check.result)}" style="margin-left:10px">${escapeHtml(
    CHECK_LABEL[p.check.result] || p.check.result
  )}</span>
        </div>
        <button type="button" class="drawer-close" data-close="1" aria-label="Close">×</button>
      </div>

      <div class="drawer-body">
        <div class="section">
          <h3>The record</h3>
          <dl class="kv">
            <dt>id</dt><dd class="mono">${escapeHtml(c.id)}</dd>
            <dt>family</dt><dd>${escapeHtml(c.family)}</dd>
            <dt>amends</dt><dd>${escapeHtml(c.amends)}</dd>
            <dt>changeType</dt><dd>${escapeHtml(c.changeType)}</dd>
            <dt>body</dt><dd>${escapeHtml(c.body)}</dd>
            <dt>reference</dt><dd class="mono">${escapeHtml(c.reference)}</dd>
            <dt>published</dt><dd>${escapeHtml(formatDate(c.published))}</dd>
            <dt>effective</dt><dd>${escapeHtml(
              /^\d{4}-/.test(c.effective) ? formatDate(c.effective) : c.effective
            )}</dd>
            <dt>status</dt><dd>${escapeHtml(STATUS_LABEL[c.status] || c.status)}</dd>
            <dt>sourceUrl</dt><dd><a href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(
    c.sourceUrl
  )}</a></dd>
          </dl>
          <p class="entry-summary" style="margin-top:14px">${escapeHtml(c.summary)}</p>
        </div>

        <div class="section">
          <h3>Who this touches</h3>
          <ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-soft)">
            ${(c.appliesTo || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
          </ul>
        </div>

        <div class="section">
          <h3>What changed</h3>
          <div class="diff">
            <div class="diff-cite">${escapeHtml(p.diff.cite)}</div>
            <div class="diff-row diff-before"><span class="mark">−</span><span>${escapeHtml(
              p.diff.before
            )}</span></div>
            <div class="diff-row diff-after"><span class="mark">+</span><span>${escapeHtml(
              p.diff.after
            )}</span></div>
          </div>
        </div>

        <div class="section">
          <h3>Mechanical check — ${escapeHtml(p.check.name)}</h3>
          <p class="callout ${escapeHtml(p.check.result)}">${escapeHtml(p.check.detail)}</p>
          ${
            p.check.occurrences !== null && p.check.occurrences !== undefined
              ? `<dl class="kv" style="margin-top:12px"><dt>occurrences</dt><dd class="mono">${escapeHtml(
                  p.check.occurrences
                )} — pass requires exactly 1</dd></dl>`
              : ""
          }
        </div>

        <div class="section">
          <h3>Provenance — ${sourceCount} independent source${sourceCount === 1 ? "" : "s"}</h3>
          <ul class="timeline">${provenance}</ul>
          ${
            sourceCount < 2
              ? `<p class="callout" style="margin-top:12px">One source only. A record cannot reach <em>reconciled</em> until a second independent source produces an identical record.</p>`
              : ""
          }
        </div>

        <div class="section">
          <h3>Extraction</h3>
          <dl class="kv">
            <dt>model</dt><dd class="mono">${escapeHtml(p.extraction.model)}</dd>
            <dt>schema</dt><dd class="mono">${escapeHtml(p.extraction.schema)}</dd>
            <dt>tokens</dt><dd class="mono">${p.extraction.tokens.toLocaleString("en-IN")}</dd>
            <dt>schema retries</dt><dd class="mono">${escapeHtml(p.extraction.retries)}</dd>
          </dl>
          <div class="confidence" style="margin-top:14px">
            ${Object.entries(p.extraction.confidence)
              .map(([field, value]) => confidenceRow(field, value))
              .join("")}
          </div>
          <p class="search-note">Field confidence is reported, never acted on alone. Promotion is decided by the mechanical check and the class gate.</p>
        </div>

        <div class="section">
          <h3>Audit trail</h3>
          <ul class="timeline">
            ${p.audit
              .map(
                (row) => `
              <li>
                <span class="when">${escapeHtml(formatStamp(row.at))}</span>
                <span class="actor">${escapeHtml(ACTOR_LABEL[row.actor] || row.actor)}</span>
                <span>${escapeHtml(row.action)}</span>
              </li>`
              )
              .join("")}
          </ul>
        </div>
      </div>
    </aside>`;
}

function openRecord(id) {
  state.open = id;
  renderDrawer();
}

function closeRecord() {
  state.open = null;
  renderDrawer();
}

/* -------------------------------------------------------------- pipeline */

function renderBoard() {
  el.board.innerHTML = STAGES.map((stage) => {
    const jobs = Store.jobs.filter((j) => j.stage === stage.id);
    return `
      <div class="lane">
        <div class="lane-head">
          <h3>${escapeHtml(stage.label)}</h3>
          <p>${escapeHtml(stage.blurb)}</p>
        </div>
        <div class="lane-body">
          ${
            jobs.length
              ? jobs
                  .map((job) => {
                    const last = job.log[job.log.length - 1];
                    const rec = INBOUND_BY_ID[job.id];
                    const held = rec && rec.pipeline.check.result !== "pass" && stage.id === "publish";
                    return `
                <div class="job${held ? " held" : job.done ? " done" : ""}">
                  <strong>${escapeHtml(job.title)}</strong>
                  <span class="job-meta">${escapeHtml(job.changeType)} · ${escapeHtml(
                      clockText(job.startedAt)
                    )}</span>
                  <div class="job-note">${escapeHtml(last ? last.text : "")}</div>
                </div>`;
                  })
                  .join("")
              : `<p class="lane-empty">idle</p>`
          }
        </div>
      </div>`;
  }).join("");
}

function renderStats() {
  const c = Store.counters;
  const live = Store.changes.length;
  const unchecked = Store.changes.filter((x) => x.status === "auto").length;
  const stats = [
    [live, "changes on record"],
    [c.polls, "listing polls this session"],
    [c.detected, "changes detected"],
    [c.published, "published to the register"],
    [c.promoted, "tier promotions"],
    [unchecked, "still labelled unchecked"],
  ];
  el.stats.innerHTML = stats
    .map(([n, k]) => `<div class="stat"><div class="n">${escapeHtml(n)}</div><div class="k">${escapeHtml(k)}</div></div>`)
    .join("");
}

function renderLog() {
  if (!Store.events.length) {
    el.log.innerHTML = `<div class="log-line"><span class="t">—</span><span class="log-kind">idle</span><span>Waiting for the first poll.</span></div>`;
    return;
  }
  el.log.innerHTML = Store.events
    .slice(0, 60)
    .map(
      (e) => `
      <div class="log-line">
        <span class="t">${escapeHtml(clockText(e.wall))}</span>
        <span class="log-kind ${escapeHtml(e.kind)}">${escapeHtml(e.kind)}</span>
        <span>${escapeHtml(e.text)}</span>
      </div>`
    )
    .join("");
}

function renderQueue() {
  const queued = Store.changes.filter(
    (c) => c.status === "auto" || (c.status === "reconciled" && c.pipeline.check.result !== "pass")
  );
  if (!queued.length) {
    el.queue.innerHTML = `<p class="lane-empty">Queue is clear.</p>`;
    return;
  }
  el.queue.innerHTML =
    `<p class="search-note" style="margin:0 0 10px">${queued.length} record${
      queued.length === 1 ? "" : "s"
    } live and labelled unchecked, waiting on a human. They are public the whole time.</p>` +
    queued
      .map(
        (c) => `
      <div class="job held" data-id="${escapeHtml(c.id)}" role="button" tabindex="0" style="cursor:pointer;margin-bottom:8px">
        <strong>${escapeHtml(c.title)}</strong>
        <span class="job-meta">${escapeHtml(c.reference)} · ${escapeHtml(c.changeType)}</span>
        <div class="job-note">${escapeHtml(CHECK_LABEL[c.pipeline.check.result] || "")} — ${escapeHtml(
          c.pipeline.check.name
        )}</div>
      </div>`
      )
      .join("");
}

/* --------------------------------------------------------------- sources */

function renderSources() {
  const silent = SOURCES.filter((s) => s.health === "silent");
  el.sourceAlert.innerHTML = silent.length
    ? silent
        .map(
          (s) => `<div class="banner"><strong>Dead-man's switch fired — ${escapeHtml(
            s.name
          )}.</strong> ${escapeHtml(s.note)}</div>`
        )
        .join("")
    : "";

  el.sourcesBody.innerHTML = SOURCES.map((s) => {
    const overdue = s.lastChangeHours > s.expectedGapHours;
    return `
      <tr class="${s.health === "silent" ? "row-silent" : ""}">
        <td>
          <div class="src-name">${escapeHtml(s.name)}</div>
          <div class="src-url">${escapeHtml(s.url)}</div>
          ${s.note ? `<div class="src-note">${escapeHtml(s.note)}</div>` : ""}
        </td>
        <td class="mono">${escapeHtml(s.cadence >= 1440 ? "daily" : s.cadence + " min")}</td>
        <td class="mono">${escapeHtml(s.parser)}</td>
        <td class="mono">${escapeHtml(relMinutes(s.lastCheckMin))}</td>
        <td class="mono">${escapeHtml(relHours(s.lastChangeHours))}</td>
        <td>
          <span class="health"><span class="dot ${escapeHtml(s.health)}"></span>${escapeHtml(
      s.health === "silent"
        ? "fired"
        : overdue
        ? "overdue"
        : "expects ≤ " + Math.round(s.expectedGapHours / 24) + " d"
    )}</span>
        </td>
      </tr>`;
  }).join("");

  el.sourcesFoot.textContent = `${SOURCES.length} of ${SOURCE_TOTAL} sources shown. The rest are configured but not yet parsed — a source with no parser is a source we are not really watching.`;
}

/* -------------------------------------------------------------- accuracy */

function renderGates() {
  el.gates.innerHTML = GOLDEN.map((g) => {
    const pct = g.accuracy * 100;
    const under = g.accuracy < g.gate;
    const scale = (v) => ((v - 0.85) / 0.15) * 100; /* 85%–100% window */
    return `
      <div style="padding:14px 0;border-bottom:1px solid var(--rule)">
        <div class="gate-row">
          <div>
            <div style="font-weight:500">${escapeHtml(g.changeType)}</div>
            <div class="search-note" style="margin:0">${escapeHtml(g.n)} golden records</div>
          </div>
          <div class="gate-bar">
            <div class="gate-fill${under ? " under" : ""}" style="width:${Math.max(2, scale(g.accuracy))}%"></div>
            <div class="gate-mark" style="left:${scale(g.gate)}%"></div>
          </div>
          <div class="gate-verdict ${g.autoPublish ? "on" : "off"}">
            <div class="mono" style="font-family:var(--mono);font-size:13px">${pct.toFixed(1)}%</div>
            <div>${g.autoPublish ? "auto-publish on" : "auto-publish off"}</div>
          </div>
        </div>
        <p class="src-note" style="margin:8px 0 0;max-width:74ch">${escapeHtml(g.failNote)} <span class="search-note">Last scored ${escapeHtml(
      formatDate(g.lastRun)
    )}; gate at ${(g.gate * 100).toFixed(0)}%.</span></p>
      </div>`;
  }).join("");
}

/* ------------------------------------------------------------ transport */

function renderClock() {
  const now = wallClock(Store.clock);
  el.simclock.textContent = clockText(now);
  el.pulse.classList.toggle("paused", !Store.running);
  el.playpause.textContent = Store.running ? "Pause" : "Resume";
  el.playpause.setAttribute("aria-pressed", String(!Store.running));
  const src = SOURCES.reduce((a, b) => (a.lastCheckMin <= b.lastCheckMin ? a : b));
  el.syncText.textContent = `${SOURCE_TOTAL} sources watched · last checked ${relMinutes(src.lastCheckMin)}`;
}

/* ------------------------------------------------------------ view swap */

function showView(name) {
  state.view = name;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.view === name));
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.hidden = view.id !== "view-" + name;
  });
  if (name === "register") renderRegister();
  if (name === "pipeline") {
    renderBoard();
    renderStats();
    renderLog();
    renderQueue();
  }
  if (name === "sources") renderSources();
  if (name === "accuracy") renderGates();
}

/* ------------------------------------------------------------------ wire */

buildChips(el.familyRow, FAMILIES, state.families);
buildChips(el.statusRow, ["verified", "reconciled", "auto"], state.statuses, STATUS_LABEL);

el.search.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  renderRegister();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => showView(tab.dataset.view));
});

el.playpause.addEventListener("click", () => Store.toggle());

document.querySelectorAll(".speed").forEach((btn) => {
  btn.addEventListener("click", () => {
    const speed = Number(btn.dataset.speed);
    document.querySelectorAll(".speed").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    Store.setSpeed(speed);
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close]")) {
    closeRecord();
    return;
  }
  if (event.target.closest("a")) return;
  const entry = event.target.closest(".entry, .job[data-id]");
  if (entry && entry.dataset.id) openRecord(entry.dataset.id);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeRecord();
  if ((event.key === "Enter" || event.key === " ") && document.activeElement) {
    const entry = document.activeElement.closest(".entry, .job[data-id]");
    if (entry && entry.dataset.id) {
      event.preventDefault();
      openRecord(entry.dataset.id);
    }
  }
});

Store.on((what) => {
  if (what === "register") {
    if (state.view === "register") renderRegister();
    renderDrawer();
  }
  if (what === "pipeline" && state.view === "pipeline") {
    renderBoard();
    renderStats();
    renderQueue();
  }
  if (what === "sources" && state.view === "sources") renderSources();
  if (what === "clock") {
    renderClock();
    if (state.view === "pipeline") {
      renderLog();
      renderBoard();
      renderStats();
    }
    if (state.view === "sources") renderSources();
    if (state.view === "register") {
      el.badgeNew.hidden = Store.newSincePageLoad.size === 0;
      el.badgeNew.textContent = String(Store.newSincePageLoad.size);
    }
  }
});

renderRegister();
renderClock();
showView("register");

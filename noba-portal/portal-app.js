// ── NOBA Group Portal App ──────────────────────────────────────────────────
// Config — replace with your Supabase credentials
const SUPABASE_URL      = 'https://lujdurappgxkeedltifc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JteWrFxEYf8-XFEtgPtr1Q_fCRp5Vx_';

const GROUP = window.NOBA_GROUP; // { id, name, color }
const db    = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── SEGMENTS ────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { name: 'Segue',          duration: 300,  desc: 'Personal wins — what\'s good?' },
  { name: 'Scorecard',      duration: 300,  desc: 'Review numbers — no discussion.' },
  { name: 'Rock Review',    duration: 300,  desc: '90-day goals — on track or off?' },
  { name: 'Headlines',      duration: 300,  desc: 'Personal & life updates.' },
  { name: 'Todo Review',    duration: 300,  desc: 'Done or not done?' },
  { name: 'IDS',            duration: 1500, desc: 'Identify, Discuss, Solve.' },
  { name: 'Conclude',       duration: 600,  desc: 'Rate the meeting. Close out.' },
];
const TOTAL_SECS = SEGMENTS.reduce((s, x) => s + x.duration, 0);

// ── TIMER STATE ──────────────────────────────────────────────────────────────
let timerState = {
  seg: 0, secsLeft: SEGMENTS[0].duration, running: false, interval: null,
  elapsed: 0
};

// ── RENDER ROOT ──────────────────────────────────────────────────────────────
const app = document.getElementById('app');

function fmt(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function getWeekStart(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7); // Monday
  return d.toISOString().slice(0, 10);
}

// ── MAIN SHELL ───────────────────────────────────────────────────────────────
function renderShell() {
  app.innerHTML = `
    <nav class="g-nav">
      <a href="../" class="g-nav-back">← Portal</a>
      <div class="g-nav-center">
        <span class="g-badge"><svg viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M2,1 L26,1 L26,18 C26,26 14,31 14,31 C14,31 2,26 2,18 Z" fill="${GROUP.color}" stroke="rgba(255,255,255,0.18)" stroke-width="0.75"/><text x="14" y="11" text-anchor="middle" dominant-baseline="central" font-family="'Barlow Condensed',sans-serif" font-weight="800" font-size="${GROUP.initials.length > 1 ? '6' : '10'}" fill="rgba(245,240,232,0.9)" letter-spacing="0.5">${GROUP.initials}</text></svg></span>
        <span class="g-nav-name">${GROUP.name}</span>
      </div>
      <div></div>
    </nav>
    <div class="g-tabs">
      <button class="g-tab active" data-tab="timer">⏱ Meeting</button>
      <button class="g-tab" data-tab="scorecard">📊 Scorecard</button>
      <button class="g-tab" data-tab="rocks">🪨 Rocks</button>
      <button class="g-tab" data-tab="issues">💡 Issues</button>
    </div>
    <div class="g-content" id="gContent"></div>
  `;
  document.querySelectorAll('.g-tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });
  switchTab('timer');
}

function switchTab(tab) {
  document.querySelectorAll('.g-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  const c = document.getElementById('gContent');
  if      (tab === 'timer')     renderTimer(c);
  else if (tab === 'scorecard') renderScorecard(c);
  else if (tab === 'rocks')     renderRocks(c);
  else if (tab === 'issues')    renderIssues(c);
}

// ── TIMER ────────────────────────────────────────────────────────────────────
function renderTimer(c) {
  const ts = timerState;
  const seg = SEGMENTS[ts.seg];
  const pct = ((seg.duration - ts.secsLeft) / seg.duration) * 100;
  const totalElapsed = SEGMENTS.slice(0, ts.seg).reduce((s, x) => s + x.duration, 0)
                     + (seg.duration - ts.secsLeft);
  const totalPct = (totalElapsed / TOTAL_SECS) * 100;
  const warn = ts.secsLeft <= 30 && ts.running;

  c.innerHTML = `
    <div class="timer-wrap">
      <div class="timer-left">
        <div class="timer-seg-name">${seg.name}</div>
        <div class="timer-seg-desc">${seg.desc}</div>
        <div class="timer-display ${warn ? 'timer-warn' : ''}">${fmt(ts.secsLeft)}</div>
        <div class="timer-seg-bar-wrap">
          <div class="timer-seg-bar" style="width:${pct}%"></div>
        </div>
        <div class="timer-controls">
          <button class="btn-t" id="tPrev" ${ts.seg === 0 ? 'disabled' : ''}>← Prev</button>
          <button class="btn-t btn-t--primary" id="tPlay">${ts.running ? '⏸ Pause' : '▶ Start'}</button>
          <button class="btn-t" id="tNext" ${ts.seg === SEGMENTS.length - 1 ? 'disabled' : ''}>Next →</button>
        </div>
        <div class="timer-total-wrap">
          <div class="timer-total-label">Overall Progress</div>
          <div class="timer-seg-bar-wrap">
            <div class="timer-seg-bar timer-total-bar" style="width:${totalPct}%"></div>
          </div>
          <div class="timer-total-label">${fmt(totalElapsed)} / ${fmt(TOTAL_SECS)}</div>
        </div>
      </div>
      <div class="timer-right">
        ${SEGMENTS.map((s, i) => `
          <div class="seg-row ${i === ts.seg ? 'seg-row--active' : i < ts.seg ? 'seg-row--done' : ''}">
            <span class="seg-row-dot">${i < ts.seg ? '✓' : i === ts.seg ? '▶' : String(i+1)}</span>
            <span class="seg-row-name">${s.name}</span>
            <span class="seg-row-dur">${fmt(s.duration)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('tPlay').addEventListener('click', () => {
    if (ts.running) {
      clearInterval(ts.interval);
      ts.running = false;
    } else {
      ts.running = true;
      ts.interval = setInterval(() => {
        ts.secsLeft--;
        if (ts.secsLeft <= 0) {
          if (ts.seg < SEGMENTS.length - 1) {
            ts.seg++;
            ts.secsLeft = SEGMENTS[ts.seg].duration;
          } else {
            clearInterval(ts.interval);
            ts.running = false;
            ts.secsLeft = 0;
          }
        }
        renderTimer(document.getElementById('gContent'));
      }, 1000);
    }
    renderTimer(document.getElementById('gContent'));
  });

  document.getElementById('tPrev').addEventListener('click', () => {
    clearInterval(ts.interval); ts.running = false;
    if (ts.seg > 0) { ts.seg--; ts.secsLeft = SEGMENTS[ts.seg].duration; }
    renderTimer(document.getElementById('gContent'));
  });

  document.getElementById('tNext').addEventListener('click', () => {
    clearInterval(ts.interval); ts.running = false;
    if (ts.seg < SEGMENTS.length - 1) { ts.seg++; ts.secsLeft = SEGMENTS[ts.seg].duration; }
    renderTimer(document.getElementById('gContent'));
  });
}

// ── SCORECARD ────────────────────────────────────────────────────────────────
let scWeekOffset = 0;
let scMetrics = [];
let scEntries = [];
let scPendingMembers = new Set(); // members added locally but not yet in DB

async function renderScorecard(c) {
  c.innerHTML = `<div class="loading">Loading scorecard…</div>`;
  const week = getWeekStart(scWeekOffset);

  const [{ data: metrics }, { data: entries }] = await Promise.all([
    db.from('scorecard_metrics').select('*').eq('group_id', GROUP.id).order('sort_order'),
    db.from('scorecard_entries').select('*').eq('group_id', GROUP.id).eq('week_start', week),
  ]);

  scMetrics  = metrics  || [];
  scEntries  = entries  || [];

  // Get unique member names — include pending (locally added, no DB entries yet)
  const members = [...new Set([...scEntries.map(e => e.member_name), ...scPendingMembers])].sort();

  const weekLabel = new Date(week + 'T12:00:00').toLocaleDateString('en-US',
    { month: 'short', day: 'numeric', year: 'numeric' });

  c.innerHTML = `
    <div class="sc-wrap">
      <div class="sc-toolbar">
        <div class="sc-week-nav">
          <button class="btn-sm" id="scPrev">← Prev</button>
          <span class="sc-week-label">Week of ${weekLabel}</span>
          <button class="btn-sm" id="scNext" ${scWeekOffset >= 0 ? 'disabled' : ''}>Next →</button>
        </div>
        <button class="btn-sm btn-sm--bronze" id="scAddMetric">+ Metric</button>
      </div>

      <div class="sc-table-wrap">
        <table class="sc-table">
          <thead>
            <tr>
              <th>Member</th>
              ${scMetrics.map(m => `<th title="Target: ${m.target}${m.unit}">${m.name}<br><span class="sc-target">target: ${m.target}${m.unit}</span></th>`).join('')}
              ${scMetrics.length === 0 ? '<th class="sc-empty-col">Add a metric to get started</th>' : ''}
            </tr>
          </thead>
          <tbody id="scBody">
            ${members.map(mem => renderScRow(mem, week)).join('')}
            ${members.length === 0 ? `<tr><td colspan="${scMetrics.length + 1}" class="sc-empty">No entries yet this week.</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <div class="sc-add-row">
        <input type="text" id="scNewMember" placeholder="Your name" class="g-input" style="max-width:200px">
        <button class="btn-sm btn-sm--bronze" id="scAddRow">+ Add Your Row</button>
      </div>
    </div>
  `;

  document.getElementById('scPrev').addEventListener('click', () => { scWeekOffset--; renderScorecard(c); });
  document.getElementById('scNext').addEventListener('click', () => { scWeekOffset++; renderScorecard(c); });
  document.getElementById('scAddRow').addEventListener('click', () => addScRow(c, week));
  document.getElementById('scAddMetric').addEventListener('click', () => addMetricPrompt(c));

  // Wire up cell inputs
  c.querySelectorAll('.sc-cell').forEach(input => {
    input.addEventListener('change', async (e) => {
      const { membername, metricid } = e.target.dataset;
      const val = parseFloat(e.target.value);
      const metric = scMetrics.find(m => m.id === metricid);
      e.target.parentElement.style.background = metric && val >= metric.target
        ? 'rgba(61,107,56,0.35)' : 'rgba(185,28,28,0.25)';
      await db.from('scorecard_entries').upsert({
        group_id: GROUP.id, member_name: membername,
        metric_id: metricid, week_start: week, value: val,
      }, { onConflict: 'group_id,member_name,metric_id,week_start' });
    });
  });
}

function renderScRow(member, week) {
  return `<tr>
    <td class="sc-member">${member}</td>
    ${scMetrics.map(m => {
      const entry = scEntries.find(e => e.member_name === member && e.metric_id === m.id);
      const val   = entry ? entry.value : '';
      const hit   = entry && val >= m.target;
      const miss  = entry && val < m.target;
      return `<td style="background:${hit ? 'rgba(61,107,56,0.35)' : miss ? 'rgba(185,28,28,0.25)' : ''}">
        <input type="number" class="sc-cell" value="${val}" data-membername="${member}" data-metricid="${m.id}">
      </td>`;
    }).join('')}
  </tr>`;
}

async function addScRow(c, week) {
  const name = document.getElementById('scNewMember').value.trim();
  if (!name) return;
  scPendingMembers.add(name);
  renderScorecard(c);
}

async function addMetricPrompt(c) {
  const name   = prompt('Metric name (e.g. "Workouts"):');
  if (!name) return;
  const target = parseFloat(prompt('Target value (e.g. 3):') || '1');
  const unit   = prompt('Unit (e.g. "x" or "hrs", leave blank if none):') || '';
  await db.from('scorecard_metrics').insert({
    group_id: GROUP.id, name, target, unit, sort_order: scMetrics.length
  });
  renderScorecard(c);
}

// ── ROCKS ────────────────────────────────────────────────────────────────────
let expandedRock = null;

async function renderRocks(c) {
  c.innerHTML = `<div class="loading">Loading rocks…</div>`;
  const { data: rocks } = await db.from('rocks').select('*, milestones(*)').eq('group_id', GROUP.id).order('created_at');
  const items = rocks || [];

  const STATUS_COLORS = { on_track: '#3d6b38', off_track: '#b45309', complete: '#1d4ed8', dropped: '#4b5563' };
  const STATUS_LABELS = { on_track: 'On Track', off_track: 'Off Track', complete: 'Complete', dropped: 'Dropped' };

  c.innerHTML = `
    <div class="list-wrap">
      <div class="list-toolbar">
        <span class="list-count">${items.filter(r => r.status !== 'complete' && r.status !== 'dropped').length} active rocks</span>
        <button class="btn-sm btn-sm--bronze" id="addRockBtn">+ Add Rock</button>
      </div>

      <div id="rocksList">
        ${items.length === 0 ? '<p class="empty-state">No rocks yet. Add your first 90-day rock.</p>' : ''}
        ${items.map(r => `
          <div class="list-item" id="rock-${r.id}">
            <div class="list-item-header" data-rockid="${r.id}">
              <div class="list-item-left">
                <span class="status-dot" style="background:${STATUS_COLORS[r.status]}"></span>
                <div>
                  <div class="list-item-title">${r.title}</div>
                  <div class="list-item-meta">${r.owner} · Due ${r.due_date || 'TBD'}</div>
                </div>
              </div>
              <div class="list-item-right">
                <span class="status-badge" style="background:${STATUS_COLORS[r.status]}20;color:${STATUS_COLORS[r.status]};border:1px solid ${STATUS_COLORS[r.status]}40">${STATUS_LABELS[r.status]}</span>
                <button class="btn-icon rock-expand" data-rockid="${r.id}">▾</button>
              </div>
            </div>
            <div class="rock-detail ${expandedRock === r.id ? '' : 'hidden'}" id="detail-${r.id}">
              <div class="rock-milestones">
                ${(r.milestones || []).sort((a,b) => new Date(a.due_date) - new Date(b.due_date)).map(m => `
                  <div class="milestone-row">
                    <input type="checkbox" class="ms-check" data-msid="${m.id}" data-rockid="${r.id}" ${m.done ? 'checked' : ''}>
                    <span class="${m.done ? 'ms-done' : ''}">${m.title}</span>
                    <span class="ms-date">${m.due_date || ''}</span>
                  </div>
                `).join('')}
              </div>
              <div class="rock-actions">
                <button class="btn-sm" data-addms="${r.id}">+ Milestone</button>
                <select class="g-select rock-status-sel" data-rockid="${r.id}">
                  ${Object.entries(STATUS_LABELS).map(([k,v]) => `<option value="${k}" ${r.status===k?'selected':''}>${v}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="add-form hidden" id="addRockForm">
        <div class="form-row">
          <input type="text" id="rockTitle" placeholder="Rock title" class="g-input">
          <input type="text" id="rockOwner" placeholder="Owner" class="g-input" style="max-width:160px">
          <input type="date" id="rockDue" class="g-input" style="max-width:160px">
        </div>
        <div class="form-row">
          <button class="btn-sm btn-sm--bronze" id="saveRockBtn">Save Rock</button>
          <button class="btn-sm" id="cancelRockBtn">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('addRockBtn').addEventListener('click', () => {
    document.getElementById('addRockForm').classList.toggle('hidden');
  });
  document.getElementById('cancelRockBtn')?.addEventListener('click', () => {
    document.getElementById('addRockForm').classList.add('hidden');
  });
  document.getElementById('saveRockBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('rockTitle').value.trim();
    const owner = document.getElementById('rockOwner').value.trim();
    const due   = document.getElementById('rockDue').value;
    if (!title || !owner) return;
    await db.from('rocks').insert({ group_id: GROUP.id, title, owner, due_date: due || null });
    renderRocks(c);
  });

  c.querySelectorAll('.rock-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.rockid;
      expandedRock = expandedRock === id ? null : id;
      renderRocks(c);
    });
  });

  c.querySelectorAll('.ms-check').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      await db.from('milestones').update({ done: e.target.checked }).eq('id', e.target.dataset.msid);
      renderRocks(c);
    });
  });

  c.querySelectorAll('[data-addms]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const title = prompt('Milestone title:');
      if (!title) return;
      const due = prompt('Due date (YYYY-MM-DD, optional):') || null;
      await db.from('milestones').insert({ rock_id: btn.dataset.addms, title, due_date: due });
      renderRocks(c);
    });
  });

  c.querySelectorAll('.rock-status-sel').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      await db.from('rocks').update({ status: e.target.value }).eq('id', sel.dataset.rockid);
      renderRocks(c);
    });
  });
}

// ── ISSUES (IDS) ─────────────────────────────────────────────────────────────
let issueFilter = 'open';

async function renderIssues(c) {
  c.innerHTML = `<div class="loading">Loading issues…</div>`;
  let query = db.from('issues').select('*').eq('group_id', GROUP.id).order('created_at', { ascending: false });
  if (issueFilter !== 'all') query = query.eq('status', issueFilter);
  const { data: issues } = await query;
  const items = issues || [];

  const PRI_COLORS = { high: '#b91c1c', medium: '#b45309', low: '#1d4ed8' };

  c.innerHTML = `
    <div class="list-wrap">
      <div class="list-toolbar">
        <div class="filter-tabs">
          ${['open','solved','all'].map(f => `<button class="filter-tab ${issueFilter===f?'active':''}" data-filter="${f}">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`).join('')}
        </div>
        <button class="btn-sm btn-sm--bronze" id="addIssueBtn">+ Add Issue</button>
      </div>

      <div id="issuesList">
        ${items.length === 0 ? '<p class="empty-state">No issues.</p>' : ''}
        ${items.map(issue => `
          <div class="list-item">
            <div class="list-item-header">
              <div class="list-item-left">
                <span class="status-dot" style="background:${PRI_COLORS[issue.priority]}"></span>
                <div>
                  <div class="list-item-title">${issue.title}</div>
                  <div class="list-item-meta">Raised by ${issue.raised_by} · ${new Date(issue.created_at).toLocaleDateString()}</div>
                  ${issue.resolution_note ? `<div class="issue-resolution">✓ ${issue.resolution_note}</div>` : ''}
                </div>
              </div>
              <div class="list-item-right">
                <span class="status-badge" style="background:${PRI_COLORS[issue.priority]}20;color:${PRI_COLORS[issue.priority]};border:1px solid ${PRI_COLORS[issue.priority]}40">${issue.priority}</span>
                ${issue.status === 'open' ? `
                  <button class="btn-sm" data-solve="${issue.id}">Solve</button>
                  <button class="btn-sm" data-drop="${issue.id}">Drop</button>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="add-form hidden" id="addIssueForm">
        <div class="form-row">
          <input type="text" id="issueTitle" placeholder="Issue title" class="g-input">
          <input type="text" id="issueRaisedBy" placeholder="Raised by" class="g-input" style="max-width:160px">
        </div>
        <div class="form-row">
          <label style="color:var(--dim);font-size:.8rem">Priority:</label>
          <select id="issuePriority" class="g-select">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
          <button class="btn-sm btn-sm--bronze" id="saveIssueBtn">Save Issue</button>
          <button class="btn-sm" id="cancelIssueBtn">Cancel</button>
        </div>
      </div>
    </div>
  `;

  c.querySelectorAll('.filter-tab').forEach(t => {
    t.addEventListener('click', () => { issueFilter = t.dataset.filter; renderIssues(c); });
  });
  document.getElementById('addIssueBtn').addEventListener('click', () => {
    document.getElementById('addIssueForm').classList.toggle('hidden');
  });
  document.getElementById('cancelIssueBtn')?.addEventListener('click', () => {
    document.getElementById('addIssueForm').classList.add('hidden');
  });
  document.getElementById('saveIssueBtn')?.addEventListener('click', async () => {
    const title     = document.getElementById('issueTitle').value.trim();
    const raisedBy  = document.getElementById('issueRaisedBy').value.trim();
    const priority  = document.getElementById('issuePriority').value;
    if (!title || !raisedBy) return;
    await db.from('issues').insert({ group_id: GROUP.id, title, raised_by: raisedBy, priority });
    renderIssues(c);
  });

  c.querySelectorAll('[data-solve]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const note = prompt('Resolution note (optional):') || '';
      await db.from('issues').update({
        status: 'solved', resolution_note: note, resolved_at: new Date().toISOString()
      }).eq('id', btn.dataset.solve);
      renderIssues(c);
    });
  });

  c.querySelectorAll('[data-drop]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await db.from('issues').update({ status: 'dropped' }).eq('id', btn.dataset.drop);
      renderIssues(c);
    });
  });
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  :root {
    --bg:#1E2D33; --surface:#2B3F47; --surface2:#3A5560;
    --copper:#B07D4B; --copper-l:#c9944f; --sage:#9EA67C;
    --cream:#F5F0E8; --mid:#8A9AA0; --lt:#3A5560;
  }
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'DM Sans',sans-serif; background:var(--bg); color:var(--cream); min-height:100vh; }

  /* NAV */
  .g-nav { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; background:var(--surface); border-bottom:2px solid var(--copper); }
  .g-nav-back { color:var(--mid); text-decoration:none; font-size:.82rem; transition:color .15s; }
  .g-nav-back:hover { color:var(--copper); }
  .g-nav-center { display:flex; align-items:center; gap:10px; }
  .g-badge { width:28px; height:32px; display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:.7rem; font-weight:800; color:var(--cream); }
  .g-badge svg { width:28px; height:32px; }
  .g-nav-name { font-family:'Playfair Display',serif; font-size:1rem; font-weight:700; color:var(--cream); }

  /* TABS */
  .g-tabs { display:flex; border-bottom:1px solid var(--lt); overflow-x:auto; background:var(--surface); }
  .g-tabs::-webkit-scrollbar { display:none; }
  .g-tab { flex:1; min-width:80px; padding:11px 8px; border:none; background:transparent; color:var(--mid); font-family:'DM Sans',sans-serif; font-size:.82rem; font-weight:500; cursor:pointer; border-bottom:2px solid transparent; transition:all .15s; white-space:nowrap; }
  .g-tab.active { background:var(--bg); border-bottom-color:var(--copper); color:var(--copper); font-weight:700; }
  .g-tab:hover { color:var(--cream); }

  /* CONTENT */
  .g-content { padding:24px; max-width:900px; margin:0 auto; }
  .loading { color:var(--mid); font-size:.85rem; padding:32px; text-align:center; font-style:italic; }

  /* SECTION HEADER */
  .list-section-title { font-family:'Playfair Display',serif; font-size:1.1rem; font-weight:700; color:var(--cream); margin-bottom:2px; }
  .list-section-rule { width:32px; height:2px; background:var(--copper); margin-bottom:16px; }

  /* TIMER */
  .timer-wrap { display:grid; grid-template-columns:1fr 260px; gap:28px; }
  @media(max-width:640px){ .timer-wrap{ grid-template-columns:1fr; } .timer-right{ display:none; } }
  .timer-seg-name { font-family:'Playfair Display',serif; font-size:1.5rem; font-weight:700; color:var(--cream); margin-bottom:4px; }
  .timer-seg-desc { font-size:.82rem; color:var(--mid); font-style:italic; margin-bottom:20px; }
  .timer-display { font-family:'Barlow Condensed',sans-serif; font-size:5rem; font-weight:800; letter-spacing:.02em; color:var(--copper); line-height:1; margin-bottom:16px; transition:color .3s; }
  .timer-warn { color:#c0392b !important; }
  .timer-seg-bar-wrap { background:var(--lt); border-radius:2px; height:3px; overflow:hidden; margin-bottom:20px; }
  .timer-seg-bar { height:100%; background:var(--copper); border-radius:2px; transition:width .5s; }
  .timer-total-bar { background:var(--sage); }
  .timer-total-wrap { margin-top:8px; }
  .timer-total-label { font-size:.68rem; color:var(--mid); letter-spacing:.06em; text-transform:uppercase; margin-bottom:4px; }
  .timer-controls { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
  .btn-t { padding:8px 18px; border-radius:3px; border:1px solid var(--lt); background:transparent; color:var(--cream); font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:700; cursor:pointer; transition:all .15s; }
  .btn-t:hover:not(:disabled) { border-color:var(--copper); color:var(--copper); }
  .btn-t:disabled { opacity:.3; cursor:default; }
  .btn-t--primary { background:var(--copper); color:var(--cream); border-color:var(--copper); }
  .btn-t--primary:hover { opacity:.85; }
  .seg-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:3px; font-size:.8rem; color:var(--mid); }
  .seg-row--active { background:var(--surface2); color:var(--cream); border-left:2px solid var(--copper); }
  .seg-row--done { opacity:.4; }
  .seg-row-dot { width:18px; text-align:center; font-size:.72rem; color:var(--copper); flex-shrink:0; }
  .seg-row-name { flex:1; font-weight:500; }
  .seg-row-dur { font-family:'Barlow Condensed',sans-serif; font-size:.78rem; color:var(--mid); }

  /* SCORECARD */
  .sc-wrap { display:flex; flex-direction:column; gap:16px; }
  .sc-toolbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
  .sc-week-nav { display:flex; align-items:center; gap:10px; }
  .sc-week-label { font-size:.82rem; color:var(--cream); font-weight:700; font-family:'Playfair Display',serif; font-style:italic; }
  .sc-table-wrap { overflow-x:auto; }
  .sc-table { width:100%; border-collapse:collapse; min-width:400px; }
  .sc-table th { padding:8px 12px; text-align:center; font-size:.68rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--mid); border-bottom:2px solid var(--copper); }
  .sc-table th:first-child { text-align:left; }
  .sc-table td { padding:7px 8px; border-bottom:1px solid var(--lt); text-align:center; transition:background .2s; }
  .sc-table td:first-child { text-align:left; }
  .sc-member { font-weight:700; font-size:.85rem; white-space:nowrap; color:var(--cream); font-family:'Playfair Display',serif; }
  .sc-target { font-size:.6rem; color:var(--mid); font-weight:400; text-transform:none; letter-spacing:0; font-style:italic; font-family:'DM Sans',sans-serif; }
  .sc-cell { width:68px; background:transparent; border:1px solid var(--lt); border-radius:2px; color:var(--cream); padding:4px 6px; font-size:.88rem; text-align:center; font-family:'DM Sans',sans-serif; }
  .sc-cell:focus { outline:none; border-color:var(--copper); }
  .sc-empty { text-align:center; color:var(--mid); font-size:.85rem; padding:24px; font-style:italic; }
  .sc-add-row { display:flex; align-items:center; gap:10px; padding-top:8px; flex-wrap:wrap; }

  /* ROCKS & ISSUES */
  .list-wrap { display:flex; flex-direction:column; gap:10px; }
  .list-toolbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:4px; }
  .list-count { font-size:.75rem; color:var(--mid); font-style:italic; }
  .list-item { background:var(--surface); border-left:3px solid var(--copper); border-radius:0 4px 4px 0; overflow:hidden; }
  .list-item-header { display:flex; align-items:center; justify-content:space-between; padding:13px 16px; gap:12px; }
  .list-item-left { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
  .list-item-right { display:flex; align-items:center; gap:8px; flex-shrink:0; flex-wrap:wrap; }
  .status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .list-item-title { font-size:.88rem; font-weight:700; color:var(--cream); font-family:'Playfair Display',serif; }
  .list-item-meta { font-size:.72rem; color:var(--mid); margin-top:2px; font-style:italic; }
  .status-badge { font-size:.62rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:2px 8px; border-radius:2px; }
  .rock-detail { padding:0 16px 16px; border-top:1px solid var(--lt); }
  .hidden { display:none !important; }
  .rock-milestones { display:flex; flex-direction:column; gap:8px; margin:12px 0; }
  .milestone-row { display:flex; align-items:center; gap:10px; font-size:.82rem; }
  .ms-check { accent-color:var(--copper); width:14px; height:14px; flex-shrink:0; }
  .ms-done { text-decoration:line-through; color:var(--mid); }
  .ms-date { margin-left:auto; font-size:.72rem; color:var(--mid); font-style:italic; }
  .rock-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:4px; }
  .issue-resolution { font-size:.72rem; color:var(--sage); margin-top:4px; font-style:italic; }
  .empty-state { color:var(--mid); font-size:.85rem; font-style:italic; padding:32px; text-align:center; }

  /* FORMS */
  .add-form { background:var(--surface2); border-left:3px solid var(--sage); border-radius:0 4px 4px 0; padding:16px; display:flex; flex-direction:column; gap:10px; }
  .form-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  .g-input { background:var(--bg); border:1px solid var(--lt); border-radius:3px; color:var(--cream); padding:8px 12px; font-size:.85rem; flex:1; min-width:120px; font-family:'DM Sans',sans-serif; }
  .g-input:focus { outline:none; border-color:var(--copper); }
  .g-select { background:var(--bg); border:1px solid var(--lt); border-radius:3px; color:var(--cream); padding:7px 10px; font-size:.85rem; font-family:'DM Sans',sans-serif; }

  /* BUTTONS */
  .btn-sm { padding:6px 14px; border-radius:3px; border:1px solid var(--lt); background:transparent; color:var(--cream); font-size:.78rem; font-weight:700; cursor:pointer; transition:all .15s; white-space:nowrap; font-family:'DM Sans',sans-serif; }
  .btn-sm:hover:not(:disabled) { border-color:var(--copper); color:var(--copper); }
  .btn-sm:disabled { opacity:.35; cursor:default; }
  .btn-sm--bronze { background:var(--copper); color:var(--cream); border-color:var(--copper); }
  .btn-sm--bronze:hover { opacity:.85; }
  .btn-icon { background:transparent; border:none; color:var(--mid); cursor:pointer; font-size:1rem; padding:4px 8px; transition:color .15s; }
  .btn-icon:hover { color:var(--copper); }

  /* FILTER TABS */
  .filter-tabs { display:flex; border:1px solid var(--lt); border-radius:3px; overflow:hidden; }
  .filter-tab { padding:5px 14px; border:none; background:transparent; color:var(--mid); font-size:.78rem; font-weight:700; cursor:pointer; transition:all .15s; border-right:1px solid var(--lt); font-family:'DM Sans',sans-serif; }
  .filter-tab:last-child { border-right:none; }
  .filter-tab.active { background:var(--surface2); color:var(--cream); }
  .filter-tab:hover { color:var(--cream); }
`;
document.head.appendChild(style);
document.head.insertAdjacentHTML('beforeend', `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@400;500;700&family=Barlow+Condensed:wght@600;800&display=swap" rel="stylesheet">`);

// ── BOOT ─────────────────────────────────────────────────────────────────────
if (!GROUP) {
  document.getElementById('app').innerHTML = '<p style="color:red;padding:32px">Group config missing.</p>';
} else {
  document.getElementById('app').innerHTML += '';
  document.addEventListener('DOMContentLoaded', renderShell);
  if (document.readyState !== 'loading') renderShell();
}

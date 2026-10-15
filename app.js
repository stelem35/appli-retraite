'use strict';
/* Compte à rebours retraite — PWA hors ligne, données en local (localStorage). */
const KEY = 'retraite.v1';
const DISCLAIMER = 'Les chiffres affichés viennent de vos saisies. Ce n\'est pas un calcul officiel : la source de référence reste Mon compte retraite.';
const STATUS = { todo: 'À faire', doing: 'En cours', done: 'Confirmé' };

/* ---------- Dates ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const fmt = s => { const d = parse(s); return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'; };
const dayDiff = (a, b) => Math.round((b - a) / 86400000);
function ymd(from, to) {
  let y = to.getFullYear() - from.getFullYear(), m = to.getMonth() - from.getMonth(), d = to.getDate() - from.getDate();
  if (d < 0) { m--; d += new Date(to.getFullYear(), to.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}
const addYears = (s, n) => { const d = parse(s); d.setFullYear(d.getFullYear() + n); return iso(d); };
const plural = (n, w) => `${n} ${w}${n > 1 && !w.endsWith('s') ? 's' : ''}`;
const isOld = s => s && dayDiff(parse(s), today()) > 365;

/* ---------- État ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);
function defaults() {
  const t = iso(today());
  const cond = [
    'Conditions d\'accès au 4/5e (employeur, ancienneté, délai de prévenance)',
    'Niveau réel du complément de salaire (90 %) et sa durée',
    'Fonctionnement de l\'avance sur retraite et remboursement éventuel',
    'Impact sur la pension de base et complémentaire',
    'Impact sur le préavis et sur la date de départ',
    'Documents à fournir'
  ].map(title => ({ id: uid(), title, status: 'todo', contact: '', deadline: '2026-12-15', answer: '' }));
  return {
    v: 1,
    refDate: '2030-01-01',
    startDate: t,
    fig: {
      qValid: { v: '', d: '' }, qReq: { v: '', d: '' }, legalAge: { v: '', d: '' },
      pensionGross: { v: '', d: '' }, pensionNet: { v: '', d: '' },
      simDate: { v: '', d: '' }, careerCheck: { v: '', d: '' }
    },
    sc: {
      A: { date: '2030-01-01', income: '', pension: '', notes: '' },
      B: { start45: '', date: '2030-01-01', salary100: '', pct: 90, advance: '', pension: '', impact: '', notes: '' }
    },
    cond,
    miles: [
      { id: uid(), title: 'Revue du relevé de carrière', date: '2027-01-15', yearly: true, notes: 'Vérifier le relevé sur Mon compte retraite.' },
      { id: uid(), title: 'Nouvelle simulation sur Mon compte retraite', date: '2027-01-20', yearly: true, notes: '' },
      { id: uid(), title: 'Conditions du 4/5e confirmées', date: '2026-12-15', yearly: false, notes: 'Échéance : décembre 2026.' },
      { id: uid(), title: 'Demande de retraite (délai à confirmer, ~6 mois avant)', date: '2029-07-01', yearly: false, notes: 'Vérifier le délai exact avec mon relevé.' }
    ],
    check: [
      ['Régimes', 'Contacter le régime de base'], ['Régimes', 'Contacter la retraite complémentaire'],
      ['Documents', 'Réunir pièce d\'identité, RIB, livret de famille'], ['Documents', 'Relevé de carrière à jour'],
      ['Employeur', 'Informer l\'employeur / RH'], ['Employeur', 'Confirmer préavis et date de départ']
    ].map(([g, text]) => ({ id: uid(), group: g, text, done: false })),
    journal: []
  };
}
let S = load();
function load() {
  try { const r = localStorage.getItem(KEY); if (r) return Object.assign(defaults(), JSON.parse(r)); } catch (e) { }
  return defaults();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Enregistrement impossible (stockage plein ou bloqué)'); }
}
const getp = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setp(o, p, v) { const k = p.split('.'); const l = k.pop(); getp(o, k.join('.') || '') ; k.reduce((a, x) => a[x], o)[l] = v; }

/* ---------- Utilitaires UI ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
const input = (label, path, type = 'text', extra = '') =>
  `<label>${label}<input type="${type}" data-p="${path}" value="${esc(getp(S, path))}" ${extra}></label>`;
const area = (label, path) => `<label>${label}<textarea data-p="${path}">${esc(getp(S, path))}</textarea></label>`;
const money = v => (v === '' || v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = v => (v === '' || v == null || isNaN(v)) ? null : Number(v);

/* ---------- Google Agenda / .ics ---------- */
function gcalLink(title, date, notes) {
  const d = parse(date), n = new Date(d); n.setDate(n.getDate() + 1);
  const c = x => iso(x).replace(/-/g, '');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
    '&dates=' + c(d) + '/' + c(n) + '&details=' + encodeURIComponent(notes || 'Ajouté depuis Compte à rebours retraite');
}
function icsEvent(e) {
  const d = parse(e.date), n = new Date(d); n.setDate(n.getDate() + 1);
  const c = x => iso(x).replace(/-/g, '');
  const t = s => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
  return ['BEGIN:VEVENT', `UID:${e.uid}@retraite.local`, `DTSTAMP:${c(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${c(d)}`, `DTEND;VALUE=DATE:${c(n)}`, `SUMMARY:${t(e.title)}`, `DESCRIPTION:${t(e.notes)}`,
    ...(e.yearly ? ['RRULE:FREQ=YEARLY'] : []),
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${t(e.title)}`, 'TRIGGER:-P7D', 'END:VALARM', 'END:VEVENT'].join('\r\n');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function exportIcs(events, name) {
  const ev = events.filter(e => e.date);
  if (!ev.length) return toast('Aucune échéance avec date');
  download(name, ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Retraite//FR', 'CALSCALE:GREGORIAN', ...ev.map(icsEvent), 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
}
const condEvent = c => ({ uid: 'cond-' + c.id, title: 'Retraite — ' + c.title, date: c.deadline, notes: `Interlocuteur : ${c.contact || '—'}. Échéance du suivi des conditions (scénario B).` });
const mileEvent = m => ({ uid: 'mile-' + m.id, title: 'Retraite — ' + m.title, date: m.date, yearly: m.yearly, notes: m.notes });

/* ---------- Écrans ---------- */
const views = { accueil, chiffres, scenarios, conditions, suivi };

function upcoming() {
  const t = today(), out = [];
  S.cond.filter(c => c.status !== 'done' && c.deadline).forEach(c => out.push({ date: parse(c.deadline), title: c.title, kind: 'Condition' }));
  S.miles.forEach(m => {
    if (!m.date) return;
    let d = parse(m.date);
    if (m.yearly) while (d < t) d.setFullYear(d.getFullYear() + 1);
    out.push({ date: d, title: m.title, kind: m.yearly ? 'Annuel' : 'Jalon' });
  });
  return out.sort((a, b) => a.date - b.date);
}

function accueil() {
  const t = today(), ref = parse(S.refDate), start = parse(S.startDate);
  const total = dayDiff(t, ref);
  let body;
  if (!ref) body = '<p>Choisissez une date de départ.</p>';
  else if (total <= 0) body = '<div class="big">🎉</div><p>La date de départ est atteinte.</p>';
  else {
    const r = ymd(t, ref);
    const pct = start && ref > start ? Math.max(0, Math.min(100, dayDiff(start, t) / dayDiff(start, ref) * 100)) : 0;
    body = `<div class="big">${total.toLocaleString('fr-FR')}</div><div class="muted">jours avant le ${fmt(S.refDate)}</div>
      <div class="countrow"><div><b>${r.y}</b>an${r.y > 1 ? 's' : ''}</div><div><b>${r.m}</b>mois</div><div><b>${r.d}</b>jour${r.d > 1 ? 's' : ''}</div></div>
      <div class="gauge" role="progressbar" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <div class="muted">${pct.toFixed(1).replace('.', ',')} % du chemin depuis le ${fmt(S.startDate)}</div>`;
  }
  const up = upcoming().slice(0, 5);
  const cs = { todo: 0, doing: 0, done: 0 }; S.cond.forEach(c => cs[c.status]++);
  const late = S.cond.filter(c => c.status !== 'done' && c.deadline && parse(c.deadline) < t).length;
  return `<p class="disclaimer">${DISCLAIMER}</p>
  <section class="card"><h2>Compte à rebours</h2>${body}
    <div class="grid2 stack">
      ${input('Date de départ de référence', 'refDate', 'date', 'data-r')}
      ${input('Date de début (pour la jauge)', 'startDate', 'date', 'data-r')}
    </div>
    <div class="row" style="margin-top:10px">
      <button class="sec" data-act="refA">Scénario A (${fmt(S.sc.A.date).replace(/^\d+ /, '')})</button>
      <button class="sec" data-act="refB">Scénario B</button>
    </div></section>
  <section class="card"><h3>Prochaines échéances</h3>
    ${up.length ? up.map(u => `<div class="chk"><span>${esc(u.title)}<br><small class="muted">${u.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · ${u.kind}</small></span>
      <span class="badge ${dayDiff(t, u.date) < 0 ? 'bad' : dayDiff(t, u.date) < 60 ? 'warn' : ''}" style="flex:none">${dayDiff(t, u.date) < 0 ? 'en retard' : 'J-' + dayDiff(t, u.date)}</span></div>`).join('') : '<p class="muted">Aucune échéance.</p>'}
  </section>
  <section class="card"><h3>Conditions du 4/5e</h3>
    <div class="row"><span class="badge bad">À faire : ${cs.todo}</span><span class="badge warn">En cours : ${cs.doing}</span><span class="badge ok">Confirmé : ${cs.done}</span></div>
    ${late ? `<p class="muted" style="color:var(--bad)">${late} point(s) avec échéance dépassée.</p>` : ''}
    <p><a class="btn sec" href="#/conditions">Ouvrir le suivi</a></p></section>
  <section class="card"><h3>Mes données</h3>
    <p class="muted">Stockées uniquement sur cet appareil. Exportez régulièrement une sauvegarde JSON ; importez-la pour transférer vers un autre appareil.</p>
    <div class="row"><button data-act="export">Exporter (JSON)</button><button class="sec" data-act="import">Importer</button>
    <input id="imp" type="file" accept="application/json,.json" hidden></div></section>`;
}

const FIGS = [
  ['qValid', 'Trimestres validés', 'number'], ['qReq', 'Trimestres requis', 'number'], ['legalAge', 'Âge légal (selon mon relevé)', 'text'],
  ['pensionGross', 'Pension estimée brute (€/mois)', 'number'], ['pensionNet', 'Pension estimée nette (€/mois, si indiquée)', 'number'],
  ['simDate', 'Date de la simulation', 'date'], ['careerCheck', 'Dernière vérification du relevé de carrière', 'date']
];
function chiffres() {
  const rows = FIGS.map(([k, label, type]) => {
    const f = S.fig[k], old = f.v !== '' && isOld(f.d), none = f.v !== '' && !f.d;
    return `<div class="card"><div class="row sp"><b>${label}</b>${old ? '<span class="badge warn">⚠ plus d\'un an</span>' : none ? '<span class="badge">date manquante</span>' : ''}</div>
      <div class="fig">
        <label>Valeur<input type="${type}" ${type === 'number' ? 'inputmode="decimal" step="any"' : ''} data-p="fig.${k}.v" data-stamp="fig.${k}.d" data-r value="${esc(f.v)}"></label>
        <label>Mise à jour le<input type="date" data-p="fig.${k}.d" data-r value="${esc(f.d)}"></label>
      </div></div>`;
  }).join('');
  const q = num(S.fig.qValid.v), r = num(S.fig.qReq.v);
  const miss = q != null && r != null ? `<p class="muted">D'après vos saisies : ${Math.max(0, r - q)} trimestre(s) restant(s) à valider (${q} sur ${r}).</p>` : '';
  return `<h2>Chiffres clés</h2><p class="disclaimer">${DISCLAIMER} Saisissez les valeurs de votre relevé ou de vos simulations ; la date de mise à jour se remplit automatiquement.</p>${rows}${miss}`;
}

function scenarios() {
  const A = S.sc.A, B = S.sc.B, t = today();
  const inc45 = num(B.salary100) != null && num(B.pct) != null ? num(B.salary100) * num(B.pct) / 100 : null;
  const incomeB = inc45;
  const gap = (a, b) => (a == null || b == null) ? '—' : ((b - a >= 0 ? '+' : '') + money(b - a));
  const pA = num(A.pension), pB = num(B.pension);
  const dd = A.date && B.date ? dayDiff(parse(A.date), parse(B.date)) : null;
  return `<h2>Scénarios</h2><p class="disclaimer">${DISCLAIMER}</p>
  <section class="card"><h3>Comparaison</h3>
  <table class="cmp"><tr><th></th><th>A</th><th>B (4/5e)</th><th>Écart B−A</th></tr>
   <tr><td>Date de départ</td><td>${fmt(A.date)}</td><td>${fmt(B.date)}</td><td>${dd == null ? '—' : dd + ' j'}</td></tr>
   <tr><td>Revenu mensuel pendant la période</td><td>${money(A.income)}</td><td>${money(incomeB)}${num(B.advance) ? ' <br><small class="muted">+ avance ' + money(B.advance) + '</small>' : ''}</td><td>${gap(num(A.income), incomeB)}</td></tr>
   <tr><td>Pension estimée (€/mois)</td><td>${money(A.pension)}</td><td>${money(B.pension)}</td><td>${gap(pA, pB)}</td></tr>
  </table>
  <p class="muted">Le revenu du scénario B = salaire de référence × pourcentage visé, calculé uniquement à partir de vos saisies.</p></section>

  <section class="card"><h3>Scénario A — départ à la date indiquée</h3>
    ${input('Date de départ', 'sc.A.date', 'date', 'data-r')}
    ${input('Revenu mensuel pendant la période (€)', 'sc.A.income', 'number', 'inputmode="decimal" data-r')}
    ${input('Pension estimée (€/mois)', 'sc.A.pension', 'number', 'inputmode="decimal" data-r')}
    ${area('Hypothèses / notes', 'sc.A.notes')}</section>

  <section class="card"><h3>Scénario B — passage à 4/5e puis départ</h3>
    <div class="grid2 stack">${input('Début du 4/5e', 'sc.B.start45', 'date')}${input('Date de départ', 'sc.B.date', 'date', 'data-r')}</div>
    <div class="grid2 stack">${input('Salaire mensuel de référence à 100 % (€)', 'sc.B.salary100', 'number', 'inputmode="decimal" data-r')}${input('Salaire visé (% du salaire)', 'sc.B.pct', 'number', 'inputmode="decimal" data-r')}</div>
    ${input('Avance sur retraite (€/mois)', 'sc.B.advance', 'number', 'inputmode="decimal" data-r')}
    ${input('Pension estimée (€/mois)', 'sc.B.pension', 'number', 'inputmode="decimal" data-r')}
    ${area('Impact éventuel sur la pension finale', 'sc.B.impact')}
    ${area('Hypothèses / notes', 'sc.B.notes')}
    <p class="muted">Conditions encore à confirmer d'ici fin 2026 : voir l'onglet « Conditions ».</p></section>`;
}

function conditions() {
  const items = S.cond.map((c, i) => `<div class="item">
    <label>Point à valider<input data-p="cond.${i}.title" value="${esc(c.title)}"></label>
    <div class="grid2 stack">
      <label>Statut<select data-p="cond.${i}.status" data-r>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${c.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      ${input('Date limite', `cond.${i}.deadline`, 'date', 'data-r')}
    </div>
    ${input('Interlocuteur', `cond.${i}.contact`)}
    ${area('Réponse obtenue', `cond.${i}.answer`)}
    <div class="row sp"><span class="badge ${c.status === 'done' ? 'ok' : c.status === 'doing' ? 'warn' : 'bad'}">${STATUS[c.status]}</span>
      <span class="row">${c.deadline ? `<a class="btn sec" target="_blank" rel="noopener" href="${gcalLink('Retraite — ' + c.title, c.deadline, condEvent(c).notes)}">📅 Google Agenda</a>` : ''}
      <button class="danger" data-act="delcond" data-i="${i}">Supprimer</button></span></div>
  </div>`).join('');
  return `<h2>Conditions à confirmer</h2><p class="disclaimer">Scénario B — à valider d'ici fin 2026. ${DISCLAIMER}</p>${items}
    <div class="row"><button data-act="addcond">+ Ajouter un point</button><button class="sec" data-act="icscond">Exporter tout en .ics</button></div>
    <p class="muted">Le bouton « Google Agenda » ouvre un événement pré-rempli (connexion requise). Le fichier .ics s'importe dans n'importe quel agenda.</p>`;
}

function suivi() {
  const t = today(), groups = [...new Set(S.check.map(c => c.group))];
  const chk = groups.map(g => `<h3 style="margin-top:12px">${esc(g)}</h3>` + S.check.map((c, i) => c.group !== g ? '' :
    `<div class="chk ${c.done ? 'done' : ''}"><input type="checkbox" data-p="check.${i}.done" data-r ${c.done ? 'checked' : ''} aria-label="${esc(c.text)}"><span>${esc(c.text)}</span><button class="sec" data-act="delchk" data-i="${i}" aria-label="Supprimer">✕</button></div>`).join('')).join('');
  const miles = S.miles.map((m, i) => `<div class="item"><label>Jalon<input data-p="miles.${i}.title" value="${esc(m.title)}"></label>
    <div class="grid2 stack">${input('Date', `miles.${i}.date`, 'date', 'data-r')}
    <label>Récurrence<select data-p="miles.${i}.yearly" data-bool data-r><option value="0" ${m.yearly ? '' : 'selected'}>Une fois</option><option value="1" ${m.yearly ? 'selected' : ''}>Chaque année</option></select></label></div>
    <div class="row sp"><span class="muted">${m.date ? fmt(m.date) : ''}</span><span class="row">
    ${m.date ? `<a class="btn sec" target="_blank" rel="noopener" href="${gcalLink(mileEvent(m).title, m.date, m.notes)}">📅 Agenda</a>` : ''}
    <button class="danger" data-act="delmile" data-i="${i}">✕</button></span></div></div>`).join('');
  const jr = [...S.journal].map((j, i) => ({ ...j, i })).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const journal = jr.map(j => `<tr><td>${j.date ? new Date(j.date).toLocaleDateString('fr-FR') : '—'}</td><td>${money(j.pension)}</td><td>${esc(j.hyp)}${j.note ? '<br><small class="muted">' + esc(j.note) + '</small>' : ''}</td><td><button class="sec" data-act="deljr" data-i="${j.i}">✕</button></td></tr>`).join('');
  return `<h2>Suivi</h2><p class="disclaimer">${DISCLAIMER}</p>
  <section class="card"><h3>Jalons et rappels</h3>${miles}
    <div class="row"><button data-act="addmile">+ Jalon</button><button class="sec" data-act="icsmile">Exporter tout en .ics</button></div>
    <p class="muted">Les jalons « chaque année » utilisent une récurrence annuelle dans le .ics.</p></section>
  <section class="card"><h3>Checklist des démarches</h3>${chk}
    <div class="grid2 stack" style="margin-top:10px"><label>Groupe<input id="nc-g" list="grp" value="Divers"><datalist id="grp">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist></label><label>Démarche<input id="nc-t"></label></div>
    <button data-act="addchk">+ Ajouter</button></section>
  <section class="card"><h3>Journal des simulations</h3>${chart(jr)}
    ${jr.length ? `<table><tr><th>Date</th><th>Pension</th><th>Hypothèse</th><th></th></tr>${journal}</table>` : '<p class="muted">Aucune simulation enregistrée.</p>'}
    <div class="grid2 stack"><label>Date<input id="j-d" type="date" value="${iso(t)}"></label><label>Pension estimée (€/mois)<input id="j-p" type="number" inputmode="decimal" step="any"></label></div>
    <label>Hypothèse<input id="j-h"></label><label>Remarque<input id="j-n"></label>
    <button data-act="addjr">+ Enregistrer la simulation</button></section>`;
}
function chart(jr) {
  const pts = jr.filter(j => num(j.pension) != null);
  if (pts.length < 2) return pts.length ? '' : '';
  const W = 320, H = 130, p = 28, vals = pts.map(j => Number(j.pension)), mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
  const xy = pts.map((j, i) => [p + i * (W - 2 * p) / (pts.length - 1), H - p - (Number(j.pension) - mn) / rg * (H - 2 * p)]);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de la pension estimée">
    <polyline fill="none" stroke="var(--brand2)" stroke-width="2.5" points="${xy.map(a => a.join(',')).join(' ')}"/>
    ${xy.map((a, i) => `<circle cx="${a[0]}" cy="${a[1]}" r="4" fill="var(--brand)"/><text x="${a[0]}" y="${a[1] - 8}" font-size="10" text-anchor="middle" fill="currentColor">${Math.round(vals[i])}</text>`).join('')}
    </svg>`;
}

/* ---------- Routage et événements ---------- */
function route() {
  const name = (location.hash.replace('#/', '') || 'accueil');
  const k = views[name] ? name : 'accueil';
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === k));
  $('#view').innerHTML = views[k]();
  window.scrollTo(0, 0);
}
function rerender() { const y = window.scrollY; const a = document.activeElement; route(); window.scrollTo(0, y); }

document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'imp') return importFile(el.files[0]);
  const p = el.dataset && el.dataset.p; if (!p) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.hasAttribute('data-bool')) v = v === '1';
  setp(S, p, v);
  if (el.dataset.stamp) setp(S, el.dataset.stamp, iso(today()));
  save();
  if (el.hasAttribute('data-r')) rerender();
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const i = Number(b.dataset.i), act = b.dataset.act;
  const ask = m => confirm(m);
  switch (act) {
    case 'refA': S.refDate = S.sc.A.date; break;
    case 'refB': S.refDate = S.sc.B.date; break;
    case 'export': download(`retraite-sauvegarde-${iso(today())}.json`, JSON.stringify(S, null, 2), 'application/json'); toast('Sauvegarde exportée'); return;
    case 'import': $('#imp').click(); return;
    case 'addcond': S.cond.push({ id: uid(), title: 'Nouveau point', status: 'todo', contact: '', deadline: '2026-12-15', answer: '' }); break;
    case 'delcond': if (!ask('Supprimer ce point ?')) return; S.cond.splice(i, 1); break;
    case 'icscond': exportIcs(S.cond.map(condEvent), 'retraite-conditions.ics'); return;
    case 'addmile': S.miles.push({ id: uid(), title: 'Nouveau jalon', date: iso(today()), yearly: false, notes: '' }); break;
    case 'delmile': if (!ask('Supprimer ce jalon ?')) return; S.miles.splice(i, 1); break;
    case 'icsmile': exportIcs(S.miles.map(mileEvent), 'retraite-jalons.ics'); return;
    case 'addchk': { const t = $('#nc-t').value.trim(); if (!t) return toast('Saisissez une démarche'); S.check.push({ id: uid(), group: $('#nc-g').value.trim() || 'Divers', text: t, done: false }); break; }
    case 'delchk': S.check.splice(i, 1); break;
    case 'addjr': {
      const p = $('#j-p').value; if (p === '') return toast('Saisissez la pension estimée');
      S.journal.push({ id: uid(), date: $('#j-d').value, pension: p, hyp: $('#j-h').value, note: $('#j-n').value }); break;
    }
    case 'deljr': S.journal.splice(i, 1); break;
    default: return;
  }
  save(); rerender();
});

function importFile(f) {
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d || d.v !== 1 || !d.fig || !d.sc) throw new Error();
      if (!confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return;
      S = Object.assign(defaults(), d); save(); route(); toast('Sauvegarde importée');
    } catch (e) { toast('Fichier invalide'); }
  };
  r.readAsText(f);
}

/* ---------- Hors ligne ---------- */
function netState() { const n = $('#net'); n.textContent = navigator.onLine ? 'En ligne' : 'Hors ligne'; }
window.addEventListener('online', netState); window.addEventListener('offline', netState);
window.addEventListener('hashchange', route);
netState(); route();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

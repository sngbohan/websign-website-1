// Websign · Projekt-Konfigurator
// Rechnet ausschließlich mit den Werten aus config.js. Fehlt ein Preis, steht dort „auf Anfrage“.
// Fehlen alle Preise, zeigt die Seite keine Preisschilder und verspricht den Richtpreis per E-Mail
// (der Ausweichtext hängt in index.html an data-requires-not="pricing.types").

import { initBauplan } from './bauplan.js';

const SINGLE_PAGE = ['onepager', 'landingpage'];
const ORDER = ['type', 'base', 'scope', 'extras', 'time', 'contact'];
const ON_REQUEST = 'auf Anfrage';

export function initConfigurator(config, track = () => {}) {
  const form = document.querySelector('[data-config-form]');
  if (!form) return;
  const pricing = config.pricing;
  const dev = document.documentElement.classList.contains('dev');
  const steps = Object.fromEntries(ORDER.map((k) => [k, form.querySelector(`[data-step="${k}"]`)]));
  const sum = (k) => document.querySelector(`[data-sum="${k}"]`);
  const totalEl = document.querySelector('[data-total]');
  const statusEl = document.querySelector('[data-form-status]');
  const scopeNote = form.querySelector('[data-scope-note]');
  const submitBtn = document.querySelector('button[form="config-form"]');
  const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const price = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), pricing);
  const hasPrices = Object.values(pricing.types).some((v) => v != null);
  const responseTime = config.contact.responseTime;
  // Nur im Entwicklungsmodus (?dev) erscheint zusätzlich der orange Platzhalter
  const missing = (el, devText) => {
    el.textContent = ON_REQUEST;
    if (!dev) return;
    const m = document.createElement('mark'); m.className = 'ph'; m.textContent = ` ${devText}`;
    el.append(m);
  };

  // Preisschilder an den Kacheln
  form.querySelectorAll('[data-price]').forEach((el) => {
    const path = el.dataset.price, v = price(path);
    el.textContent = '';
    if (!hasPrices && !dev) { el.hidden = true; return; }
    if (v == null) missing(el, '[PREIS]');
    else if (path.startsWith('types.')) el.textContent = `ab ${money.format(v)}`;
    else el.textContent = v === 0 ? 'inklusive' : `+ ${money.format(v)}`;
  });

  const checked = (name) => form.querySelector(`input[name="${name}"]:checked`);
  const checkedAll = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)];
  const label = (input) => input.dataset.label;
  let totalText = ON_REQUEST;

  function state() {
    const type = checked('type'), base = checked('base'), time = checked('time');
    const single = !!type && SINGLE_PAGE.includes(type.value);
    const scope = single ? null : checked('scope');
    const extras = checkedAll('extras');
    return {
      type, base, scope, extras, time, single,
      done: { type: !!type, base: !!base, scope: single || !!scope, extras: extras.length > 0, time: !!time },
    };
  }

  function setSum(key, text) {
    const el = sum(key);
    if (!el) return;
    el.textContent = text || 'Noch offen';
    el.classList.toggle('is-empty', !text);
  }

  // Live-Bauplan und Rückgängig: Vor jeder Änderung merkt sich der Konfigurator die gewählten Felder
  const plan = initBauplan(document.querySelector('[data-plan]'), config);
  const undoBtns = [...document.querySelectorAll('[data-plan-undo]')];
  const history = [];
  let snapshot = [];
  const choices = () => [...form.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"][name="extras"]:checked')].map((i) => `${i.name}=${i.value}`);
  const syncUndo = () => undoBtns.forEach((b) => { b.disabled = history.length === 0; });
  undoBtns.forEach((b) => b.addEventListener('click', () => {
    const prev = history.pop();
    if (!prev) return;
    form.querySelectorAll('input[type="radio"], input[name="extras"]').forEach((i) => { i.checked = prev.includes(`${i.name}=${i.value}`); });
    snapshot = prev;
    setStatus('');
    update('undo');
    syncUndo();
    track('config-undo');
  }));

  function update(changed) {
    const s = state();

    // Spätere Schritte bleiben gedimmt, bis der vorherige gewählt ist
    let open = true;
    for (const key of ORDER) {
      const fs = steps[key];
      if (!fs) continue;
      const lockedScope = key === 'scope' && s.single;
      fs.disabled = !open || lockedScope;
      if (key !== 'contact') open = open && s.done[key];
    }
    if (scopeNote) scopeNote.hidden = !s.single;
    if (s.single) form.querySelectorAll('input[name="scope"]').forEach((i) => { i.checked = false; });

    setSum('type', s.type && label(s.type));
    setSum('base', s.base && label(s.base));
    setSum('scope', s.single ? 'Eine Seite' : s.scope && `${label(s.scope)} · ${config.scopeLabels[s.scope.value]}`);
    setSum('extras', s.extras.map(label).join(', '));
    setSum('time', s.time && label(s.time));
    updateTotal(s);
    // Der Bon zeigt Beträge nur, wenn config.js Preise hat; sonst „per E-Mail“
    if (plan) plan.render(s, changed, { prices: hasPrices, total: totalText, price, money });
    return s;
  }

  // Richtpreis: Summe aller gewählten Bausteine
  function updateTotal(s) {
    totalText = ON_REQUEST;
    if (!totalEl) return;
    if (!s.type) { totalEl.textContent = '–'; return; }
    const parts = [price(`types.${s.type.value}`)];
    if (s.base) parts.push(price(`base.${s.base.value}`));
    if (s.scope) parts.push(price(`scope.${s.scope.value}`));
    for (const e of s.extras) if (e.value !== 'none') parts.push(price(`extras.${e.value}`));
    if (parts.some((v) => v == null)) missing(totalEl, '[RICHTPREIS]');
    else { totalText = `ab ${money.format(parts.reduce((a, b) => a + b, 0))}`; totalEl.textContent = totalText; }
  }

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'extras') {
      // „Keine Extras“ schließt die anderen aus und umgekehrt
      if (t.value === 'none' && t.checked) form.querySelectorAll('input[name="extras"]').forEach((i) => { if (i !== t) i.checked = false; });
      else if (t.checked) { const none = form.querySelector('input[name="extras"][value="none"]'); if (none) none.checked = false; }
    }
    if (ORDER.includes(t.name)) track('config-step', { step: t.name, value: t.value });
    setStatus('');
    update(t);
    if (ORDER.includes(t.name)) {
      const now = choices();
      if (now.join() !== snapshot.join()) { history.push(snapshot); snapshot = now; syncUndo(); }
    }
  });

  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('is-error', kind === 'error');
    statusEl.classList.toggle('is-success', kind === 'success');
  }
  function fieldError(input, errId, show) {
    const err = document.getElementById(errId);
    if (err) err.hidden = !show;
    if (show) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  // Die Anfrage als lesbarer Text: für die E-Mail und als Feld „zusammenfassung“ im JSON
  function summaryLines(s, data) {
    return [
      'Projektanfrage über den Websign-Konfigurator',
      '',
      'PROJEKT',
      `– Projektart: ${label(s.type)}`,
      `– Ausgangslage: ${label(s.base)}`,
      `– Umfang: ${s.single ? 'Eine Seite' : `${label(s.scope)} (${config.scopeLabels[s.scope.value]})`}`,
      `– Extras: ${s.extras.map(label).join(', ')}`,
      `– Zeitrahmen: ${label(s.time)}`,
      `– Richtpreis: ${totalText}${totalText === ON_REQUEST ? '' : ' (unverbindlich)'}`,
      '',
      'KONTAKT',
      `– Name: ${data.name}`,
      `– E-Mail: ${data.email}`,
      '',
      'NACHRICHT',
      data.message || 'Keine Nachricht.',
    ];
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = update();
    const open = ORDER.find((k) => k !== 'contact' && !s.done[k]);
    if (open) {
      setStatus('Bitte triff zuerst in jedem Schritt eine Auswahl.', 'error');
      const first = steps[open].querySelector('input');
      if (first) first.focus();
      return;
    }
    const name = form.elements.name, email = form.elements.email, consent = form.elements.consent, message = form.elements.message;
    const badName = !name.value.trim();
    const badEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    const badConsent = !consent.checked;
    fieldError(name, 'f-name-error', badName);
    fieldError(email, 'f-email-error', badEmail);
    fieldError(consent, 'f-consent-error', badConsent);
    if (badName || badEmail || badConsent) {
      setStatus('Bitte prüfe die markierten Felder.', 'error');
      (badName ? name : badEmail ? email : consent).focus();
      return;
    }
    const data = { name: name.value.trim(), email: email.value.trim(), message: message.value.trim() };
    const lines = summaryLines(s, data);

    // Weg 1: Formular-Endpunkt (JSON per POST)
    if (config.form.endpoint) {
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const timer = ctrl && setTimeout(() => ctrl.abort(), 15000);
      submitBtn.classList.add('is-loading'); submitBtn.disabled = true; submitBtn.setAttribute('aria-busy', 'true');
      setStatus('Deine Anfrage wird gesendet …');
      try {
        const res = await fetch(config.form.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          signal: ctrl ? ctrl.signal : undefined,
          body: JSON.stringify({
            ...data,
            projektart: label(s.type), ausgangslage: label(s.base),
            umfang: s.single ? 'Eine Seite' : label(s.scope),
            extras: s.extras.map(label), zeitrahmen: label(s.time),
            richtpreis: totalText, zusammenfassung: lines.join('\n'),
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus(`Danke. Deine Anfrage ist angekommen. Wir melden uns ${responseTime ? `innerhalb von ${responseTime}` : 'bei dir'}.`, 'success');
        track('config-submit', { via: 'endpoint' });
        form.reset(); history.length = 0; snapshot = []; syncUndo(); update();
      } catch (err) {
        const alt = config.contact.email ? ` oder schreib uns direkt an ${config.contact.email}` : '';
        setStatus(`Das hat nicht geklappt. Bitte versuch es noch einmal${alt}.`, 'error');
        track('config-error', { via: 'endpoint' });
      } finally {
        clearTimeout(timer);
        submitBtn.classList.remove('is-loading'); submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy');
      }
      return;
    }

    // Weg 2: E-Mail-Programm des Besuchers. Zeilenumbrüche nach RFC 6068 als CRLF.
    if (config.contact.email) {
      const subject = `Projektanfrage: ${label(s.type)}`;
      window.location.href = `mailto:${config.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
      setStatus('Dein E-Mail-Programm öffnet sich mit der fertigen Anfrage. Du musst nur noch senden.', 'success');
      track('config-submit', { via: 'mailto' });
      return;
    }
    // Ohne Endpunkt und ohne E-Mail ist der Anfrage-Schritt ausgeblendet (data-requires in index.html).
    setStatus('Anfragen sind in Kürze möglich.', 'error');
  });

  update();
  syncUndo();
}

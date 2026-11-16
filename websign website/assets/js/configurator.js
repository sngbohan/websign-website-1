// Websign · Projekt-Konfigurator
// Rechnet ausschließlich mit den Werten aus config.js. Fehlt ein Preis, steht dort ein markierter Platzhalter.

const SINGLE_PAGE = ['onepager', 'landingpage'];
const ORDER = ['type', 'base', 'scope', 'extras', 'time', 'contact'];

export function initConfigurator(config, track = () => {}) {
  const form = document.querySelector('[data-config-form]');
  if (!form) return;
  const pricing = config.pricing;
  const steps = Object.fromEntries(ORDER.map((k) => [k, form.querySelector(`[data-step="${k}"]`)]));
  const sum = (k) => document.querySelector(`[data-sum="${k}"]`);
  const totalEl = document.querySelector('[data-total]');
  const vatEls = document.querySelectorAll('[data-vat-note]');
  const statusEl = document.querySelector('[data-form-status]');
  const scopeNote = form.querySelector('[data-scope-note]');
  const submitBtn = document.querySelector('button[form="config-form"]');
  const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const placeholder = (text) => { const m = document.createElement('mark'); m.className = 'ph'; m.textContent = text; return m; };
  const price = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), pricing);

  // Preisschilder an den Kacheln
  form.querySelectorAll('[data-price]').forEach((el) => {
    const path = el.dataset.price, v = price(path);
    el.textContent = '';
    if (v == null) el.append(placeholder('[PREIS]'));
    else if (path.startsWith('types.')) el.textContent = `ab ${money.format(v)}`;
    else el.textContent = v === 0 ? 'inklusive' : `+ ${money.format(v)}`;
  });
  if (pricing.vatNote) vatEls.forEach((el) => { el.textContent = pricing.vatNote; });

  const checked = (name) => form.querySelector(`input[name="${name}"]:checked`);
  const checkedAll = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)];
  const label = (input) => input.dataset.label;

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

  function update() {
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

    // Richtpreis: Summe aller gewählten Bausteine
    totalEl.textContent = '';
    if (!s.type) { totalEl.textContent = '–'; return s; }
    const parts = [price(`types.${s.type.value}`)];
    if (s.base) parts.push(price(`base.${s.base.value}`));
    if (s.scope) parts.push(price(`scope.${s.scope.value}`));
    for (const e of s.extras) if (e.value !== 'none') parts.push(price(`extras.${e.value}`));
    if (parts.some((v) => v == null)) totalEl.append(placeholder('[RICHTPREIS]'));
    else totalEl.textContent = `ab ${money.format(parts.reduce((a, b) => a + b, 0))}`;
    return s;
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
    update();
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

  function summaryText(s, data) {
    const totalText = totalEl.textContent.trim();
    return [
      'Projektanfrage über den Konfigurator',
      '',
      `Projektart: ${label(s.type)}`,
      `Ausgangslage: ${label(s.base)}`,
      `Umfang: ${s.single ? 'Eine Seite' : `${label(s.scope)} (${config.scopeLabels[s.scope.value]})`}`,
      `Extras: ${s.extras.map(label).join(', ')}`,
      `Zeitrahmen: ${label(s.time)}`,
      `Richtpreis: ${totalText}`,
      '',
      `Name: ${data.name}`,
      `E-Mail: ${data.email}`,
      '',
      data.message ? `Nachricht:\n${data.message}` : 'Keine Nachricht.',
    ].join('\n');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = update();
    const missing = ORDER.find((k) => k !== 'contact' && !s.done[k]);
    if (missing) {
      setStatus('Bitte triff zuerst in jedem Schritt eine Auswahl.', 'error');
      const first = steps[missing].querySelector('input');
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
    const body = summaryText(s, data);

    if (config.form.endpoint) {
      submitBtn.classList.add('is-loading'); submitBtn.disabled = true;
      try {
        const res = await fetch(config.form.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            ...data,
            projektart: label(s.type), ausgangslage: label(s.base),
            umfang: s.single ? 'Eine Seite' : label(s.scope),
            extras: s.extras.map(label), zeitrahmen: label(s.time),
            richtpreis: totalEl.textContent.trim(), zusammenfassung: body,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus('Danke. Deine Anfrage ist angekommen, wir melden uns bei dir.', 'success');
        track('config-submit', { via: 'endpoint' });
        form.reset(); update();
      } catch (err) {
        setStatus('Das hat nicht geklappt. Bitte versuch es noch einmal oder schreib uns direkt per E-Mail.', 'error');
      } finally {
        submitBtn.classList.remove('is-loading'); submitBtn.disabled = false;
      }
      return;
    }
    if (config.contact.email) {
      const subject = `Projektanfrage: ${label(s.type)}`;
      window.location.href = `mailto:${config.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setStatus('Dein E-Mail-Programm öffnet sich mit der fertigen Anfrage. Du musst nur noch senden.', 'success');
      track('config-submit', { via: 'mailto' });
      return;
    }
    setStatus('Der Versand ist noch nicht eingerichtet: In assets/js/config.js fehlt die E-Mail-Adresse oder ein Formular-Endpunkt.', 'error');
  });

  update();
}

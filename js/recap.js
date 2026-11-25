/* =========================================================
   Summary page: reads the last request from LocalStorage,
   window.name or the URL, then renders it.
   ========================================================= */
(function () {
  'use strict';

  var root = document.getElementById('summary-root');
  if (!root) return;

  /* ---------- retrieval ---------- */
  function fromStorage() {
    var raw = window.TVBStore.get('tvb_last');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function fromWindowName() {
    var name = '';
    try { name = window.name || ''; } catch (e) { return null; }
    if (name.indexOf('TVB|') !== 0) return null;
    try { return JSON.parse(decodeURIComponent(name.slice(4))); } catch (e) { return null; }
  }

  function fromQuery() {
    var p = new URLSearchParams(window.location.search);
    if (!p.get('ref') || !p.get('name')) return null;
    return {
      ref: p.get('ref'),
      name: p.get('name'),
      email: p.get('email') || '',
      country: p.get('country') || '',
      destination: p.get('destination') || 'Vanuatu',
      bankName: p.get('bankName') || '',
      accountName: p.get('accountName') || '',
      accountNumber: p.get('accountNumber') || '',
      amount: parseFloat(p.get('amount')),
      currency: p.get('currency') || 'USD',
      reference: p.get('reference') || '',
      subject: p.get('subject') || '',
      date: p.get('date') || new Date().toISOString(),
      status: 'received'
    };
  }

  var record = fromStorage() || fromWindowName() || fromQuery();

  /* ---------- empty state ---------- */
  if (!record || !record.ref) {
    root.innerHTML =
      '<div class="card empty-state">' +
      '<div class="icon-badge" style="margin:0 auto 1rem;">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>' +
      '</div>' +
      '<h2>No request to display</h2>' +
      '<p>Submit a verification request from the form first. Your summary will appear here automatically after submission.</p>' +
      '<a class="btn btn-gold" href="form.html">Start a request</a>' +
      '</div>';
    return;
  }

  /* ---------- formatting ---------- */
  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    try {
      return d.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
    } catch (e) {
      return d.toISOString();
    }
  }

  function formatAmount(value, currency) {
    var n = Number(value);
    if (isNaN(n)) return String(value) + ' ' + currency;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
      }).format(n);
    } catch (e) {
      return n.toFixed(2) + ' ' + currency;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- mask account number (privacy) ---------- */
  function maskAccount(value) {
    if (!value) return '—';
    var s = String(value).trim();
    if (s.length <= 4) return '••••';
    return '•••• •••• ' + s.slice(-4);
  }

  /* ---------- render ---------- */
  root.innerHTML =
    '<div class="status-banner">' +
      '<div>' +
        '<h2>Your request has been recorded</h2>' +
        '<p>Step 2 of 3 · Submitted on ' + escapeHtml(formatDate(record.date)) + '</p>' +
      '</div>' +
      '<span class="badge"><span class="dot"></span>Received — pending verification</span>' +
    '</div>' +

    '<div class="grid grid-2 mt-2" style="align-items:start;">' +
      '<div class="card" style="padding:0;overflow:hidden;">' +
        '<table class="summary-table">' +
          '<tr><th>Request reference</th><td><span class="mono">' + escapeHtml(record.ref) + '</span><button type="button" class="btn-copy" data-copy="' + escapeHtml(record.ref) + '">Copy</button></td></tr>' +
          '<tr><th>Applicant</th><td>' + escapeHtml(record.name) + '</td></tr>' +
          '<tr><th>Contact e-mail</th><td>' + escapeHtml(record.email) + '</td></tr>' +
          '<tr><th>Country of residence</th><td>' + escapeHtml(record.country) + '</td></tr>' +
          '<tr><th>Destination</th><td>' + escapeHtml(record.destination || 'Vanuatu') + '</td></tr>' +
          '<tr><th>Bank</th><td>' + escapeHtml(record.bankName || '—') + '</td></tr>' +
          '<tr><th>Account holder</th><td>' + escapeHtml(record.accountName || '—') + '</td></tr>' +
          '<tr><th>Account number</th><td><span class="mono">' + escapeHtml(maskAccount(record.accountNumber)) + '</span> <span style="font-weight:400;color:var(--muted);font-size:.8rem;">(last 4 digits shown)</span></td></tr>' +
          '<tr><th>Declared amount</th><td>' + escapeHtml(formatAmount(record.amount, record.currency)) + '</td></tr>' +
          '<tr><th>Subject</th><td>' + escapeHtml(record.subject) + '</td></tr>' +
          (record.reference ? '<tr><th>Your own reference</th><td>' + escapeHtml(record.reference) + '</td></tr>' : '') +
          '<tr><th>Status</th><td>Received — pending verification</td></tr>' +
        '</table>' +
      '</div>' +

      '<div>' +
        '<div class="confirm-box">' +
          '<p style="margin-bottom:1rem;"><strong>Confirmation.</strong> Your request has been recorded. ' +
          'The information submitted will be subject to verification.</p>' +
          '<p class="mb-0" style="font-size:.88rem;color:#AFC3E0;">Keep your reference number.</p>' +
        '</div>' +

        '<div class="form-actions no-print">' +
          '<a class="btn btn-gold" href="fees.html">Next: bank fees<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:.4rem"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></a>' +
          '<button class="btn btn-ghost" type="button" id="btn-print">Print summary</button>' +
          '<a class="btn btn-ghost" href="form.html">New request</a>' +
        '</div>' +
      '</div>' +
    '</div>';

  var printBtn = document.getElementById('btn-print');
  if (printBtn) {
    printBtn.addEventListener('click', function () { window.print(); });
  }

  var copyBtn = root.querySelector('.btn-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-copy') || '';
      var done = function () {
        copyBtn.classList.add('is-copied');
        copyBtn.textContent = 'Copied ✓';
        window.setTimeout(function () {
          copyBtn.classList.remove('is-copied');
          copyBtn.textContent = 'Copy';
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        done();
      }
    });
  }
})();

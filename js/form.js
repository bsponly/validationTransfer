/* =========================================================
   Request form: validation + local registration + EmailJS
   (Non-sensitive data only — never passwords, OTP, card numbers)
   ========================================================= */
(function () {
  'use strict';

  var form = document.getElementById('request-form');
  if (!form) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var NAME_RE = /^[A-Za-zÀ-ÿ'’.\- ]{2,80}$/;

  /* ---------- EmailJS configuration ----------------------------------
     Keys below come from https://www.emailjs.com
     (Account → API Keys · Email Services · Email Templates).
     While the keys still start with "YOUR_", e-mails are skipped and the
     request flow works exactly as before.

     Template variables available to your e-mail template:
       {{request_ref}} {{full_name}} {{email}} {{country}} {{destination}}
       {{bank_name}} {{account_name}} {{account_number}}
       {{amount}} {{currency}} {{subject}} {{own_reference}}
       {{submitted_at}} {{reply_to}} {{from_name}} {{message}}
  ------------------------------------------------------------------- */
  var EMAILJS_CONFIG = {
    publicKey: 'uoeNnPKCrjtcBQGzL',
    serviceId: 'service_d2oqbdw',
    templateId: 'template_w665nbs'
  };

  // NB: the tests below look for the placeholder prefix 'YOUR_' — do NOT
  // replace it with your real keys, or the checks would always fail.
  if (typeof window.emailjs !== 'undefined' &&
      EMAILJS_CONFIG.publicKey.indexOf('YOUR_') !== 0) {
    try {
      window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
    } catch (e) { /* SDK not available */ }
  }

  function emailConfigured() {
    return typeof window.emailjs !== 'undefined' &&
      EMAILJS_CONFIG.publicKey.indexOf('YOUR_') !== 0 &&
      EMAILJS_CONFIG.serviceId.indexOf('YOUR_') !== 0 &&
      EMAILJS_CONFIG.templateId.indexOf('YOUR_') !== 0;
  }

  /* ---------- helpers ---------- */
  function fieldOf(input) {
    return input.closest('.field');
  }

  function setError(input, message) {
    var field = fieldOf(input);
    if (!field) return;
    field.classList.add('has-error');
    var box = field.querySelector('.field-error');
    if (box) box.textContent = message;
  }

  function clearError(input) {
    var field = fieldOf(input);
    if (!field) return;
    field.classList.remove('has-error');
    var box = field.querySelector('.field-error');
    if (box) box.textContent = '';
  }

  function validate() {
    var ok = true;
    var firstBad = null;

    form.querySelectorAll('.input, .select').forEach(clearError);

    var name = form.elements['fullName'];
    if (!name.value.trim() || !NAME_RE.test(name.value.trim())) {
      setError(name, 'Please enter a valid full name (letters, spaces, hyphens).');
      ok = false; firstBad = firstBad || name;
    }

    var email = form.elements['email'];
    if (!EMAIL_RE.test(email.value.trim())) {
      setError(email, 'Please enter a valid e-mail address.');
      ok = false; firstBad = firstBad || email;
    }

    var country = form.elements['country'];
    if (!country.value) {
      setError(country, 'Please select your country of residence.');
      ok = false; firstBad = firstBad || country;
    }

    var bankName = form.elements['bankName'];
    if (bankName) {
      if (bankName.value.trim().length < 2) {
        setError(bankName, 'Please enter the name of the bank.');
        ok = false; firstBad = firstBad || bankName;
      }
    }

    var accName = form.elements['accountName'];
    if (accName) {
      if (!accName.value.trim() || !NAME_RE.test(accName.value.trim())) {
        setError(accName, 'Please enter the account holder name (letters, spaces, hyphens).');
        ok = false; firstBad = firstBad || accName;
      }
    }

    var accNum = form.elements['accountNumber'];
    if (accNum) {
      if (!/^[A-Za-z0-9][A-Za-z0-9 .-]{5,33}$/.test(accNum.value.trim())) {
        setError(accNum, 'Please enter a valid bank account number (6 to 34 characters).');
        ok = false; firstBad = firstBad || accNum;
      }
    }

    var amount = form.elements['amount'];
    var amountVal = parseFloat(String(amount.value).replace(/\s/g, '').replace(',', '.'));
    if (!amount.value || isNaN(amountVal) || amountVal <= 0) {
      setError(amount, 'Please enter an amount greater than zero.');
      ok = false; firstBad = firstBad || amount;
    }

    var currency = form.elements['currency'];
    if (!currency.value) {
      setError(currency, 'Please select a currency.');
      ok = false; firstBad = firstBad || currency;
    }

    var subject = form.elements['subject'];
    if (!subject.value) {
      setError(subject, 'Please select the subject of your request.');
      ok = false; firstBad = firstBad || subject;
    }

    var consent = form.elements['consent'];
    var consentWrap = consent.closest('.consent');
    if (!consent.checked) {
      consentWrap.classList.add('has-error');
      ok = false; firstBad = firstBad || consent;
    } else {
      consentWrap.classList.remove('has-error');
    }

    if (firstBad) firstBad.focus();
    return { ok: ok, amount: amountVal };
  }

  /* ---------- reference number ---------- */
  function randomBlock(len) {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    var cryptoObj = window.crypto || window.msCrypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
      var buf = new Uint8Array(len);
      cryptoObj.getRandomValues(buf);
      for (var i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
      return out;
    }
    for (var j = 0; j < len; j++) {
      out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return out;
  }

  function buildReference(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return 'TVB-' + y + m + d + '-' + randomBlock(4);
  }

  /* ---------- submit ---------- */
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var result = validate();
    if (!result.ok) {
      var errorBox = document.getElementById('form-status');
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.className = 'notice notice-danger';
        errorBox.textContent = 'Some fields need your attention. Please review the highlighted fields.';
      }
      return;
    }

    var now = new Date();
    var record = {
      ref: buildReference(now),
      name: form.elements['fullName'].value.trim(),
      email: form.elements['email'].value.trim(),
      country: form.elements['country'].value,
      destination: 'Vanuatu',
      bankName: form.elements['bankName'] ? form.elements['bankName'].value.trim() : '',
      accountName: form.elements['accountName'] ? form.elements['accountName'].value.trim() : '',
      accountNumber: form.elements['accountNumber'] ? form.elements['accountNumber'].value.trim() : '',
      amount: result.amount,
      currency: form.elements['currency'].value,
      reference: form.elements['reference'].value.trim(),
      subject: form.elements['subject'].value,
      date: now.toISOString(),
      status: 'received'
    };

    // 1) Persist (works when LocalStorage is available)
    window.TVBStore.set('tvb_last', JSON.stringify(record));
    try {
      var all = JSON.parse(window.TVBStore.get('tvb_requests') || '[]');
      if (!Array.isArray(all)) all = [];
      all.unshift(record);
      window.TVBStore.set('tvb_requests', JSON.stringify(all.slice(0, 25)));
    } catch (e) { /* ignore corrupted history */ }

    // 2) Carry the record across the page change even without storage
    try {
      window.name = 'TVB|' + encodeURIComponent(JSON.stringify(record));
    } catch (e) { /* ignore */ }

    // 3) URL parameters as the last fallback
    var params = new URLSearchParams({
      ref: record.ref,
      name: record.name,
      email: record.email,
      country: record.country,
      destination: record.destination,
      bankName: record.bankName,
      accountName: record.accountName,
      accountNumber: record.accountNumber,
      amount: String(record.amount),
      currency: record.currency,
      subject: record.subject,
      date: record.date
    });

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn && !submitBtn.classList.contains('is-loading')) {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      var spin = document.createElement('span');
      spin.className = 'spinner';
      submitBtn.insertBefore(spin, submitBtn.firstChild);
    }

    var statusBox = document.getElementById('form-status');
    function setStatus(kind, text) {
      if (!statusBox) return;
      statusBox.hidden = false;
      statusBox.className = 'notice ' + kind;
      statusBox.textContent = text;
    }
    function redirectNow() {
      window.location.href = 'recap.html?' + params.toString();
    }
    function goToSummary(delay) {
      setStatus('notice-info', 'Request recorded — redirecting to your summary…');
      window.setTimeout(redirectNow, delay);
    }

    /* ---------- e-mail notification (EmailJS) ---------- */
    var submittedAt = new Date(record.date).toLocaleString();
    var templateParams = {
      reply_to: record.email,
      from_name: record.name,
      request_ref: record.ref,
      full_name: record.name,
      email: record.email,
      country: record.country,
      destination: record.destination,
      bank_name: record.bankName,
      account_name: record.accountName,
      account_number: record.accountNumber,
      amount: String(record.amount) + ' ' + record.currency,
      currency: record.currency,
      subject: record.subject,
      own_reference: record.reference || '—',
      submitted_at: submittedAt,
      message:
        'New verification request ' + record.ref + '\n' +
        'Name: ' + record.name + ' (' + record.email + ')\n' +
        'Residence: ' + record.country + ' → Destination: ' + record.destination + '\n' +
        'Bank: ' + record.bankName + '\n' +
        'Account holder: ' + record.accountName + '\n' +
        'Account number: ' + record.accountNumber + '\n' +
        'Amount: ' + record.amount + ' ' + record.currency + '\n' +
        'Subject: ' + record.subject +
        (record.reference ? '\nOwn reference: ' + record.reference : '') +
        '\nSubmitted: ' + submittedAt
    };

    if (emailConfigured()) {
      setStatus('notice-info', 'Sending your request by e-mail…');
      var sendPromise = window.emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams,
        { publicKey: EMAILJS_CONFIG.publicKey }
      );
      var timeoutPromise = new Promise(function (resolve, reject) {
        window.setTimeout(function () { reject(new Error('EmailJS timeout')); }, 8000);
      });
      Promise.race([sendPromise, timeoutPromise])
        .then(function () { goToSummary(450); })
        .catch(function () {
          setStatus('notice', 'Request recorded. The e-mail notification could not be sent — continuing to your summary.');
          window.setTimeout(redirectNow, 1800);
        });
    } else {
      goToSummary(450);
    }
  });

  // Clear a field's error as soon as the user corrects it
  form.querySelectorAll('.input, .select').forEach(function (input) {
    input.addEventListener('input', function () { clearError(input); });
    input.addEventListener('change', function () { clearError(input); });
  });

  var consentInput = form.elements['consent'];
  if (consentInput) {
    consentInput.addEventListener('change', function () {
      var wrap = consentInput.closest('.consent');
      if (wrap) wrap.classList.remove('has-error');
    });
  }
})();

(function () {
  'use strict';

  var SUPABASE_URL = 'https://snwthyespgghvvlktyyu.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lok_cbkXwfsPKEpOTTCl4Q_6aqpNf0v';
  var TABLE = 'nilmo_site_config';
  var currentAddress = '';
  var caClient = null;

  function isAddress(value) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value || '');
  }

  function normalise(value) {
    value = String(value || '').trim();
    if (isAddress(value)) return value;
    return value.toLowerCase() === 'tba' ? 'tba' : '';
  }

  function render(value) {
    var box = document.getElementById('nilmo-ca');
    var label = document.getElementById('nilmo-ca-label');
    var output = document.getElementById('nilmo-ca-value');
    var note = document.getElementById('nilmo-ca-note');
    if (!box || !label || !output || !note) return;

    currentAddress = normalise(value);
    var copyable = isAddress(currentAddress);
    box.dataset.copyable = copyable ? 'true' : 'false';
    box.disabled = !copyable;
    output.textContent = copyable ? currentAddress : 'TBA';
    label.textContent = 'Contract address';
    note.textContent = copyable ? 'Click to copy the official CA.' : 'Official CA will be announced here.';
    box.title = copyable ? 'Copy contract address' : 'Contract address has not been announced';
    box.setAttribute('aria-label', copyable ? 'Nilmo contract address. Click to copy.' : 'Nilmo contract address is to be announced.');
  }

  async function fetchAddress() {
    try {
      var response = await fetch(
        `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.main&select=contract_address,updated_at`,
        {
          headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: 'application/json' },
          cache: 'no-store'
        }
      );
      if (!response.ok) throw new Error('CA request returned ' + response.status);
      var rows = await response.json();
      if (rows && rows[0]) render(rows[0].contract_address);
    } catch (error) {
      console.warn('Nilmo CA could not be refreshed.', error);
    }
  }

  function subscribe() {
    if (!window.supabase || !window.supabase.createClient) return;
    caClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    caClient
      .channel('nilmo-ca-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: TABLE,
        filter: 'id=eq.main'
      }, function (payload) {
        render(payload.new && payload.new.contract_address);
      })
      .subscribe();
  }

  async function copyAddress() {
    if (!isAddress(currentAddress)) return;
    try {
      await navigator.clipboard.writeText(currentAddress);
      var label = document.getElementById('nilmo-ca-label');
      if (!label) return;
      label.textContent = 'Copied';
      window.setTimeout(function () { label.textContent = 'Contract address'; }, 1200);
    } catch (error) {
      console.warn('Nilmo CA could not be copied.', error);
    }
  }

  function start() {
    var box = document.getElementById('nilmo-ca');
    if (!box) return;
    box.addEventListener('click', copyAddress);
    render('tba');
    fetchAddress();
    subscribe();
    window.addEventListener('focus', fetchAddress);
    window.setInterval(fetchAddress, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());

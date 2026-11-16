import { execFileSync } from 'node:child_process';

const PROJECT_REF = 'snwthyespgghvvlktyyu';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const TABLE = 'nilmo_site_config';
const input = String(process.argv[2] || '').trim();
const isAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input);
const value = input.toLowerCase() === 'tba' ? 'tba' : isAddress ? input : '';

if (!value) {
  console.error('Usage: npm run update:ca -- <Solana address|tba>');
  process.exit(1);
}

const cliArguments = [
  '--yes',
  'supabase@latest',
  'projects',
  'api-keys',
  '--project-ref',
  PROJECT_REF,
  '--output',
  'json'
];
const processOptions = { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] };
const raw = process.platform === 'win32'
  ? execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', `npx ${cliArguments.join(' ')}`], processOptions)
  : execFileSync('npx', cliArguments, processOptions);

const start = raw.indexOf('[');
const end = raw.lastIndexOf(']');
if (start < 0 || end < start) throw new Error('Could not read Supabase project keys.');
const keys = JSON.parse(raw.slice(start, end + 1));
const serviceKey = keys.find(key => key.id === 'service_role')?.api_key;
if (!serviceKey) throw new Error('Supabase service role key is unavailable.');

const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.main`, {
  method: 'PATCH',
  headers: {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
    prefer: 'return=representation'
  },
  body: JSON.stringify({ contract_address: value, updated_at: new Date().toISOString() })
});

if (!response.ok) throw new Error(`Supabase update failed: ${response.status} ${await response.text()}`);
const rows = await response.json();
if (!rows[0] || rows[0].contract_address !== value) throw new Error('Supabase did not confirm the CA update.');

console.log(`Nilmo CA updated: ${value}`);

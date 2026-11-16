import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'site');
const endpoint = 'https://nilmo-solana-mcp.vercel.app/mcp';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  }));
  return nested.flat();
}

const replacements = [
  ['MCP endpoint coming soon', endpoint],
  ['The production MCP endpoint will be published when it is ready.', 'Connect to the live public MCP endpoint.'],
  ['The website documents the intended Solana product. Production endpoints and integrations are not presented as live until they are deployed and verified.', 'The public beta MCP endpoint is live with nine verified Solana mainnet-beta read and simulation tools. Additional integrations remain clearly marked as planned.'],
  ['Connect Nilmo as a remote MCP server, then ask an AI client about Solana. The production endpoint will be announced when it is ready.', 'Connect Nilmo as a remote MCP server, then ask an AI client to read and simulate on Solana mainnet-beta.'],
  ['<h2 id=\\"endpoint\\">Endpoint</h2><div class=\\"co\\"><b>Coming soon</b><p>The public MCP URL is not configured yet. Do not use an old Nilmo or third-party endpoint.</p></div>', `<h2 id=\\"endpoint\\">Endpoint</h2><div class=\\"co\\"><b>Live on mainnet-beta</b><p>Add <code>${endpoint}</code> as a remote Streamable HTTP MCP server.</p></div>`],
  ['Read requests need only a public key. Write requests return an unsigned Solana transaction for a wallet to inspect and sign.', 'Read requests need only a public key. The current public beta never signs or broadcasts: transaction simulation accepts provided transaction bytes and returns logs without sending them.'],
  ['Access to the production Nilmo gateway will be documented when the endpoint is ready.', 'The public Nilmo gateway is available without an access key during beta.'],
  ['The intended model allows ordinary Solana reads without a wallet. Rate limits will protect the service from abuse.', 'Ordinary Solana reads and transaction simulation are live without a wallet. Fair-use rate limits protect the public service from abuse.'],
  ['<div class=\\"co\\"><b>Pre-launch</b><p>The access-key service is not presented as live. Final limits and the key-management URL will be published with the production gateway.</p></div>', '<div class=\\"co\\"><b>Public beta</b><p>No access key is required for the live endpoint. Optional higher-limit service keys remain planned.</p></div>'],
  ['solana_get_token_accounts', 'solana_get_token_balances'],
  ['solana_get_account</code>', 'solana_get_account_info</code>'],
  ['The public site describes the intended Solana product. The MCP endpoint and production integrations will be announced separately when they are ready.', `The public MCP endpoint is live at <code>${endpoint}</code> with verified Solana mainnet-beta reads and transaction simulation. Wallet signing, broadcasting and protocol-specific integrations remain separate roadmap items.`],
  ['<h2 id=\\"live\\">Is the production gateway live?</h2><p>Not yet. The endpoint will be published when it is deployed and verified.</p>', `<h2 id=\\"live\\">Is the production gateway live?</h2><p>Yes. The public beta endpoint is <code>${endpoint}</code>. It currently provides nine verified read and simulation tools.</p>`],
  ['<tr><th>Status</th><td>In development</td></tr>', '<tr><th>Status</th><td>Public beta · live</td></tr>'],
  ['<tr><th>Endpoint</th><td>To be announced</td></tr>', `<tr><th>Endpoint</th><td><code>${endpoint}</code></td></tr>`],
  ['<div><span class="lab">Status</span><b>In development</b></div>', '<div><span class="lab">Status</span><b>Public beta</b></div>'],
  ['<section class="wr x-sec"><div class="x-h x-rv"><b>01</b><h2>One endpoint</h2><p>Coming soon</p></div><p class="ld x-rv">The production MCP endpoint is not configured yet. When it is ready, each supported client will use the same streamable-HTTP URL and expose the same Solana tools.</p></section>', `<section class="wr x-sec"><div class="x-h x-rv"><b>01</b><h2>One endpoint</h2><p>Live public beta</p></div><p class="ld x-rv">Add <code>${endpoint}</code> as a remote Streamable HTTP MCP server. Supported clients receive the same nine verified Solana mainnet-beta read and simulation tools.</p></section>`],
  ['The public MCP endpoint, signing route, integration status and any deployed program IDs will be announced only after they are available and verified.', `The public MCP endpoint is live at ${endpoint}. Wallet signing, transaction broadcasting, protocol integrations and any deployed program IDs will be announced only after each is available and verified.`],
  ['You add one URL to your AI client, and from then on you can ask it to read the chain, explain and simulate transactions, build and deploy programs, or act within limits you set.', 'You add one URL to your AI client, and from then on you can ask it to read balances, inspect accounts and transaction history, check signatures, and simulate provided transactions.'],
  ['The production MCP endpoint is not configured yet.', `The public MCP endpoint is live at ${endpoint}.`],
  ['Solana-native tools grouped by what the AI needs to do: read, understand, build, act and automate.', 'The public beta provides nine verified read and simulation tools. Build, DeFi and delegated-agent categories below are roadmap items.'],
  ['<b>Read</b><span>Accounts, balances, tokens, slots, programs and signatures.</span>', '<b>Read · live</b><span>Accounts, balances, tokens, network status and signatures.</span>'],
  ['<b>Understand</b><span>Decode instructions, explain effects and inspect programs.</span>', '<b>Understand · planned</b><span>Deeper instruction decoding and program inspection.</span>'],
  ['<b>Build</b><span>Scaffold, test and deploy Solana programs and IDLs.</span>', '<b>Build · planned</b><span>Scaffold, test and deploy Solana programs and IDLs.</span>'],
  ['<b>Act</b><span>Prepare and simulate wallet-signed transactions.</span>', '<b>Act · simulation live</b><span>Simulation is live; transaction preparation is planned.</span>'],
  ['<b>Jupiter</b><span>Swap quotes and routed transactions.</span>', '<b>Jupiter · planned</b><span>Swap quotes and routed transactions.</span>'],
  ['<b>Raydium</b><span>Pools, liquidity and launches.</span>', '<b>Raydium · planned</b><span>Pools, liquidity and launches.</span>'],
  ['<b>Drift</b><span>Perpetual markets, account risk and orders.</span>', '<b>Drift · planned</b><span>Perpetual markets, account risk and orders.</span>'],
  ['<b>Kamino</b><span>Lending markets, obligations and vaults.</span>', '<b>Kamino · planned</b><span>Lending markets, obligations and vaults.</span>'],
  ['<tr><th><code>solana_get_program_accounts</code></th><td>Program-owned accounts with filters.</td></tr>', ''],
  ['<tr><th><code>solana_get_slot</code></th><td>Current or requested slot and block data.</td></tr>', '<tr><th><code>solana_get_signature_status</code></th><td>Confirmation and error status for a transaction signature.</td></tr><tr><th><code>solana_get_token_supply</code></th><td>Current supply and decimals for an SPL token mint.</td></tr><tr><th><code>solana_network_status</code></th><td>Live mainnet health, slot, epoch and RPC version.</td></tr><tr><th><code>solana_simulate_transaction</code></th><td>Simulates provided base64 transaction bytes without broadcasting.</td></tr>'],
  ['<tr><th><code>solana_search_docs</code></th><td>Relevant Solana documentation for the question.</td></tr>', ''],
  ['Turn raw Solana transactions and program state into structured explanations.', 'Planned: add deeper instruction decoding and program-state explanations after the live core read tools.'],
  ['Build Solana programs and client instructions with Rust, Anchor or native Solana tooling.', 'Planned: build Solana programs and client instructions with Rust, Anchor or native Solana tooling.'],
  ['Prepare Solana actions as unsigned transactions, simulate them and return them to the user’s wallet.', 'Transaction simulation is live. Unsigned transaction preparation and wallet handoff remain planned.'],
  ['Nilmo prepares Solana transactions; the user’s wallet controls every signature.', 'Wallet-controlled signing is planned. The live beta reads mainnet state and simulates transaction bytes without broadcasting.'],
  ['// simulate before asking anyone to sign', '// read live mainnet state'],
  ['name: \\"solana_prepare_transaction\\",\\n  arguments: { request: \\"send 5 SOL to 7VbW…kP3\\", from: process.env.ADDRESS },', 'name: \\"solana_get_balance\\",\\n  arguments: { address: process.env.ADDRESS, commitment: \\"confirmed\\" },'],
  ['# read the latest block', '# check the live mainnet connection'],
  ['result = await session.call_tool(\\"solana_get_block\\", {\\"block\\": \\"latest\\"})', 'result = await session.call_tool(\\"solana_network_status\\", {\\"commitment\\": \\"confirmed\\"})'],
  ['Call <code>solana_simulate</code> or read the simulation in a prepared transaction before your agent commits to a plan.', 'Call <code>solana_simulate_transaction</code> with transaction bytes before your agent commits to a plan.'],
  ['<b>Retry safely.</b> <code>solana_send_signed</code> is safe to repeat. On <code>rate_limited</code>, wait the time in the message.', '<b>Retry reads safely.</b> Read-only tools are idempotent. On a rate-limit response, wait before retrying.'],
  ['Connections are told apart by a salted one-way fingerprint of their network address, so the address itself is never stored. Requests larger than 2 MB are refused.', 'The public beta applies a best-effort limit of 120 requests per minute per network source. Requests larger than 512 KB are refused, and the hosting platform or upstream RPC may apply additional limits.'],
  ['With an access key, limits are counted per key: 600 calls a minute and 60 heavy calls a minute. See <a class=\\"il\\" href=\\"#/auth\\">Access</a>.', 'Higher-limit access keys are planned and are not required for the public beta. See <a class=\\"il\\" href=\\"#/auth\\">Access</a>.'],
  ['A request can carry up to 10 JSON-RPC messages. Each message counts against the limits on its own, so a batch never costs less than the same calls sent one by one. The gateway also starts a limited number of brand new event indexes each day, so querying an existing index is always the better path.', 'Batch JSON-RPC requests are not supported by the current public beta. Send one MCP request at a time.'],
  ['<li>Leave out <code>tokens</code> on <code>solana_get_balance</code> to get every balance in one call.</li><li>Narrow <code>solana_get_logs</code> with an event name, a <code>where</code> filter, a block range and a <code>limit</code>.</li><li>Use <code>solana_prepare_batch</code> for steps that belong together.</li><li>Use <code>solana_wait</code> once instead of asking for a transaction repeatedly.</li>', '<li>Use <code>solana_get_token_balances</code> once to retrieve SPL Token and Token-2022 holdings together.</li><li>Keep <code>solana_get_signatures</code> limits small and paginate only when needed.</li><li>Use <code>solana_get_signature_status</code> before requesting full transaction details.</li>'],
  ['<b>Planned</b><span class="mono">Launch</span>', '<b>16 Nov 2026</b><span class="mono">Public beta</span>'],
  ['Nilmo is being built for Solana mainnet-beta.', 'Nilmo is live in public beta on Solana mainnet-beta.'],
  ['Launch includes 47 tools across Read, Understand, Build, Act, Agents, Perps and Privacy-aware tools.', 'Public beta includes nine verified tools for balances, accounts, tokens, signatures, transactions, network status and non-broadcast simulation.'],
  ['<span class="wd-st">Live</span>', '<span class="wd-st">Planned</span>'],
  ['<span>Group 01</span><span class="wd-st">Planned</span>', '<span>Group 01</span><span class="wd-st">Public beta</span>'],
];

const liveCatalogue = `<article class="wd-w x-rv on" data-pfh><div class="wd-v"><canvas data-pf="galaxy" data-n="2600" data-dim="1" data-seed="5"></canvas><span class="bk tl"></span><span class="bk br"></span><div class="wd-tag mono"><span>Group 01</span><span class="wd-st">Public beta</span></div></div><div class="wd-i"><span class="lab">Group 01</span><h3>Live Solana tools</h3><p>Nine verified tools read and simulate against Solana mainnet-beta. They need no wallet and never sign or broadcast a transaction.</p><div class="wd-q"><span class="mono">Endpoint</span><p>${endpoint}</p></div><div class="tt-l">
<div class="tt"><code>solana_get_balance</code><p>Returns SOL in lamports and SOL.</p></div>
<div class="tt"><code>solana_get_token_balances</code><p>Lists SPL Token and Token-2022 balances.</p></div>
<div class="tt"><code>solana_get_account_info</code><p>Returns owner program, lamports, executable status and parsed data.</p></div>
<div class="tt"><code>solana_get_signatures</code><p>Returns recent signatures involving an address.</p></div>
<div class="tt"><code>solana_get_transaction</code><p>Returns parsed instructions, balances, fees and logs.</p></div>
<div class="tt"><code>solana_get_signature_status</code><p>Checks confirmation and transaction errors.</p></div>
<div class="tt"><code>solana_get_token_supply</code><p>Returns token supply and decimals.</p></div>
<div class="tt"><code>solana_network_status</code><p>Returns mainnet health, slot, epoch and RPC version.</p></div>
<div class="tt"><code>solana_simulate_transaction</code><p>Simulates provided base64 transaction bytes without broadcasting.</p></div>
</div><a class="btnb" href="docs.html#/quickstart">Connect now &rarr;</a></div></article>`;

let changed = 0;
for (const file of await htmlFiles(root)) {
  const before = await readFile(file, 'utf8');
  let after = before;
  for (const [from, to] of replacements) after = after.split(from).join(to);
  if (file.endsWith(`${path.sep}worlds.html`) || file.endsWith(`${path.sep}worlds${path.sep}index.html`)) {
    after = after.replace(/<article class="wd-w x-rv on" data-pfh>.*?<span>Group 01<\/span>.*?<\/article>/s, liveCatalogue);
  }
  if (file.endsWith(`${path.sep}research.html`) || file.endsWith(`${path.sep}research${path.sep}index.html`)) {
    after = after.replace(
      /<div class="mc rv" data-pfh style="--d:0s">.*?<\/div><\/div>\s*(?=<div class="mc rv" data-pfh style="--d:\.08s">)/s,
      `<div class="mc rv" data-pfh style="--d:0s"><canvas data-pf="galaxy" data-n="1600" data-seed="21" aria-hidden="true"></canvas><div class="mb"><div class="mt"><span>Group 01</span><em>Public beta · 9 tools</em></div><h3>Read and simulate</h3><p style="font-size:14.5px;line-height:1.65;color:var(--ink2)">Live Solana mainnet-beta balances, accounts, token holdings, signatures, transactions, network status and non-broadcast transaction simulation. No wallet is required.</p><p class="nm">solana_get_balance<br>solana_get_token_balances<br>solana_get_account_info<br>solana_get_signatures<br>solana_get_transaction<br>solana_get_signature_status<br>solana_get_token_supply<br>solana_network_status<br>solana_simulate_transaction</p></div></div>`
    );
    after = after.replace(/(<span>Group (?:0[2-9]|1[01])<\/span>)<em>.*?<\/em>/g, '$1<em>Planned</em>');
    after = after.replace('<span class="lab">Example in the default mode</span>', '<span class="lab">Planned wallet-action flow</span>');
  }
  if (after !== before) {
    await writeFile(file, after);
    changed += 1;
  }
}

console.log(`Published ${endpoint} across ${changed} HTML files.`);

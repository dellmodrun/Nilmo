import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const textExtensions = new Set(['.html', '.js', '.json', '.xml', '.txt', '.md']);
let changed = 0;

const replacements = [
  [/https:\/\/mcp\.teseralab\.com\/elysium/gi, 'YOUR_NILMO_MCP_ENDPOINT'],
  [/mcp\.teseralab\.com\/elysium/gi, 'YOUR_NILMO_MCP_ENDPOINT'],
  [/https:\/\/mcp\.teseralab\.com/gi, 'YOUR_NILMO_API_ENDPOINT'],
  [/mcp\.teseralab\.com/gi, 'YOUR_NILMO_API_ENDPOINT'],
  [/teseralab\.com\/keys/gi, 'the access-key page'],
  [/teseralab\.com/gi, 'the Nilmo website'],
  [/<a href="mailto:contact@teseralab\.com">contact@teseralab\.com<\/a>/gi, '<a href="https://x.com/nilmonwork">@nilmonwork on X</a>'],
  [/contact@teseralab\.com/gi, '@nilmonwork'],
  [/\$KNTQ buybacks/gi, 'Solana architecture'],
  [/KNTQ buybacks/gi, 'Solana architecture'],
  [/#\/buybacks/g, '#/architecture'],
  [/#buybacks/g, '#architecture'],
  [/id="buybacks"/g, 'id="architecture"'],
  [/Elysium mainnet/gi, 'Solana mainnet-beta'],
  [/Elysium/gi, 'Solana'],
  [/elysium_/g, 'solana_'],
  [/\belysium\b/g, 'solana'],
  [/HyperCore/gi, 'Pyth market data'],
  [/HyperEVM/gi, 'Ethereum'],
  [/Hyperliquid/gi, 'Drift'],
  [/Kinetiq/gi, 'the Solana ecosystem'],
  [/Uniswap v4/gi, 'Jupiter Swap'],
  [/Uniswap v3/gi, 'Orca Whirlpools'],
  [/Uniswap/gi, 'Jupiter'],
  [/Hookr/gi, 'Raydium LaunchLab'],
  [/hookr_/g, 'raydium_launchlab_'],
  [/Enso/gi, 'Jupiter Routing'],
  [/enso_/g, 'jupiter_route_'],
  [/Saffron/gi, 'Kamino'],
  [/saffron_/g, 'kamino_'],
  [/\bHYPE\b/g, 'SOL'],
  [/\bWHYPE\b/g, 'wSOL'],
  [/fee_hype/gi, 'fee_lamports'],
  [/typical_cost_hype/gi, 'typical_cost_lamports'],
  [/"hype"\s*:/gi, '"sol":'],
  [/\$KNTQ/g, 'the project token'],
  [/\bKNTQ\b/g, 'project token'],
  [/\bEVM transaction(s)?\b/gi, 'Solana transaction$1'],
  [/\bEVM chains?\b/gi, 'Solana'],
  [/\bEVM\b/g, 'Solana'],
  [/ERC-20/gi, 'SPL Token'],
  [/ERC-721/gi, 'Metaplex NFT'],
  [/ERC-8004/gi, 'Solana agent identity'],
  [/chain ID/gi, 'cluster'],
  [/chain 999/gi, 'Solana mainnet-beta'],
  [/Arbitrum Orbit chain that settles to Ethereum/gi, 'high-performance Layer 1 network'],
  [/verified ABI/gi, 'published IDL'],
  [/\bABI\b/g, 'IDL'],
  [/live gas prices/gi, 'live priority fees'],
  [/gas token/gi, 'native token'],
  [/gas fees/gi, 'transaction fees'],
  [/\bgas\b/gi, 'fees'],
  [/smart contracts/gi, 'programs'],
  [/smart contract/gi, 'program'],
  [/contracts/gi, 'programs'],
  [/contract/gi, 'program'],
  [/deploy programs/gi, 'deploy programs'],
  [/ship programs/gi, 'build and deploy programs'],
  [/transaction hash/gi, 'transaction signature'],
  [/block explorer/gi, 'Solana explorer'],
  [/unlimited approvals/gi, 'unexpected token authorities'],
  [/Permit2 approval/gi, 'token delegate authority'],
  [/\btesera\b/gi, 'nilmo'],
  [/𝕏 teseralab/gi, '𝕏 nilmonwork'],
  [/<a href="mailto:@nilmonwork">@nilmonwork<\/a>/gi, '<a href="https://x.com/nilmonwork">@nilmonwork on X</a>'],
  [/\bSolana_/g, 'solana_'],
  [/solana_estimate_gas/gi, 'solana_estimate_fees'],
  [/solana_compile/gi, 'solana_program_build'],
  [/Solidity engineers/gi, 'Rust and Anchor engineers'],
  [/Compiles Solidity source and reports errors and warnings with line numbers/gi, 'Builds Rust or Anchor source for Solana and reports diagnostics with line numbers'],
  [/compile Solidity, estimate the cost in SOL, prepare a simulated deployment for you to sign and verify the source on the explorer/gi, 'build a Solana program, estimate compute and fees, test it locally, prepare deployment steps and publish its IDL'],
  [/0x7a3f\.\.\.c91e/gi, '7VbW…kP3'],
  [/0x5be1\.\.\.04d2/gi, '5hQf…9mLs'],
  [/0x[0-9a-f]{4}\.\.\.[0-9a-f]{4}/gi, '7VbW…kP3'],
  [/0xbow Privacy Pools/gi, 'privacy-aware local preparation'],
  [/Private payments/gi, 'Privacy-aware tools'],
  [/private payments/gi, 'privacy-aware tools'],
  [/live on Solana/gi, 'built for Solana'],
  [/data-s="tools\/Jupiter"/g, 'data-s="tools/jupiter"'],
  [/data-s="tools\/Raydium LaunchLab"/g, 'data-s="tools/raydium"'],
  [/data-s="tools\/Jupiter Routing"/g, 'data-s="tools/wormhole"'],
  [/data-s="tools\/Kamino"/g, 'data-s="tools/kamino"'],
  [/data-s="Solana"/g, 'data-s="solana"'],
  [/data-s="buybacks"/g, 'data-s="architecture"'],
  [/Jupiter Swap tools/g, 'Jupiter tools'],
  [/Raydium LaunchLab tools/g, 'Raydium tools'],
  [/Jupiter Routing tools/g, 'Wormhole transfers'],
  [/From today, 30% of every fee Nilmo earns is used to buy the project token each week, from a public wallet, and held in Nilmo's treasury\. Each purchase is posted with its transaction\./gi, 'Nilmo is being rebuilt as a Solana-native MCP gateway. Token economics are not announced or implied before they exist and can be verified.'],
  [/Solana shares a quarter of its sequencer fees with developers of apps that use its block space\. That is the Solana ecosystem&#8217;s policy for the chain\. Nilmo is independent of the Solana ecosystem and Drift\./gi, 'Nilmo is independent and is designing its Solana infrastructure around public RPC, indexed data and user-controlled signing.'],
  [/Solana is a new Layer 2 built by the Solana ecosystem for the Drift ecosystem\. It is an high-performance Layer 1 network, it uses bridged SOL for fees, and its mainnet launches on public launch\./gi, 'Solana is a high-performance Layer 1 with an account-based runtime, programs, atomic transactions and SOL as its native asset.'],
  [/starting with Solana, the Layer 2 that the Solana ecosystem built for the Drift ecosystem/gi, 'built natively for Solana mainnet-beta'],
  [/Orbit L2, settles to Ethereum/gi, 'Solana mainnet-beta'],
  [/We start with Solana, live from day one of mainnet/gi, 'We are building natively for Solana mainnet-beta'],
  [/read live from Solana mainnet-beta/gi, 'designed to read from Solana mainnet-beta'],
  [/Live from day one of Solana mainnet-beta, public launch, with all eleven tool groups\./gi, 'Designed for Solana mainnet-beta, with the first tool groups now being specified.'],
  [/Sixty-eight tools for Solana and Drift, live from day one of Solana mainnet-beta/gi, 'Solana-native tools for accounts, programs, DeFi and agents'],
  [/All 68 tools, grouped/gi, 'Solana tools, grouped'],
  [/Nilmo now has 68 tools\./gi, 'Nilmo’s Solana tool set is being defined.'],
  [/\b68 tools\b/gi, 'Solana tools'],
  [/YOUR_NILMO_MCP_ENDPOINT/gi, 'MCP endpoint coming soon'],
  [/YOUR_NILMO_API_ENDPOINT/gi, 'the Nilmo gateway'],
  [/9 November 2026/gi, 'public launch'],
  [/9 Nov 2026/gi, 'Planned'],
  [/live on Solana mainnet-beta/gi, 'built for Solana mainnet-beta'],
  [/goes live with Solana mainnet-beta on public launch/gi, 'is being built for Solana mainnet-beta'],
  [/Jupiter Swap's official Solana deployment/gi, 'Jupiter routing on Solana'],
  [/Jupiter's official Solana deployment/gi, 'Jupiter routing on Solana'],
  [/Jupiter Swap hooks/gi, 'Jupiter routing integrations'],
  [/solana_v4_/g, 'solana_jupiter_'],
  [/\bsolana_saffron_/g, 'solana_kamino_'],
  [/\bsolana_enso_/g, 'solana_jupiter_route_'],
  [/Solana, the new Layer 2 that the Solana ecosystem built for the Drift ecosystem/gi, 'Solana, the high-performance Layer 1 network,'],
  [/Solana is a Layer 2 built by the Solana ecosystem for the Drift ecosystem/gi, 'Solana is a high-performance Layer 1 designed for fast, low-cost applications'],
  [/#\/tools\/Jupiter Routing/gi, '#/tools/wormhole'],
  [/#\/tools\/Raydium LaunchLab/gi, '#/tools/raydium'],
  [/#\/tools\/Jupiter/gi, '#/tools/jupiter'],
  [/#\/tools\/Kamino/gi, '#/tools/kamino'],
];

function transformText(input) {
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), input);
}

function rewriteDocs(html) {
  const startMarker = 'PG=[';
  const endMarker = '],art=';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start < 0 || end < 0) return html;

  const jsonStart = start + 3;
  const jsonEnd = end + 1;
  let pages;
  try {
    pages = JSON.parse(html.slice(jsonStart, jsonEnd));
  } catch {
    return html;
  }

  for (const page of pages) {
    page.lead = transformText(page.lead || '');
    page.b = transformText(page.b || '');
    page.lead = page.lead.replace(/0x[0-9a-f][0-9a-f.]{2,}/gi, '7VbW…kP3');
    page.b = page.b.replace(/0x[0-9a-f][0-9a-f.]{2,}/gi, '7VbW…kP3');
    if (page.s === 'Solana') page.s = 'solana';
    if (page.s === 'buybacks') page.s = 'architecture';
    if (page.s === 'solana') {
      page.t = 'Solana basics';
      page.lead = 'Solana is a high-performance Layer 1 network. This page covers the account, program and transaction model Nilmo uses on mainnet-beta.';
      page.b = `<h2 id="facts">Key facts</h2><div class="tbl"><table><tbody>
<tr><th>Network</th><td>Solana mainnet-beta</td></tr>
<tr><th>Native asset</th><td>SOL, with fees measured in lamports</td></tr>
<tr><th>Addresses</th><td>32-byte public keys displayed as base58 strings</td></tr>
<tr><th>Programs</th><td>Stateless executable programs with state stored in accounts</td></tr>
<tr><th>Tokens</th><td>SPL Token and Token-2022 mints with associated token accounts</td></tr>
<tr><th>Transactions</th><td>One or more atomic instructions, identified by a signature</td></tr>
</tbody></table></div>
<h2 id="model">What Nilmo exposes</h2><p>Nilmo reads accounts, balances, token accounts, programs, slots and transaction signatures through Solana RPC and indexed data. Write actions are prepared as unsigned Solana transactions for the user's wallet to inspect and sign.</p>
<div class="co"><b>Solana-native terminology</b><p>Nilmo uses programs, published IDLs, base58 public keys, compute units, priority fees and named clusters throughout the product.</p></div>
<h2 id="ecosystem">Planned ecosystem coverage</h2><p>Swap routing through Jupiter, liquidity through Raydium and Orca, perpetual markets through Drift, lending through Kamino, price data through Pyth and cross-chain transfers through Wormhole.</p>`;
    }
    if (page.s === 'architecture') {
      page.t = 'Solana architecture';
      page.lead = 'How Nilmo is designed around Solana accounts, programs, transactions and user-controlled signing.';
      page.b = `<h2 id="principles">Design principles</h2><div class="cards">
<div><b>Solana-native</b><span>Base58 public keys, SPL Token accounts, PDAs, IDLs, instructions, compute units and transaction signatures.</span></div>
<div><b>User-controlled signing</b><span>Nilmo prepares and simulates transactions. A user wallet or an explicitly delegated key signs them.</span></div>
<div><b>Readable by AI</b><span>RPC responses, program data and instruction effects return as structured results that an AI client can explain.</span></div>
<div><b>No token claims</b><span>Nilmo does not publish a token, treasury or buyback promise before those systems exist and can be verified.</span></div>
</div><h2 id="status">Current status</h2><p>The public site describes the intended Solana product. The MCP endpoint and production integrations will be announced separately when they are ready.</p>`;
    }
    if (page.s === 'roadmap') {
      page.lead = 'Nilmo is moving to a Solana-native gateway. The roadmap starts with reliable reads and safe transaction preparation before delegated automation.';
      page.b = `<div class="steps"><div><b>01 · Foundation</b><p>Solana RPC reads, account and token parsing, transaction decoding, program and IDL lookup, simulation and wallet signing.</p></div><div><b>02 · Solana DeFi</b><p>Jupiter routing, Raydium and Orca liquidity, Drift perpetuals, Kamino lending, Pyth prices and Wormhole transfers.</p></div><div><b>03 · Agents</b><p>Scoped delegated keys, spend limits, action logs, alerts and automated responses with explicit user controls.</p></div></div>`;
    }
    if (page.s === 'overview') {
      page.lead = 'Nilmo is an MCP gateway designed for Solana. Add one endpoint to an AI client so it can read accounts, explain transactions, inspect programs and prepare actions for your wallet to sign.';
    }
    if (page.s === 'quickstart') {
      page.lead = 'Connect Nilmo as a remote MCP server, then ask an AI client about Solana. The production endpoint will be published when it is ready; reads will not require a wallet.';
    }

    const docs = {
      overview: {
        lead: 'Nilmo is an MCP gateway designed for Solana. It gives AI clients structured tools for accounts, programs, tokens and transactions while keeping signing in the user’s wallet.',
        b: `<div class="cards"><a href="#/quickstart"><b>Connect an AI client</b><span>The production MCP endpoint will be published when it is ready.</span></a><a href="#/tools"><b>Explore the tools</b><span>Solana-native reads, analysis, program development and transaction preparation.</span></a><a href="#/signing"><b>Keep control</b><span>Nilmo prepares and simulates. Your wallet reviews and signs.</span></a><a href="#/solana"><b>Learn the model</b><span>Accounts, programs, instructions, PDAs, SPL tokens and transaction signatures.</span></a></div><h2 id="status">Product status</h2><p>The website documents the intended Solana product. Production endpoints and integrations are not presented as live until they are deployed and verified.</p>`,
      },
      quickstart: {
        lead: 'Connect Nilmo as a remote MCP server, then ask an AI client about Solana. The production endpoint will be announced when it is ready.',
        b: `<h2 id="endpoint">Endpoint</h2><div class="co"><b>Coming soon</b><p>The public MCP URL is not configured yet. Do not use an old Nilmo or third-party endpoint.</p></div><h2 id="clients">Supported clients</h2><p>Nilmo is designed for MCP-compatible clients including Claude, ChatGPT, Cursor and VS Code. Add the published streamable-HTTP URL in the client’s MCP or connector settings.</p><h2 id="first-request">First request</h2><pre><code>Show the SOL and SPL token balances for this public key, then explain the latest transaction signature.</code></pre><p>Read requests need only a public key. Write requests return an unsigned Solana transaction for a wallet to inspect and sign.</p>`,
      },
      auth: {
        lead: 'Access to the production Nilmo gateway will be documented when the endpoint is ready.',
        b: `<h2 id="reads">Public reads</h2><p>The intended model allows ordinary Solana reads without a wallet. Rate limits will protect the service from abuse.</p><h2 id="keys">Optional access keys</h2><p>Optional service keys may provide higher limits and usage reporting. They are not wallet keys and can never sign a transaction.</p><div class="co"><b>Pre-launch</b><p>The access-key service is not presented as live. Final limits and the key-management URL will be published with the production gateway.</p></div>`,
      },
      tools: {
        lead: 'Solana-native tools grouped by what the AI needs to do: read, understand, build, act and automate.',
        b: `<div class="cards"><a href="#/tools/read"><b>Read</b><span>Accounts, balances, tokens, slots, programs and signatures.</span></a><a href="#/tools/understand"><b>Understand</b><span>Decode instructions, explain effects and inspect programs.</span></a><a href="#/tools/build"><b>Build</b><span>Scaffold, test and deploy Solana programs and IDLs.</span></a><a href="#/tools/act"><b>Act</b><span>Prepare and simulate wallet-signed transactions.</span></a><a href="#/tools/jupiter"><b>Jupiter</b><span>Swap quotes and routed transactions.</span></a><a href="#/tools/raydium"><b>Raydium</b><span>Pools, liquidity and launches.</span></a><a href="#/tools/perps"><b>Drift</b><span>Perpetual markets, account risk and orders.</span></a><a href="#/tools/kamino"><b>Kamino</b><span>Lending markets, obligations and vaults.</span></a></div>`,
      },
      'tools/read': {
        lead: 'Read Solana state without a wallet. Results use public keys, lamports, slots and transaction signatures.',
        b: `<h2 id="available">Core read tools</h2><div class="tbl"><table><tbody><tr><th><code>solana_get_balance</code></th><td>SOL balance in lamports and SOL.</td></tr><tr><th><code>solana_get_token_accounts</code></th><td>SPL Token and Token-2022 balances by owner.</td></tr><tr><th><code>solana_get_account</code></th><td>Owner program, lamports, executable flag and decoded data when supported.</td></tr><tr><th><code>solana_get_program_accounts</code></th><td>Program-owned accounts with filters.</td></tr><tr><th><code>solana_get_transaction</code></th><td>Confirmed transaction, instructions, logs, balances and compute use.</td></tr><tr><th><code>solana_get_signatures</code></th><td>Recent signatures for an address.</td></tr><tr><th><code>solana_get_slot</code></th><td>Current or requested slot and block data.</td></tr><tr><th><code>solana_search_docs</code></th><td>Relevant Solana documentation for the question.</td></tr></tbody></table></div><pre><code>What SPL tokens does 7VbW...kP3 hold, and what changed in its latest signature?</code></pre>`,
      },
      'tools/understand': {
        lead: 'Turn raw Solana transactions and program state into structured explanations.',
        b: `<h2 id="available">Analysis tools</h2><ul><li><code>solana_explain_transaction</code> explains instructions, CPI calls, balance changes and failures.</li><li><code>solana_decode_instructions</code> decodes known program instructions from a message.</li><li><code>solana_inspect_program</code> reports upgrade authority, executable data and known metadata.</li><li><code>solana_resolve_idl</code> finds a published Anchor IDL when one is available.</li><li><code>solana_trace_cpi</code> follows cross-program invocations and log messages.</li><li><code>solana_token_risk</code> checks mint authority, freeze authority, Token-2022 extensions and liquidity signals.</li></ul><p>Unknown instructions remain explicitly unknown; Nilmo does not guess a decoder.</p>`,
      },
      'tools/build': {
        lead: 'Build Solana programs and client instructions with Rust, Anchor or native Solana tooling.',
        b: `<h2 id="available">Build tools</h2><ul><li><code>solana_program_scaffold</code> creates a minimal native or Anchor program.</li><li><code>solana_program_build</code> builds an sBPF program and reports diagnostics.</li><li><code>solana_program_test</code> runs local-validator or program-test suites.</li><li><code>solana_pda_derive</code> derives a PDA from a program ID and seeds.</li><li><code>solana_instruction_encode</code> builds instruction data and account metas from an IDL.</li><li><code>solana_idl_publish</code> prepares IDL publication metadata.</li><li><code>solana_program_deploy</code> prepares deployment steps for the user’s Solana CLI wallet.</li></ul><div class="co"><b>No hidden deployer</b><p>Nilmo does not hold a deployment key. Deployment authority remains with the project wallet.</p></div>`,
      },
      'tools/act': {
        lead: 'Prepare Solana actions as unsigned transactions, simulate them and return them to the user’s wallet.',
        b: `<h2 id="available">Action tools</h2><ul><li><code>solana_prepare_sol_transfer</code></li><li><code>solana_prepare_token_transfer</code></li><li><code>solana_prepare_create_ata</code></li><li><code>solana_prepare_create_mint</code></li><li><code>solana_simulate_transaction</code></li><li><code>solana_send_signed_transaction</code></li><li><code>solana_confirm_signature</code></li></ul><h2 id="flow">Signing flow</h2><ol><li>The AI fills the requested action.</li><li>Nilmo creates a recent Solana message and simulates it.</li><li>The user reviews accounts, instructions, token changes, compute units and fees.</li><li>The wallet signs and broadcasts, or returns the signed bytes for submission.</li></ol>`,
      },
      'tools/agents': {
        lead: 'Automation on Solana with scoped authority, explicit limits and a complete action log.',
        b: `<h2 id="controls">Agent controls</h2><p>Delegation can be implemented through program-controlled PDAs, SPL Token delegate authority or protocol-specific delegated accounts. Every integration must state exactly what the delegate can do.</p><ul><li><code>solana_agent_create_policy</code> defines allowed programs, instructions, mints, amounts and expiry.</li><li><code>solana_agent_status</code> reports remaining limits and authority.</li><li><code>solana_agent_revoke</code> prepares revocation.</li><li><code>solana_watch_address</code> monitors signatures and token changes.</li><li><code>solana_react</code> prepares a policy-approved response but does not bypass signing rules.</li></ul>`,
      },
      'tools/private': {
        lead: 'Privacy-aware transaction preparation without pretending that public Solana state is private.',
        b: `<div class="co"><b>Solana is public</b><p>Addresses, balances and confirmed transactions are visible onchain. Nilmo does not describe an ordinary transfer as private.</p></div><h2 id="protections">What Nilmo can protect</h2><ul><li>Keep drafts and natural-language prompts offchain.</li><li>Reveal only the public keys required for a requested read.</li><li>Return unsigned transactions directly to the user’s browser session.</li><li>Minimise retained logs and redact secrets.</li><li>Support privacy protocols only when their exact onchain guarantees are documented.</li></ul>`,
      },
      'tools/perps': {
        lead: 'Research and prepare Drift perpetual-market actions on Solana.',
        b: `<h2 id="available">Drift tools</h2><ul><li><code>solana_drift_markets</code> returns markets, oracle prices, funding and open interest.</li><li><code>solana_drift_account</code> reports collateral, positions, margin and liquidation risk.</li><li><code>solana_drift_orderbook</code> reads available liquidity and estimated slippage.</li><li><code>solana_drift_plan_order</code> prepares an order with size, limit price and risk summary.</li><li><code>solana_drift_submit</code> accepts only a wallet-signed or valid delegated action.</li></ul><p>Market data and simulations are informational, not financial advice.</p>`,
      },
      'tools/jupiter': {
        lead: 'Use Jupiter to discover tokens, request routed swap quotes and prepare swap transactions on Solana.',
        b: `<h2 id="available">Jupiter tools</h2><ul><li><code>solana_jupiter_tokens</code> searches supported mints.</li><li><code>solana_jupiter_quote</code> compares routes, output amounts, price impact and slippage.</li><li><code>solana_jupiter_swap</code> returns a transaction for the user’s wallet to sign.</li><li><code>solana_jupiter_status</code> checks routing availability before an action.</li></ul><pre><code>Quote 1 SOL to USDC with at most 50 bps slippage. Do not prepare the swap yet.</code></pre>`,
      },
      'tools/raydium': {
        lead: 'Inspect Raydium pools, liquidity positions and LaunchLab markets on Solana.',
        b: `<h2 id="available">Raydium tools</h2><ul><li><code>solana_raydium_pools</code> finds pools for two mints.</li><li><code>solana_raydium_quote</code> returns a pool quote and price impact.</li><li><code>solana_raydium_position</code> reads a wallet’s liquidity position.</li><li><code>solana_raydium_liquidity</code> prepares add or remove liquidity instructions.</li><li><code>solana_raydium_launch</code> prepares a LaunchLab creation flow with all parameters shown.</li></ul>`,
      },
      'tools/wormhole': {
        lead: 'Prepare cross-chain transfers to or from Solana through Wormhole-compatible routes.',
        b: `<h2 id="flow">Transfer flow</h2><ol><li>Choose source chain, destination chain, asset and recipient.</li><li>Request a route and display relayer, fees and expected amount.</li><li>Sign on the source chain.</li><li>Track the message and redeem on Solana when required.</li></ol><p>Nilmo never represents a bridge transfer as instant or risk-free.</p>`,
      },
      'tools/kamino': {
        lead: 'Read Kamino lending markets, obligations and vaults, then prepare user-signed actions.',
        b: `<h2 id="available">Kamino tools</h2><ul><li><code>solana_kamino_markets</code> reads reserves, utilisation and rates.</li><li><code>solana_kamino_obligation</code> reports deposits, borrows and health.</li><li><code>solana_kamino_vaults</code> lists vault composition and reported performance.</li><li><code>solana_kamino_deposit</code> prepares a deposit transaction.</li><li><code>solana_kamino_withdraw</code> prepares a withdrawal transaction.</li></ul><p>Rates and risks can change between quote, simulation and confirmation.</p>`,
      },
      'tools/next': {
        lead: 'Planned Solana data and protocol coverage after the core read and signing flow is stable.',
        b: `<h2 id="pyth">Pyth price data</h2><p>Read current and historical oracle prices, confidence intervals and publisher status where the Pyth APIs support them.</p><h2 id="streaming">Realtime account updates</h2><p>Subscribe to relevant account and program changes through production-grade Solana indexing infrastructure.</p><p>Planned tools are not shown as live until their endpoint and output contract are tested.</p>`,
      },
      signing: {
        lead: 'Nilmo prepares Solana transactions; the user’s wallet controls every signature.',
        b: `<h2 id="review">What the preview shows</h2><ul><li>Fee payer and required signers.</li><li>Every account marked writable or read-only.</li><li>Each program ID and decoded instruction when available.</li><li>SOL and token balance changes from simulation.</li><li>Compute units, priority fee and simulation logs.</li><li>Recent blockhash expiry and any Address Lookup Tables.</li></ul><h2 id="formats">Formats</h2><p>Nilmo supports Solana legacy and versioned transactions as integrations require. The wallet must support the returned format.</p><div class="co"><b>Never share a secret key</b><p>A Solana secret key or seed phrase is never an input to a Nilmo tool.</p></div>`,
      },
      simulation: {
        lead: 'Simulate against current Solana state before asking the wallet to sign.',
        b: `<h2 id="result">Simulation result</h2><p>Nilmo reports success or failure, program logs, compute units, account changes and token balance changes. Simulation is a preview, not a guarantee: account state, blockhash validity and market prices can change before confirmation.</p>`,
      },
      shield: {
        lead: 'Nilmo Shield is the planned safety layer for Solana transaction previews.',
        b: `<h2 id="checks">Checks</h2><ul><li>Unknown or upgradeable programs and their authorities.</li><li>Writable accounts and unexpected signers.</li><li>Mint, freeze and Token-2022 extension authorities.</li><li>Unexpected token delegate changes or account closure.</li><li>Large SOL or token outflows.</li><li>Simulation errors, suspicious logs and excessive priority fees.</li></ul><p>A warning is context, not a guarantee that a transaction is safe.</p>`,
      },
      'agent-programs': {
        lead: 'Planned Solana program patterns for agent wallets, escrow, limits and delegated actions.',
        b: `<h2 id="patterns">Program patterns</h2><ul><li>PDA-controlled policy accounts.</li><li>Instruction allowlists and per-mint spend limits.</li><li>Expiry slots and revocation authorities.</li><li>Escrow and milestone release.</li><li>Multisig approval for sensitive actions.</li></ul><p>Templates are not presented as deployed or audited until their program IDs and reports are public.</p>`,
      },
      'agent-keys': {
        lead: 'Scoped delegation for Solana agents is planned after the wallet-signed transaction flow is stable.',
        b: `<h2 id="model">Delegation model</h2><p>A delegate receives only the authority required by a task: specific programs and instructions, mint limits, amount limits and an expiry. The owner can revoke it.</p><h2 id="implementation">Implementation</h2><p>Depending on the protocol, authority may use SPL Token delegates, protocol-specific delegated accounts or a dedicated policy program. Nilmo will document each authority precisely before enabling it.</p><div class="co"><b>Not a secret-key upload</b><p>Users never upload a wallet secret key to create an agent.</p></div>`,
      },
      networks: {
        lead: 'Nilmo is being designed around Solana mainnet-beta as its primary network.',
        b: `<h2 id="primary">Primary network</h2><div class="tbl"><table><tbody><tr><th>Network</th><td>Solana mainnet-beta</td></tr><tr><th>Status</th><td>In development</td></tr><tr><th>Endpoint</th><td>To be announced</td></tr></tbody></table></div><h2 id="native">Native implementation</h2><p>The tool model uses Solana accounts, programs, instructions, PDAs, SPL tokens, transaction signatures and clusters. It is not a renamed endpoint from another chain.</p>`,
      },
      errors: {
        lead: 'Nilmo returns structured errors that an AI client can explain and act on safely.',
        b: `<h2 id="codes">Core errors</h2><div class="tbl"><table><tbody><tr><th><code>invalid_public_key</code></th><td>The base58 public key is malformed.</td></tr><tr><th><code>account_not_found</code></th><td>No account exists at the supplied public key.</td></tr><tr><th><code>signature_not_found</code></th><td>The transaction signature is unknown or not yet available.</td></tr><tr><th><code>simulation_failed</code></th><td>A program error or account constraint caused simulation to fail.</td></tr><tr><th><code>blockhash_expired</code></th><td>The transaction must be rebuilt with a recent blockhash.</td></tr><tr><th><code>insufficient_lamports</code></th><td>The fee payer cannot cover the transaction.</td></tr><tr><th><code>unsupported_transaction_version</code></th><td>The client or wallet cannot handle the requested format.</td></tr><tr><th><code>rate_limited</code></th><td>Wait for the returned retry interval.</td></tr></tbody></table></div>`,
      },
      glossary: {
        lead: 'Solana and Nilmo terms used across these docs.',
        b: `<dl class="gl"><div><dt>MCP</dt><dd>A protocol that lets AI clients call structured tools.</dd></div><div><dt>Account</dt><dd>Solana’s fundamental state unit, identified by a 32-byte public key.</dd></div><div><dt>Program</dt><dd>Executable Solana code. Mutable state lives in accounts passed to its instructions.</dd></div><div><dt>Instruction</dt><dd>A call to one program with its accounts and encoded data.</dd></div><div><dt>Transaction</dt><dd>One or more atomic instructions plus signatures and a recent blockhash.</dd></div><div><dt>PDA</dt><dd>A program-derived address with no private key, controlled by a program.</dd></div><div><dt>SPL Token</dt><dd>A token mint and its token accounts managed by a Solana token program.</dd></div><div><dt>IDL</dt><dd>A machine-readable description of a program’s instructions and accounts.</dd></div><div><dt>Lamport</dt><dd>The smallest unit of SOL.</dd></div><div><dt>Priority fee</dt><dd>An optional fee used to prioritise a transaction’s requested compute.</dd></div></dl>`,
      },
      changelog: {
        lead: 'Material product and documentation changes, listed without claiming unreleased infrastructure is live.',
        b: `<div class="steps"><div><b>16 Nov 2026 · Solana migration</b><p>Reworked the product narrative, tool model, signing flow and documentation around Solana mainnet-beta.</p></div><div><b>16 Nov 2026 · Documentation safety</b><p>Removed old-chain examples and endpoints, unsupported token economics and unsupported privacy claims.</p></div><div><b>Next</b><p>Publish verified MCP endpoints, integration status and program IDs only as each component becomes available.</p></div></div>`,
      },
      faq: {
        lead: 'Common questions about the Solana version of Nilmo.',
        b: `<h2 id="what">What is Nilmo?</h2><p>An MCP gateway being designed so AI clients can read Solana, explain transactions and prepare wallet-signed actions.</p><h2 id="live">Is the production gateway live?</h2><p>Not yet. The endpoint will be published when it is deployed and verified.</p><h2 id="keys">Does Nilmo need my secret key?</h2><p>No. Never paste a seed phrase or secret key into Nilmo. Signing stays in the wallet or an explicitly scoped delegate.</p><h2 id="private">Are Solana transactions private?</h2><p>No. Confirmed accounts and transactions are public. Nilmo can minimise offchain data retention, but it does not mislabel public transfers as private.</p><h2 id="token">Does Nilmo have a token or buyback program?</h2><p>No token or buyback promise is made on this site.</p>`,
      },
    };

    const normalised = {
      'tools/Jupiter': 'tools/jupiter',
      'tools/Raydium LaunchLab': 'tools/raydium',
      'tools/Jupiter Routing': 'tools/wormhole',
      'tools/Kamino': 'tools/kamino',
    }[page.s];
    if (normalised) page.s = normalised;
    const rewrite = docs[page.s];
    if (rewrite) {
      page.lead = rewrite.lead;
      page.b = rewrite.b;
      if (page.s === 'tools/jupiter') page.t = 'Jupiter tools';
      if (page.s === 'tools/raydium') page.t = 'Raydium tools';
      if (page.s === 'tools/wormhole') page.t = 'Wormhole transfers';
      if (page.s === 'tools/kamino') page.t = 'Kamino tools';
    }
  }

  return html.slice(0, jsonStart) + JSON.stringify(pages) + html.slice(jsonEnd);
}

function rewriteHomepage(html) {
  html = html.replace(/Talk to Solana<br>from any AI\./g, 'Talk to Solana<br>from any AI.');
  html = html.replace(/Live on Solana<br>from day one\./g, 'Built for Solana<br>from day one.');
  html = html.replace(/Nilmo (?:goes live with|is being built for) Solana mainnet-beta[^<]*<\/p>/gi,
    'Nilmo is designed for Solana mainnet-beta, with Solana-native account reads, transaction simulation and user-controlled signing. Planned integrations cover Jupiter, Raydium, Orca, Drift, Kamino, Pyth and Wormhole.</p>');
  html = html.replace(/<span class="bon"[^>]*>.*?<\/span><\/span><\/span><h2 class="h">/s,
    '<span class="bon" aria-label="Solana stack: Solana, Jupiter, Raydium, Orca, Drift, Kamino, Pyth and Wormhole"><span>Solana stack</span><span class="win" aria-hidden="true"><span class="rl" id="bonrl"><div class="s"><span>Solana</span></div><div class="s"><span>Jupiter</span></div><div class="s"><span>Raydium</span></div><div class="s"><span>Orca</span></div><div class="s"><span>Drift</span></div><div class="s"><span>Kamino</span></div><div class="s"><span>Pyth</span></div><div class="s"><span>Wormhole</span></div></span></span></span><h2 class="h">');
  return html;
}

function rewriteAbout(html) {
  return html.replace(/<main>.*?<\/main>/s, `<main><header class="hdr"><canvas class="plate" data-seed="15" aria-hidden="true"></canvas><div class="wr"><span class="eb rv">Nilmo · About</span><h1 class="rv" style="--d:.08s">About Nilmo</h1><p class="ld rv" style="--d:.16s">Nilmo is an independent project building an MCP gateway natively for Solana mainnet-beta.</p></div></header>
<section class="wr x-sec"><div class="x-h x-rv"><b>01</b><h2>The idea</h2><p>AI clients should understand Solana without holding wallet keys</p></div><p class="ab-big x-rv">Nilmo turns Solana accounts, programs, instructions and transactions into structured tools that an AI client can read and explain.</p></section>
<section class="wr x-sec"><div class="x-h x-rv"><b>02</b><h2>Principles</h2><p>User control first</p></div><div class="ab-pr"><div class="ab-p x-rv"><h3>Solana-native</h3><p>Base58 public keys, SPL tokens, PDAs, IDLs, instructions, compute units and signatures.</p></div><div class="ab-p x-rv"><h3>No custody</h3><p>Nilmo never asks for a seed phrase or wallet secret key.</p></div><div class="ab-p x-rv"><h3>Simulate first</h3><p>Transactions are decoded and simulated before the wallet is asked to sign.</p></div><div class="ab-p x-rv"><h3>Honest status</h3><p>Endpoints and integrations are announced only when deployed and verified.</p></div></div></section>
<section class="wr x-sec" id="architecture"><div class="x-h x-rv"><b>03</b><h2>Solana architecture</h2><p>Accounts, programs and wallet-controlled transactions</p></div><p class="ld x-rv">Nilmo reads public state through Solana RPC and indexed data, returns structured results to the AI client, and prepares unsigned transactions for a compatible wallet. Planned protocol coverage includes Jupiter, Raydium, Orca, Drift, Kamino, Pyth and Wormhole.</p></section>
<section class="wr x-sec"><div class="ab-facts x-rv"><div><span class="lab">Structure</span><b>Independent</b></div><div><span class="lab">Status</span><b>In development</b></div><div><span class="lab">Primary network</span><b>Solana</b></div></div></section></main>`);
}

function rewritePrivate(html) {
  return html.replace(/<main>.*?<\/main>/s, `<main><header class="hdr"><canvas class="plate" data-seed="31" aria-hidden="true"></canvas><div class="wr"><span class="eb rv">Solana · Privacy</span><h1 class="rv" style="--d:.08s">Privacy-aware tools</h1><p class="ld rv" style="--d:.16s">Solana is a public ledger. Nilmo can minimise offchain data and keep signing local, but it does not claim that ordinary onchain transfers are private.</p></div></header>
<section class="wr x-sec"><div class="x-h x-rv"><b>01</b><h2>What stays local</h2><p>Secrets never belong in an AI request</p></div><div class="ab-pr"><div class="ab-p x-rv"><span class="mono">01</span><h3>Wallet signing</h3><p>Unsigned transactions are reviewed and signed in the user's Solana wallet.</p></div><div class="ab-p x-rv"><span class="mono">02</span><h3>Offchain drafts</h3><p>Prompts and transaction drafts stay offchain and are retained only as required to provide the service.</p></div><div class="ab-p x-rv"><span class="mono">03</span><h3>Minimal reads</h3><p>Nilmo requests only the public accounts needed to answer the user's question.</p></div><div class="ab-p x-rv"><span class="mono">04</span><h3>No secret keys</h3><p>Seed phrases and secret keys are never accepted by a Nilmo tool.</p></div></div></section>
<section class="wr x-sec"><div class="x-h x-rv"><b>02</b><h2>What remains public</h2><p>Onchain activity can be inspected by anyone</p></div><p class="ld x-rv">Public keys, account balances, program interactions and confirmed transaction signatures are visible on Solana. Future privacy-protocol integrations will be documented only with their exact guarantees, program IDs and audits.</p></section></main>`);
}

function rewriteStats(html) {
  html = html.replace(/Calls made through the Nilmo gateway on Solana mainnet-beta, updated live\./g, 'Verified gateway metrics will appear here after the Solana service launches.');
  html = html.replace(/<span class="st-dot"><\/span><span id="st-up">Loading<\/span>/g, '<span class="st-dot"></span><span id="st-up">Pre-launch</span>');
  html = html.replace(/since mainnet launch/g, 'available after launch');
  html = html.replace(/<div class="st-n" id="st-tools">.*?<\/div>/g, '<div class="st-n" id="st-tools">&ndash;</div>');
  html = html.replace(/<div class="st-s" id="st-groups">.*?<\/div>/g, '<div class="st-s" id="st-groups">published after launch</div>');
  html = html.replace(/var API="YOUR_NILMO_API_ENDPOINT\/stats"/g, 'var API=""');
  html = html.replace(/function load\(\)\{fetch\(API,/g, 'function load(){if(!API){$("st-up").textContent="Pre-launch · no public metrics yet";return}fetch(API,');
  return html;
}

function rewriteSign(html) {
  return html.replace(/<main>.*?<\/main>/s, `<main><header class="hdr"><canvas class="plate" data-seed="29" aria-hidden="true"></canvas><div class="wr"><span class="eb rv">Solana · Signing</span><h1 class="rv" style="--d:.08s">Review before you sign</h1><p class="ld rv" style="--d:.16s">The Solana signing page is being rebuilt. It will decode and simulate transactions before handing them to a compatible wallet.</p></div></header>
<section class="wr x-sec"><div class="x-h x-rv"><b>01</b><h2>What the preview will show</h2><p>No blind signatures</p></div><ul class="ld x-rv"><li>Fee payer, required signers and recent blockhash.</li><li>Every program ID and instruction that can be decoded.</li><li>Writable accounts, SOL changes and SPL token changes.</li><li>Compute units, priority fee and simulation logs.</li><li>Warnings for unknown programs, authorities and unexpected outflows.</li></ul></section>
<section class="wr x-sec"><div class="x-h x-rv"><b>02</b><h2>Current status</h2><p>Pre-launch</p></div><p class="ld x-rv">No transaction should be pasted into this page yet. The production signing route and supported Solana wallets will be announced only after the decoder and simulation checks are ready.</p></section></main>`);
}

function rewriteAgents(html) {
  return html.replace(/<main>.*?<\/main>/s, `<main><header class="hdr"><canvas class="plate" data-seed="9" aria-hidden="true"></canvas><div class="wr"><span class="eb rv">Nilmo · Clients</span><h1 class="rv" style="--d:.08s">Solana in the AI client you use</h1><p class="ld rv" style="--d:.16s">Nilmo is designed as one remote MCP gateway for Claude, ChatGPT, Cursor, VS Code and other compatible clients.</p></div></header>
<section class="wr x-sec"><div class="x-h x-rv"><b>01</b><h2>One endpoint</h2><p>Coming soon</p></div><p class="ld x-rv">The production MCP endpoint is not configured yet. When it is ready, each supported client will use the same streamable-HTTP URL and expose the same Solana tools.</p></section>
<section class="wr x-sec"><div class="x-h x-rv"><b>02</b><h2>What clients will be able to do</h2><p>Read first, sign in the wallet</p></div><div class="ab-pr"><div class="ab-p x-rv"><h3>Read</h3><p>Accounts, SOL and SPL balances, programs, slots and transaction signatures.</p></div><div class="ab-p x-rv"><h3>Understand</h3><p>Decode instructions, CPI calls, logs and token changes.</p></div><div class="ab-p x-rv"><h3>Prepare</h3><p>Create and simulate transactions without holding a signing key.</p></div><div class="ab-p x-rv"><h3>Sign</h3><p>Hand the final transaction to a compatible Solana wallet for approval.</p></div></div></section></main>`);
}

function rewriteKeys(html) {
  return html.replace(/<main>.*?<\/main>/s, `<main><header class="hdr"><canvas class="plate" data-seed="17" aria-hidden="true"></canvas><div class="wr"><span class="eb rv">Nilmo · Access</span><h1 class="rv" style="--d:.08s">Access keys</h1><p class="ld rv" style="--d:.16s">Optional service keys are planned for higher rate limits and usage reporting. They are not Solana wallet keys.</p></div></header>
<section class="wr x-sec"><div class="x-h x-rv"><b>01</b><h2>Pre-launch status</h2><p>No key service is active yet</p></div><p class="ld x-rv">The key-management route and final rate limits will be published with the production MCP endpoint.</p></section>
<section class="wr x-sec"><div class="x-h x-rv"><b>02</b><h2>Safety rule</h2><p>Service access is separate from wallet authority</p></div><p class="ld x-rv">An access key may authenticate calls to Nilmo. It cannot sign a Solana transaction, and Nilmo will never ask for a seed phrase or wallet secret key.</p></section></main>`);
}

function rewritePublications(html) {
  return html.replace(/<main>.*?<\/main>/s, `<main><header class="hdr"><canvas class="plate" data-seed="25" aria-hidden="true"></canvas><div class="wr"><span class="eb rv">Nilmo · Changelog</span><h1 class="rv" style="--d:.08s">What changed</h1><p class="ld rv" style="--d:.16s">Verified changes to the Solana version of Nilmo. Unreleased infrastructure is not labelled as live.</p></div></header>
<section class="wr x-sec"><div class="x-h x-rv"><b>16 Nov 2026</b><h2>Solana migration</h2><p>Product model and documentation rebuilt</p></div><div class="ab-pr"><div class="ab-p x-rv"><h3>Network model</h3><p>Accounts, programs, instructions, PDAs, SPL tokens, slots and transaction signatures.</p></div><div class="ab-p x-rv"><h3>Solana ecosystem</h3><p>Planned coverage for Jupiter, Raydium, Orca, Drift, Kamino, Pyth and Wormhole.</p></div><div class="ab-p x-rv"><h3>Signing</h3><p>Unsigned transaction preparation, simulation and user-controlled wallet signing.</p></div><div class="ab-p x-rv"><h3>Claims removed</h3><p>Old-chain endpoints, token economics and unsupported privacy claims were retired.</p></div></div></section>
<section class="wr x-sec"><div class="x-h x-rv"><b>Next</b><h2>Production readiness</h2><p>Endpoint and integrations</p></div><p class="ld x-rv">The public MCP endpoint, signing route, integration status and any deployed program IDs will be announced only after they are available and verified.</p></section></main>`);
}

function rewritePerps(html) {
  return html.replace(/<main>.*?<\/main>/s, `<main><header class="hdr"><canvas class="plate" data-seed="19" aria-hidden="true"></canvas><div class="wr"><span class="eb rv">Solana · Drift</span><h1 class="rv" style="--d:.08s">Perpetual markets for AI agents</h1><p class="ld rv" style="--d:.16s">Nilmo plans to connect AI clients to Drift market data, account risk and user-controlled order preparation on Solana.</p></div></header>
<section class="wr x-sec"><div class="x-h x-rv"><b>01</b><h2>Research first</h2><p>Public market data</p></div><div class="ab-pr"><div class="ab-p x-rv"><h3>Markets</h3><p>Oracle prices, funding, open interest and available markets.</p></div><div class="ab-p x-rv"><h3>Accounts</h3><p>Collateral, positions, margin requirements and liquidation risk.</p></div><div class="ab-p x-rv"><h3>Orders</h3><p>Size, limit price, estimated slippage and a plain-language risk summary.</p></div><div class="ab-p x-rv"><h3>Control</h3><p>Wallet-signed actions or explicitly scoped Drift delegation.</p></div></div></section>
<section class="wr x-sec"><div class="x-h x-rv"><b>02</b><h2>Current status</h2><p>Planned integration</p></div><p class="ld x-rv">The Drift trading integration is not active yet. Nilmo will publish supported markets, transaction formats and delegation rules before enabling order submission.</p></section></main>`);
}

async function update(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await update(target);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    const original = await readFile(target, 'utf8');
    let migrated = transformText(original);
    if (entry.name === 'docs.html' || target.endsWith(`${path.sep}docs${path.sep}index.html`)) migrated = rewriteDocs(migrated);
    if (entry.name === 'index.html' && path.dirname(target) === site) migrated = rewriteHomepage(migrated);
    if (entry.name === 'about.html' || target.endsWith(`${path.sep}about${path.sep}index.html`)) migrated = rewriteAbout(migrated);
    if (entry.name === 'private.html' || target.endsWith(`${path.sep}private${path.sep}index.html`)) migrated = rewritePrivate(migrated);
    if (entry.name === 'stats.html' || target.endsWith(`${path.sep}stats${path.sep}index.html`)) migrated = rewriteStats(migrated);
    if (entry.name === 'sign.html' || target.endsWith(`${path.sep}sign${path.sep}index.html`)) migrated = rewriteSign(migrated);
    if (entry.name === 'agents.html' || target.endsWith(`${path.sep}agents${path.sep}index.html`)) migrated = rewriteAgents(migrated);
    if (entry.name === 'keys.html' || target.endsWith(`${path.sep}keys${path.sep}index.html`)) migrated = rewriteKeys(migrated);
    if (entry.name === 'publications.html' || target.endsWith(`${path.sep}publications${path.sep}index.html`)) migrated = rewritePublications(migrated);
    if (entry.name === 'perps.html' || target.endsWith(`${path.sep}perps${path.sep}index.html`)) migrated = rewritePerps(migrated);

    if (migrated !== original) {
      await writeFile(target, migrated);
      changed += 1;
    }
  }
}

await update(site);
console.log(`Migrated ${changed} files to the Solana product narrative.`);

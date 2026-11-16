import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { z } from 'zod';
import { SERVER_VERSION, cleanError, rpcRequest } from '../lib/solana-rpc.js';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const buckets = new Map();

const address = z.string().min(32).max(44).regex(BASE58, 'Expected a base58 Solana address');
const signature = z.string().min(64).max(100).regex(BASE58, 'Expected a base58 Solana transaction signature');
const commitment = z.enum(['processed', 'confirmed', 'finalized']).default('confirmed');
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

function isoTime(seconds) {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;
}

function result(data, summary) {
  const text = `${summary}\n\n${JSON.stringify(data, null, 2)}`;
  return { content: [{ type: 'text', text }], structuredContent: data };
}

function failure(error) {
  return { isError: true, content: [{ type: 'text', text: cleanError(error) }] };
}

function register(server, name, config, callback) {
  server.registerTool(name, { ...config, annotations: readOnly }, async args => {
    try {
      return await callback(args);
    } catch (error) {
      return failure(error);
    }
  });
}

function buildServer() {
  const server = new McpServer(
    { name: 'nilmo-solana', title: 'Nilmo Solana', version: SERVER_VERSION },
    { instructions: 'Read and simulate on Solana mainnet-beta. Nilmo never asks for private keys, never signs, and never broadcasts transactions.' },
  );

  register(server, 'solana_get_balance', {
    title: 'Get SOL balance',
    description: 'Get the native SOL balance for a Solana mainnet-beta address.',
    inputSchema: z.object({ address, commitment }),
  }, async ({ address: owner, commitment: level }) => {
    const response = await rpcRequest('getBalance', [owner, { commitment: level }]);
    const data = { network: 'mainnet-beta', address: owner, commitment: level, contextSlot: response.context.slot, lamports: response.value, sol: response.value / 1_000_000_000 };
    return result(data, `${data.sol} SOL at ${owner}`);
  });

  register(server, 'solana_get_token_balances', {
    title: 'Get SPL token balances',
    description: 'List SPL Token and Token-2022 balances owned by a Solana mainnet-beta address.',
    inputSchema: z.object({ address, commitment, includeZero: z.boolean().default(false) }),
  }, async ({ address: owner, commitment: level, includeZero }) => {
    const programs = [TOKEN_PROGRAM, TOKEN_2022_PROGRAM];
    const responses = await Promise.all(programs.map(programId => rpcRequest('getTokenAccountsByOwner', [owner, { programId }, { encoding: 'jsonParsed', commitment: level }])))
    const accounts = responses.flatMap((response, index) => response.value.map(account => {
      const info = account.account.data.parsed.info;
      return {
        tokenAccount: account.pubkey,
        mint: info.mint,
        owner: info.owner,
        program: index === 0 ? 'spl-token' : 'token-2022',
        amount: info.tokenAmount.amount,
        decimals: info.tokenAmount.decimals,
        uiAmountString: info.tokenAmount.uiAmountString,
      };
    })).filter(account => includeZero || account.amount !== '0');
    const data = { network: 'mainnet-beta', address: owner, commitment: level, count: accounts.length, accounts };
    return result(data, `Found ${accounts.length} non-custodial token balance${accounts.length === 1 ? '' : 's'} for ${owner}.`);
  });

  register(server, 'solana_get_account_info', {
    title: 'Inspect account',
    description: 'Inspect a Solana account, including owner program, lamports, executable status and parsed data when available.',
    inputSchema: z.object({ address, commitment }),
  }, async ({ address: accountAddress, commitment: level }) => {
    const response = await rpcRequest('getAccountInfo', [accountAddress, { encoding: 'jsonParsed', commitment: level }]);
    if (!response.value) return result({ network: 'mainnet-beta', address: accountAddress, exists: false }, `No account exists at ${accountAddress}.`);
    const value = response.value;
    let accountData = value.data;
    if (Array.isArray(accountData) && typeof accountData[0] === 'string' && accountData[0].length > 4096) accountData = [`${accountData[0].slice(0, 4096)}…`, accountData[1], { truncated: true }];
    const data = { network: 'mainnet-beta', address: accountAddress, exists: true, contextSlot: response.context.slot, ownerProgram: value.owner, lamports: value.lamports, sol: value.lamports / 1_000_000_000, executable: value.executable, rentEpoch: value.rentEpoch, space: value.space, data: accountData };
    return result(data, `Account ${accountAddress} is owned by ${value.owner}.`);
  });

  register(server, 'solana_get_signatures', {
    title: 'Get address history',
    description: 'Get recent confirmed transaction signatures involving a Solana address.',
    inputSchema: z.object({ address, limit: z.number().int().min(1).max(25).default(10), before: signature.optional(), until: signature.optional(), commitment }),
  }, async ({ address: accountAddress, limit, before, until, commitment: level }) => {
    const options = { limit, commitment: level, ...(before ? { before } : {}), ...(until ? { until } : {}) };
    const entries = await rpcRequest('getSignaturesForAddress', [accountAddress, options]);
    const signatures = entries.map(entry => ({ ...entry, blockTimeIso: isoTime(entry.blockTime) }));
    const data = { network: 'mainnet-beta', address: accountAddress, count: signatures.length, signatures };
    return result(data, `Found ${signatures.length} recent transaction signature${signatures.length === 1 ? '' : 's'} for ${accountAddress}.`);
  });

  register(server, 'solana_get_transaction', {
    title: 'Get transaction',
    description: 'Get and explain the parsed details of a confirmed Solana mainnet-beta transaction.',
    inputSchema: z.object({ signature, commitment: z.enum(['confirmed', 'finalized']).default('confirmed') }),
  }, async ({ signature: transactionSignature, commitment: level }) => {
    const transaction = await rpcRequest('getTransaction', [transactionSignature, { encoding: 'jsonParsed', commitment: level, maxSupportedTransactionVersion: 0 }]);
    if (!transaction) return result({ network: 'mainnet-beta', signature: transactionSignature, found: false }, `Transaction ${transactionSignature} was not found at ${level} commitment.`);
    const message = transaction.transaction.message;
    const data = {
      network: 'mainnet-beta', signature: transactionSignature, found: true, slot: transaction.slot,
      blockTime: transaction.blockTime, blockTimeIso: isoTime(transaction.blockTime), version: transaction.version,
      success: transaction.meta?.err == null, error: transaction.meta?.err ?? null, feeLamports: transaction.meta?.fee ?? null,
      computeUnitsConsumed: transaction.meta?.computeUnitsConsumed ?? null,
      accountKeys: message.accountKeys,
      instructions: message.instructions,
      innerInstructions: transaction.meta?.innerInstructions ?? [],
      preBalances: transaction.meta?.preBalances ?? [], postBalances: transaction.meta?.postBalances ?? [],
      preTokenBalances: transaction.meta?.preTokenBalances ?? [], postTokenBalances: transaction.meta?.postTokenBalances ?? [],
      logMessages: (transaction.meta?.logMessages ?? []).slice(0, 150),
    };
    return result(data, `Transaction ${transactionSignature} ${data.success ? 'succeeded' : 'failed'} in slot ${data.slot}.`);
  });

  register(server, 'solana_get_signature_status', {
    title: 'Check transaction status',
    description: 'Check the current confirmation and error status of a Solana transaction signature.',
    inputSchema: z.object({ signature, searchTransactionHistory: z.boolean().default(true) }),
  }, async ({ signature: transactionSignature, searchTransactionHistory }) => {
    const response = await rpcRequest('getSignatureStatuses', [[transactionSignature], { searchTransactionHistory }]);
    const status = response.value[0];
    const data = { network: 'mainnet-beta', signature: transactionSignature, found: status !== null, status };
    return result(data, status ? `Transaction is ${status.confirmationStatus ?? 'processed'}.` : 'Transaction status was not found.');
  });

  register(server, 'solana_get_token_supply', {
    title: 'Get token supply',
    description: 'Get the current supply and decimals for an SPL token mint on Solana mainnet-beta.',
    inputSchema: z.object({ mint: address, commitment }),
  }, async ({ mint, commitment: level }) => {
    const response = await rpcRequest('getTokenSupply', [mint, { commitment: level }]);
    const data = { network: 'mainnet-beta', mint, contextSlot: response.context.slot, ...response.value };
    return result(data, `Token ${mint} has a UI supply of ${response.value.uiAmountString}.`);
  });

  register(server, 'solana_network_status', {
    title: 'Get Solana network status',
    description: 'Get live mainnet-beta health, slot, epoch and RPC software version.',
    inputSchema: z.object({ commitment }),
  }, async ({ commitment: level }) => {
    const [health, slot, epoch, version] = await Promise.all([
      rpcRequest('getHealth'), rpcRequest('getSlot', [{ commitment: level }]), rpcRequest('getEpochInfo', [{ commitment: level }]), rpcRequest('getVersion'),
    ]);
    const data = { network: 'mainnet-beta', health, slot, epoch, version, checkedAt: new Date().toISOString() };
    return result(data, `Solana mainnet-beta is ${health} at slot ${slot}.`);
  });

  register(server, 'solana_simulate_transaction', {
    title: 'Simulate transaction',
    description: 'Simulate a base64-encoded Solana transaction without signing or broadcasting it. This never submits the transaction.',
    inputSchema: z.object({ transactionBase64: z.string().min(1).max(350_000), commitment: z.enum(['processed', 'confirmed']).default('processed') }),
  }, async ({ transactionBase64, commitment: level }) => {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(transactionBase64)) throw new Error('transactionBase64 must be valid base64 without a data-URL prefix.');
    const response = await rpcRequest('simulateTransaction', [transactionBase64, { encoding: 'base64', commitment: level, sigVerify: false, replaceRecentBlockhash: true }]);
    const value = response.value;
    const data = { network: 'mainnet-beta', broadcast: false, contextSlot: response.context.slot, success: value.err == null, error: value.err, unitsConsumed: value.unitsConsumed ?? null, logs: (value.logs ?? []).slice(0, 200), returnData: value.returnData ?? null };
    return result(data, `Simulation ${data.success ? 'succeeded' : 'failed'}; the transaction was not broadcast.`);
  });

  return server;
}

export const mcpHandler = createMcpHandler(buildServer, {
  legacy: 'stateless', responseMode: 'json', maxRequestBodySize: 512 * 1024,
  onerror: error => console.error('[nilmo-mcp]', cleanError(error)),
});
const nodeHandler = toNodeHandler(mcpHandler, { maxRequestBodySize: 512 * 1024 });

function rateLimit(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const key = String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, accept, mcp-protocol-version, mcp-session-id, authorization');
  res.setHeader('x-content-type-options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!rateLimit(req)) return res.status(429).json({ error: 'Rate limit exceeded. Try again in one minute.' });
  return nodeHandler(req, res);
}


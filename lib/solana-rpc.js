export const SERVER_VERSION = '1.0.0';

const DEFAULT_RPC_URL = 'https://api.mainnet-beta.solana.com';
const REQUEST_TIMEOUT_MS = 14_000;

function rpcUrls() {
  return [...new Set([
    process.env.SOLANA_RPC_URL,
    process.env.SOLANA_RPC_FALLBACK_URL,
    DEFAULT_RPC_URL,
  ].filter(Boolean).map(value => value.trim()).filter(value => value.startsWith('https://')))];
}

export function cleanError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/https?:\/\/[^\s)]+/g, '[RPC endpoint]').slice(0, 500);
}

export async function rpcRequest(method, params = []) {
  let lastError;
  for (const url of rpcUrls()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': `Nilmo-MCP/${SERVER_VERSION}` },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Solana RPC returned HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.error) throw new Error(`Solana RPC ${payload.error.code}: ${payload.error.message}`);
      return payload.result;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Mainnet RPC request failed: ${cleanError(lastError)}`);
}

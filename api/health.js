import { rpcRequest } from '../lib/solana-rpc.js';

export default async function handler(_req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('access-control-allow-origin', '*');
  try {
    const [health, slot, version] = await Promise.all([rpcRequest('getHealth'), rpcRequest('getSlot', [{ commitment: 'confirmed' }]), rpcRequest('getVersion')]);
    return res.status(200).json({ ok: health === 'ok', service: 'nilmo-solana-mcp', network: 'mainnet-beta', health, slot, version, checkedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(503).json({ ok: false, service: 'nilmo-solana-mcp', error: error instanceof Error ? error.message : String(error) });
  }
}


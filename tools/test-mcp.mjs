import assert from 'node:assert/strict';

const remoteEndpoint = process.env.NILMO_TEST_MCP_URL;
const localHandler = remoteEndpoint ? null : (await import('../api/mcp.js')).mcpHandler;

async function request(message, protocolVersion = '2025-06-18') {
  const request = new Request(remoteEndpoint || 'http://localhost/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': protocolVersion },
    body: JSON.stringify(message),
  });
  const response = remoteEndpoint ? await fetch(request) : await localHandler.fetch(request);
  const text = await response.text();
  assert.equal(response.status, 200, text);
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    const data = text.split(/\r?\n/).find(line => line.startsWith('data: '));
    assert(data, `Missing SSE data frame: ${text}`);
    return JSON.parse(data.slice(6));
  }
  return JSON.parse(text);
}

const initialize = await request({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'nilmo-test', version: '1.0.0' } } });
assert.equal(initialize.result.serverInfo.name, 'nilmo-solana');

const listed = await request({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
assert.equal(listed.result.tools.length, 9);
assert(listed.result.tools.every(tool => tool.annotations?.readOnlyHint === true));

const balance = await request({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'solana_get_balance', arguments: { address: '11111111111111111111111111111111', commitment: 'confirmed' } } });
assert.equal(balance.result.isError, undefined);
assert.equal(balance.result.structuredContent.network, 'mainnet-beta');
assert.equal(typeof balance.result.structuredContent.lamports, 'number');

const network = await request({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'solana_network_status', arguments: { commitment: 'confirmed' } } });
assert.equal(network.result.structuredContent.health, 'ok');

console.log(JSON.stringify({ ok: true, endpoint: remoteEndpoint || 'in-process', tools: listed.result.tools.map(tool => tool.name), slot: network.result.structuredContent.slot }, null, 2));

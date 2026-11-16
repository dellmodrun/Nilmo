# Nilmo

Nilmo is a public-beta Solana mainnet-beta MCP gateway with a GitHub Pages frontend and a Vercel serverless backend.

## Live services

- Website: `https://nilmo.run/`
- MCP endpoint: `https://nilmo-solana-mcp.vercel.app/mcp`
- Gateway health: `https://nilmo-solana-mcp.vercel.app/health`

The gateway currently exposes nine verified tools for balances, token holdings, account data, signatures, transactions, token supply, network status and non-broadcast transaction simulation. It does not hold wallet keys, sign transactions or broadcast transactions.

## Development

```powershell
npm install
npm run test:mcp
npm run build:pages
npm run check:pages
node server.mjs
```

Use `NILMO_TEST_MCP_URL=https://nilmo-solana-mcp.vercel.app/mcp` when running the integration test against production. Optional `SOLANA_RPC_URL` and `SOLANA_RPC_FALLBACK_URL` environment variables configure dedicated Solana RPC providers.

The GitHub Pages workflow publishes the complete `site` directory for the `nilmo.run` custom domain. The Vercel deployment serves `/mcp` and `/health` from the API functions defined in this repository.

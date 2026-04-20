# dojo-tools

Monorepo for TypeScript/JavaScript tools used in the Dojo ecosystem.

## Packages

- `@dojo-tools/auth47` (`packages/auth47`): Auth47 protocol implementation.
- `@dojo-tools/bip47` (`packages/bip47`): BIP47/payment code utilities.
- `@dojo-tools/bitcoin-rpc` (`packages/bitcoin-rpc`): Thin Bitcoin Core RPC client.
- `@dojo-tools/bitcoinjs-message` (`packages/bitcoinjs-message`): Bitcoin message signing/verifying utilities.
- `@dojo-tools/boltzmann` (`packages/boltzmann`): Transaction entropy/linkability analysis.
- `@dojo-tools/boltzmann-cli` (`packages/boltzmann-cli`): CLI for `@dojo-tools/boltzmann`.
- `@dojo-tools/electrum-client` (`packages/electrum-client`): Electrum protocol client.
- `@dojo-tools/next-block-estimator` (`packages/next-block-estimator`): Next-block feerate estimator.
- `@dojo-tools/next-block-estimator-cli` (`packages/next-block-estimator-cli`): CLI for fee estimation.

## Requirements

- Node.js `>=24`
- pnpm `10.x`

## Workspace Setup

```bash
pnpm install
```

## Common Commands (root)

- `pnpm run build`: Build all packages.
- `pnpm run typecheck`: Run TypeScript checks across packages.
- `pnpm run test`: Run tests for packages that define them.
- `pnpm run lint`: Run Biome lint across packages.
- `pnpm run check`: Run `biome check --write` across packages.
- `pnpm run clean`: Remove package build outputs.

## Working on a Single Package

Use pnpm filters:

```bash
pnpm --filter @dojo-tools/bitcoin-rpc run build
pnpm --filter @dojo-tools/boltzmann run typescript
pnpm --filter @dojo-tools/auth47 run test
```

## Tooling Notes

- Package compilation uses `esbuild` (ESM output in `dist/`).
- Type declarations are generated with `tsc --emitDeclarationOnly` in package build scripts.
- All package `tsconfig.json` files extend the shared root `tsconfig.json`.
- Shared dependency versions are unified with pnpm catalogs in `pnpm-workspace.yaml`.

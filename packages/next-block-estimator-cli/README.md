# The $1 Fee Estimator CLI
## @dojo-tools/next-block-estimator-cli

This is a CLI tool for users that want to run [The $1 Fee Estimator](../next-block-estimator) locally in terminal

## Requirements
- Node.js v18 or newer
- NPM (or yarn or pnpm)
- Synchnonized Bitcoin Core with accessible RPC

## Installation
```shell
# install globally
npm i -g @dojo-tools/next-block-estimator-cli
```

## Usage

### Node.js

See [@dojo-tools/next-block-estimator](../next-block-estimator)

### CLI

```shell
# when installed via NPM globally

next-block-estimator --connection <host>:<port> --username <username> --password <password> [--mode <mode>] [--refresh <delay>]

# OR using NPX

npx @dojo-tools/next-block-estimator-cli@latest --connection <host>:<port> --username <username> --password <password> [--mode <mode>] [--refresh <delay>]

[-c OR --connection] = Connection string to bitcoind RPC API. Must be of the form <host>:<port>

[-u OR --username] = Username used to access bitcoind RPC API.

[-p OR --password] = Password used to access bitcoind RPC API.

[-k OR --cookie] = Cookie used to access bitcoind RPC API instead of username and password.

[-m OR --mode] = Mode used for the estimate (value = txs | bundles).

[-r OR --refresh] = Delay in seconds between 2 iterations of the computation.

[--debug] = Display debug information in logs
 ```

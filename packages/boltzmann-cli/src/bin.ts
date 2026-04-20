#!/usr/bin/env node
import { parseArgs } from "node:util";
import { Boltzmann, type LinkerOptions } from "@dojo-tools/boltzmann";

import { fetcher } from "./fetcher/api.js";

const getHostPort = (val: string): { host: string; port: number } => {
  // Regex pattern for IPv4 or hostname, followed by [optional]:port.
  const pattern = /^([\w.-]+):?(\d+)?$/;
  const match = val.match(pattern);

  if (!match) {
    throw new Error("Invalid format. Expected <host>:<port>");
  }

  const [, host, portStr] = match;

  if (!portStr) {
    throw new Error("No port provided.");
  }

  const port = Number(portStr);

  if (Number.isNaN(port)) {
    throw new TypeError("Invalid port number.");
  }

  if (port <= 0 || port > 65535) {
    throw new Error("Port number out of range. Valid range is 1-65535.");
  }

  return { host, port };
};

const apiOptions = ["mempool", "blockstream"] as const;

const linkabilityOptions = [
  "PRECHECK",
  "LINKABILITY",
  "MERGE_FEES",
  "MERGE_INPUTS",
  "MERGE_OUTPUTS",
] as const;

const isLinkabilityOption = (
  value: string,
): value is (typeof linkabilityOptions)[number] => {
  return (linkabilityOptions as readonly string[]).includes(value);
};

const printHelp = () => {
  console.log(`Usage: boltzmann [options]

Options:
  -m, --maxDuration <number>  Max duration in seconds (default: Infinity)
  -x, --maxTxos <number>      Max number of txos (default: Infinity)
  -i, --intraFees <number>    Max intrafees ratio (default: 0.005)
  -l, --linkerOpts <value>    Linker option (repeatable)
                              Allowed: ${linkabilityOptions.join(", ")}
  -t, --txId <string>         Transaction ID (required)
  -a, --api <value>           Source API (required): ${apiOptions.join(", ")}
  -s, --socks <host:port>     SOCKS proxy endpoint
      --debug                 Enable debug mode
  -h, --help                  Show help
`);
};

const main = async () => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    strict: true,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      debug: { type: "boolean" },
      maxDuration: { type: "string", short: "m" },
      maxTxos: { type: "string", short: "x" },
      intraFees: { type: "string", short: "i" },
      linkerOpts: { type: "string", short: "l", multiple: true },
      txId: { type: "string", short: "t" },
      api: { type: "string", short: "a" },
      socks: { type: "string", short: "s" },
    },
  });

  if (values.help) {
    printHelp();
    return;
  }

  if (values.txId == null) {
    throw new Error("Missing required option: --txId");
  }

  if (values.api == null) {
    throw new Error("Missing required option: --api");
  }

  if (!(apiOptions as readonly string[]).includes(values.api)) {
    throw new Error(
      `Invalid --api value: ${values.api}. Expected one of: ${apiOptions.join(", ")}`,
    );
  }

  const maxDuration =
    values.maxDuration == null
      ? Number.POSITIVE_INFINITY
      : Number(values.maxDuration);
  if (Number.isNaN(maxDuration)) {
    throw new TypeError("Invalid --maxDuration value. Expected a number.");
  }

  const maxTxos =
    values.maxTxos == null ? Number.POSITIVE_INFINITY : Number(values.maxTxos);
  if (Number.isNaN(maxTxos)) {
    throw new TypeError("Invalid --maxTxos value. Expected a number.");
  }

  const intraFees = values.intraFees == null ? 0.005 : Number(values.intraFees);
  if (Number.isNaN(intraFees)) {
    throw new TypeError("Invalid --intraFees value. Expected a number.");
  }

  const rawLinkerOpts = values.linkerOpts ?? [];
  for (const value of rawLinkerOpts) {
    if (!isLinkabilityOption(value)) {
      throw new Error(
        `Invalid --linkerOpts value: ${value}. Expected one of: ${linkabilityOptions.join(", ")}`,
      );
    }
  }

  const linkerOptions: LinkerOptions | undefined = rawLinkerOpts.length
    ? {
        precheck: rawLinkerOpts.includes("PRECHECK"),
        linkability: rawLinkerOpts.includes("LINKABILITY"),
        mergeInputs: rawLinkerOpts.includes("MERGE_INPUTS"),
        mergeOutputs: rawLinkerOpts.includes("MERGE_OUTPUTS"),
        mergeFees: rawLinkerOpts.includes("MERGE_FEES"),
      }
    : undefined;

  const boltzmann = new Boltzmann({
    maxDuration,
    maxTxos,
    maxCjIntrafeesRatio: intraFees,
    linkerOptions: linkerOptions,
    logLevel: values.debug ? "DEBUG" : "INFO",
  });

  const txos = await fetcher(
    values.txId,
    values.api as (typeof apiOptions)[number],
    values.socks ? getHostPort(values.socks) : undefined,
  );

  return boltzmann.process(txos).print();
};

main();

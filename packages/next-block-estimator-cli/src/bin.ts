#!/usr/bin/env node
import path from "node:path";
import { parseArgs } from "node:util";

import {
	FeeEstimator,
	type Options,
} from "@dojo-tools/next-block-estimator";

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

const modeOptions = ["txs", "bundles"] as const;

const printHelp = () => {
	console.log(`Usage: next-block-estimator [options]

Options:
  -c, --connection <host:port>  bitcoind RPC endpoint (required)
  -s, --secure                  Use HTTPS for RPC
  -u, --username <string>       RPC username (requires --password, conflicts with --cookie)
  -p, --password <string>       RPC password (requires --username, conflicts with --cookie)
  -k, --cookie <path>           RPC cookie file path (conflicts with --username/--password)
  -m, --mode <value>            Estimate mode: ${modeOptions.join(" | ")}
  -r, --refresh <number>        Delay in seconds between estimates
      --debug                   Enable debug mode
  -h, --help                    Show help
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
			connection: { type: "string", short: "c" },
			secure: { type: "boolean", short: "s" },
			username: { type: "string", short: "u" },
			password: { type: "string", short: "p" },
			cookie: { type: "string", short: "k" },
			mode: { type: "string", short: "m" },
			refresh: { type: "string", short: "r" },
		},
	});

	if (values.help) {
		printHelp();
		return;
	}

	if (values.connection == null) {
		throw new Error("Missing required option: --connection");
	}
	const connection = getHostPort(values.connection);

	if (values.cookie && (values.username || values.password)) {
		throw new Error("--cookie conflicts with --username and --password");
	}

	if ((values.username && !values.password) || (!values.username && values.password)) {
		throw new Error("--username and --password must be provided together");
	}

	if (values.mode && !(modeOptions as readonly string[]).includes(values.mode)) {
		throw new Error(
			`Invalid --mode value: ${values.mode}. Expected one of: ${modeOptions.join(", ")}`,
		);
	}

	const refresh =
		values.refresh == null ? undefined : Number(values.refresh);
	if (values.refresh != null && Number.isNaN(refresh)) {
		throw new TypeError("Invalid --refresh value. Expected a number.");
	}

	const rpcOptions = ((): Options["rpcOptions"] => {
		if (values.cookie) {
			return {
				host: connection.host,
				port: connection.port,
				protocol: values.secure ? "https" : "http",
				cookie: path.resolve(values.cookie),
			};
		}

		if (values.username && values.password) {
			return {
				host: connection.host,
				port: connection.port,
				protocol: values.secure ? "https" : "http",
				username: values.username,
				password: values.password,
			};
		}

		throw new Error(
			"Expected an RPC cookie file path or an RPC username & password",
		);
	})();

	const estimator = new FeeEstimator({
		mode: values.mode as Options["mode"],
		refresh,
		rpcOptions: rpcOptions,
		debug: values.debug,
	});

	estimator.on("data", (data) => {
		if (!data.ready)
			console.log("Bitcoind mempool not fully loaded. Fees are unreliable");
		console.log("Recommended fees are", data.fees);
	});

	estimator.on("error", (error) => {
		console.error(error);
		process.exit(1);
	});
};

main();

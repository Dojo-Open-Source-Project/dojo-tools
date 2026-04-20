import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
	resolve: {
		alias: {
			"@dojo-tools/bitcoin-rpc": fileURLToPath(
				new URL("../bitcoin-rpc/src/index.ts", import.meta.url),
			),
		},
	},
	test: {
		globals: true,
		include: ["./test/**/*.test.ts"],
		coverage: {
			provider: "v8",
		},
	},
});

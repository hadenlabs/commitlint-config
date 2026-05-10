import type { UserConfig } from "@commitlint/types";
import { plugin, validScopes, validTypes } from "./plugin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: UserConfig = {
	// Load custom rules from plugin - these provide actual enforcement
	plugins: [plugin as any],

	parserPreset: {
		parserOpts: {
			// Updated to match: <type> <emoji> (<scope>): <subject>
			// Format: feat ✨ (core): HAD-123 subject OR feat ✨: subject
			headerPattern: /^(\w+)\s+([^\s]+)\s*(?:\(([^)]+)\))?:\s*(.*)$/,
			headerCorrespondence: ["type", "emoji", "scope", "subject"],
		},
	},

	rules: {
		"body-leading-blank": [2, "always"],

		"footer-leading-blank": [2, "always"],

		// Align to policy: 100 (jasper.toml + .goji.json)
		"header-max-length": [2, "always", 100],

		"scope-case": [2, "always", "lower-case"],

		"subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],

		"subject-empty": [2, "never"],

		"subject-exclamation-mark": [2, "never"],

		"subject-full-stop": [2, "never", "."],

		"type-case": [2, "always", "lower-case"],

		"type-empty": [2, "never"],

		"type-enum": [2, "always", validTypes],

		// Scope enum validation (from .goji.json scopes)
		"scope-enum": [2, "always", validScopes],

		// Custom rules from plugin - enforcement is done by plugin.rules entries
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		"subject-jira": [2, "always"] as any,

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		"header-emoji": [2, "always"] as any,
	},
};

export default config;
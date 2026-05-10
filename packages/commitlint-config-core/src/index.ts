// Commitlint configuration - flat config with built-in rules only
// Consumed via extends: ['@hadenlabs/commitlint-config-core']

import type { UserConfig } from "@commitlint/types";

// Commit types (static list)
const COMMIT_TYPES = [
	"feat",
	"fix",
	"docs",
	"refactor",
	"style",
	"chore",
	"test",
	"hotfix",
	"deprecate",
	"perf",
	"wip",
	"build",
	"package",
	"sample",
	"revert",
	"ci",
	"prompt",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: UserConfig = {
	parserPreset: {
		parserOpts: {
			// Format: <type>[emoji](<scope>): <subject>
			// Examples:
			//   - feat(core): add new feature
			//   - feat ✨ (core): add new feature
			// Emoji is optional and does not affect headerCorrespondence mapping
			headerPattern:
				/^(\w+)(?:\s+[\p{Emoji_Presentation}\p{Extended_Pictographic}])?(?:\s*\((.*?)\))?:\s*(.*)$/u,
			headerCorrespondence: ["type", "scope", "subject"],
		},
	},

	rules: {
		// Body rules
		"body-leading-blank": [2, "always"],

		// Footer rules
		"footer-leading-blank": [2, "always"],

		// Header rules
		"header-max-length": [2, "always", 80],

		// Scope rules
		"scope-case": [2, "always", "lower-case"],

		// Subject rules
		"subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
		"subject-empty": [2, "never"],
		"subject-exclamation-mark": [2, "never"],
		"subject-full-stop": [2, "never", "."],

		// Type rules
		"type-case": [2, "always", "lower-case"],
		"type-empty": [2, "never"],
		"type-enum": [2, "always", [...COMMIT_TYPES]],
	},
};

export default config;
// Commitlint configuration with provider-aware rules
// Reads jasper.toml for provider resolution and jira key pattern
// Scopes are loaded from jasper.toml [commit].scopes only (no .goji.json fallback)
// Note: scope-enum is NOT enforced - scopes are informational only
// Scopes not listed in jasper.toml will NOT cause commit failures
// Use scope-case rule for format validation (lowercase) when scope is present

import type { UserConfig } from "@commitlint/types";
import { buildResolvedConfig } from "./config";
import { plugin, validTypes } from "./plugin";

// Build resolved config from jasper.toml only
const resolvedConfig = buildResolvedConfig();

// Scopes from jasper.toml [commit].scopes - only used for informational purposes
// scope-enum is NOT applied - undeclared scopes are allowed
const effectiveScopes = resolvedConfig.validScopes;

// Types: still from .goji.json (types not yet migrated to jasper.toml)
const effectiveTypes =
	resolvedConfig.validTypes.length > 0
		? resolvedConfig.validTypes.map((t) => t.name)
		: validTypes;

// Build the commit types list for type-enum rule
const typeEnumValues = effectiveTypes.filter(Boolean);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: UserConfig = {
	// Load custom rules from plugin - provider-aware enforcement
	plugins: [plugin as any],

	parserPreset: {
		parserOpts: {
			// Format: <type> <emoji> (<scope>): <subject>
			// Jira: feat ✨ (core): HAD-123 subject
			// GitHub: feat ✨ (core): subject (#123)
			// GitLab: feat ✨ (core): subject (#123)
			headerPattern: /^(\w+)\s+([^\s]+)\s*(?:\(([^)]+)\))?:\s*(.*)$/,
			headerCorrespondence: ["type", "emoji", "scope", "subject"],
		},
	},

	rules: {
		"body-leading-blank": [2, "always"],

		"footer-leading-blank": [2, "always"],

		// From jasper.toml: [commit].subjectMaxLength
		"header-max-length": [2, "always", resolvedConfig.subjectMaxLength],

		"scope-case": [2, "always", "lower-case"],

		"subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],

		"subject-empty": [2, "never"],

		"subject-exclamation-mark": [2, "never"],

		"subject-full-stop": [2, "never", "."],

		"type-case": [2, "always", "lower-case"],

		"type-empty": [2, "never"],

		// Dynamic from .goji.json types
		"type-enum": [2, "always", typeEnumValues],

		// NOTE: scope-enum is intentionally NOT applied here
		// Scopes from jasper.toml are for reference only - undeclared scopes are allowed
		// Use scope-case rule for lowercase format validation when scope is present

		// Provider-aware key rule from plugin
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		"subject-key": [2, "always"] as any,

		// Emoji validation from plugin
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		"header-emoji": [2, "always"] as any,
	},
};

// Export provider info for debugging
export const providerInfo = {
	provider: resolvedConfig.provider,
	projectKey: resolvedConfig.projectKey,
	jiraKeyPattern: resolvedConfig.jiraKeyPattern?.source || null,
	subjectMaxLength: resolvedConfig.subjectMaxLength,
	scopeCount: effectiveScopes.length,
	typeCount: effectiveTypes.length,
	// Scope listing is non-blocking (no scope-enum enforcement)
	scopeEnumEnforced: false,
};

export default config;

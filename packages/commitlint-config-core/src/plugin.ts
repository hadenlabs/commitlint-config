// Commitlint custom rules plugin
// Provider-aware rules derived from jasper.toml configuration

import type { Rule, RuleConfigCondition } from "@commitlint/types";
import type { ResolvedConfig, ValidType } from "./config";

// Commitlint parsed commit structure (compatible with conventional-commits-parser)
interface ParsedCommit {
	header?: string | null;
	type?: string | null;
	scope?: string | null;
	subject?: string | null;
	body?: string | null;
	footer?: string | null;
}

// Rule function type matching commitlint's PluginRule format
type PluginRule = Rule<ParsedCommit> & ((parsed: ParsedCommit, when?: RuleConfigCondition) => [boolean, string?]);
import {
	buildResolvedConfig,
	loadGojiConfig,
	loadJasperConfig,
	loadScopesFromJasper,
} from "./config";

// Load configuration once at module initialization
let cachedConfig: ResolvedConfig | null = null;

function getResolvedConfig(): ResolvedConfig {
	if (!cachedConfig) {
		cachedConfig = buildResolvedConfig();
	}
	return cachedConfig;
}

function getJiraKeyPattern(): RegExp {
	const config = getResolvedConfig();
	if (config.jiraKeyPattern) {
		return config.jiraKeyPattern;
	}
	// Fallback: derive from projectKey in jasper.toml
	// This will throw if projectKey is not set
	const jasperConfig = loadJasperConfig();
	const projectKey = jasperConfig.issueTracking?.projectKey;
	if (!projectKey) {
		throw new Error(
			"Jira provider configured but projectKey not set in jasper.toml\n" +
				"  Set projectKey in [issueTracking] section\n" +
				'  Example: projectKey = "HAD"',
		);
	}
	return new RegExp(`^${projectKey}-[0-9]+`);
}

// Valid scopes from jasper.toml only - no .goji.json fallback
// Note: scope-enum rule is NOT applied in config, so this is informational
function getValidScopes(): string[] {
	// Use directly from jasper.toml only
	return loadScopesFromJasper();
}

// Valid types from .goji.json (dynamic)
function getValidTypes(): ValidType[] {
	const config = getResolvedConfig();
	if (config.validTypes.length > 0) {
		return config.validTypes;
	}
	// Fallback
	const gojiConfig = loadGojiConfig();
	return gojiConfig.types;
}

// Build emoji map from types
function getValidEmojis(): string[] {
	const types = getValidTypes();
	if (types.length === 0) {
		// Fallback static emojis
		return [
			"✨",
			"🐛",
			"📚",
			"🎨",
			"💄",
			"🧹",
			"🧪",
			"🚑",
			"⚰",
			"⚡",
			"🚧",
			"🛠",
			"📦",
			"🔍",
			"⏪",
			"👷",
			"📝",
		];
	}
	return types.map((t) => t.emoji).filter(Boolean);
}

// Get provider-specific description for error messages
function getProviderDescription(): string {
	const config = getResolvedConfig();
	const projectKey = config.projectKey;

	switch (config.provider) {
		case "jira":
			if (projectKey) {
				return `${projectKey}-<number> (e.g., ${projectKey}-123)`;
			}
			return "Jira key pattern from jasper.toml";
		case "github":
			return "#<number> (e.g., #123)";
		case "gitlab":
			return "#<number> (e.g., #123)";
		case "auto":
			return "issue key/number (provider resolution needed)";
		default:
			return "issue key";
	}
}

/**
 * Parse commit header: <type> <emoji> (<scope>): <subject>
 */
function parseHeader(header: string): {
	type?: string;
	emoji?: string;
	scope?: string;
	subject?: string;
} {
	const pattern = /^(\w+)\s+([^\s]+)\s*(?:\(([^)]+)\))?:\s*(.*)$/;
	const match = header.match(pattern);
	if (!match) return {};
	return {
		type: match[1],
		emoji: match[2],
		scope: match[3],
		subject: match[4],
	};
}

/**
 * Subject key rule - enforces provider-specific key pattern
 *
 * Jira: Requires Jira key at START of subject (e.g., HAD-123)
 * GitHub/GitLab: Allows #number format or no key requirement
 * Auto: Warn that provider needs resolution
 *
 * @param parsed - Parsed commit message
 * @param when - Rule condition ('always' or 'never')
 * @returns [valid, message] tuple
 */
export const subjectKeyRule: PluginRule = (
	parsed: ParsedCommit,
	_when?: RuleConfigCondition,
): [boolean, string?] => {
	const subject = parsed.subject;

	if (!subject) {
		return [false, "subject-key rule requires subject to be present"];
	}

	const config = getResolvedConfig();

	// Handle "auto" provider - require explicit configuration
	if (config.provider === "auto") {
		// Cannot validate without deterministic provider
		// Fail with clear message about configuration
		return [
			false,
			`Cannot validate commit with "auto" provider resolution.\n` +
				`  - Set explicit provider in jasper.toml: [issueTracking].provider = "jira"|"github"|"gitlab"\n` +
				`  - Or ensure scm.provider is not "auto"`,
		];
	}

	// Jira: require key at START of subject
	if (config.provider === "jira") {
		try {
			const jiraPattern = getJiraKeyPattern();
			if (!jiraPattern.test(subject)) {
				return [
					false,
					`subject must start with ${getProviderDescription()} but found: "${subject}"`,
				];
			}
		} catch (_error) {
			// projectKey not configured
			return [
				false,
				`Jira provider configured but projectKey not set in jasper.toml`,
			];
		}
	}

	// GitHub/GitLab: allow their formats (no strict key requirement)
	// These providers use #number in parentheses at end, not start of subject
	if (config.provider === "github" || config.provider === "gitlab") {
		// No strict key-at-start requirement for these providers
		// The format allows "(#123)" at end which is handled by parser
		// Subject itself can be any format
		return [true, ""];
	}

	return [true, ""];
};

/**
 * Header emoji rule - requires valid emoji from policy
 *
 * @param parsed - Parsed commit message
 * @param when - Rule condition ('always' or 'never')
 * @returns [valid, message] tuple
 */
export const headerEmojiRule: PluginRule = (
	parsed: ParsedCommit,
	_when?: RuleConfigCondition,
): [boolean, string?] => {
	const header = parsed.header;
	if (!header)
		return [false, "header-emoji rule requires commit message header"];

	const { emoji } = parseHeader(header);
	if (!emoji) return [false, "header-emoji rule requires emoji in header"];

	const validEmojis = getValidEmojis();
	if (!validEmojis.includes(emoji)) {
		return [
			false,
			`emoji must be one of [${validEmojis.join(", ")}] but found: "${emoji}"`,
		];
	}
	return [true, ""];
};

/**
 * Scope case rule - requires lowercase scope (for extensibility)
 *
 * @param parsed - Parsed commit message
 * @param when - Rule condition ('always' or 'never')
 * @returns [valid, message] tuple
 */
export const scopeCaseRule: PluginRule = (
	parsed: ParsedCommit,
	_when?: RuleConfigCondition,
): [boolean, string?] => {
	const scope = parsed.scope;
	// Scope is optional, only validate if present
	if (scope && scope !== scope.toLowerCase()) {
		return [false, `scope must be lowercase but found: "${scope}"`];
	}
	return [true, ""];
};

// Plugin object with provider-aware rules
const plugin = {
	rules: {
		"subject-key": subjectKeyRule,
		"header-emoji": headerEmojiRule,
		"scope-case-custom": scopeCaseRule,
	},
};

// Export for use in index.ts
export const validScopes = getValidScopes();
export const validTypes = getValidTypes().map((t) => t.name);

// Export config for debugging/testing
// Main export
export { getJiraKeyPattern, getResolvedConfig, plugin };

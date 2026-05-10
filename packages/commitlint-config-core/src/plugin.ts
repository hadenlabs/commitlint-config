// Commitlint custom rules plugin
// This plugin provides enforceable custom rules for commitlint: subject-jira and header-emoji

// Valid scopes from .goji.json
const validScopes = ["core", "accounts", "ci", "skills"];

// Valid types from .goji.json
const validTypes = [
	"build",
	"chore",
	"ci",
	"deprecate",
	"docs",
	"feat",
	"fix",
	"hotfix",
	"package",
	"perf",
	"prompt",
	"refactor",
	"revert",
	"sample",
	"style",
	"test",
	"wip",
];

// Jira key pattern: projectKey="HAD", must be at START of subject
const jiraKeyPattern = /^HAD-[0-9]+/;

// Valid emojis from .goji.json types
const validEmojis = [
	"✨", // feat
	"🐛", // fix
	"📚", // docs
	"🎨", // refactor
	"💄", // style
	"🧹", // chore
	"🧪", // test
	"🚑", // hotfix
	"⚰", // deprecate
	"⚡", // perf
	"🚧", // wip
	"🛠", // build
	"📦", // package
	"🔍", // sample
	"⏪", // revert
	"👷", // ci
	"📝", // prompt
];

// Helper function to parse commit header
function parseHeader(header: string): { type?: string; emoji?: string; scope?: string; subject?: string } {
	// Format: <type> <emoji> (<scope>): <subject> OR <type> <emoji>: <subject>
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

// Export rule implementations as plain objects for testing
// These are the actual enforcement functions
export const subjectJiraRule = {
	description: "require Jira key (HAD-<number>) at the START of subject",
	lint: (parsed: { subject?: string }): [boolean, string] => {
		const { subject } = parsed;
		if (!subject) return [false, "subject-jira rule requires subject to be present"];
		// Check if subject starts with valid Jira key
		if (!jiraKeyPattern.test(subject)) {
			return [
				false,
				`subject must start with Jira key (HAD-<number>) but found: "${subject}"`,
			];
		}
		return [true, ""];
	},
	ex: (): string => "fix 🐛 (core): HAD-123 resolve bug",
};

export const headerEmojiRule = {
	description: "require valid emoji in header",
	lint: (parsed: { raw?: string }): [boolean, string] => {
		const header = parsed.raw;
		if (!header) return [false, "header-emoji rule requires commit message header"];
		const { emoji } = parseHeader(header);
		if (!emoji) return [false, "header-emoji rule requires emoji in header"];
		if (!validEmojis.includes(emoji)) {
			return [
				false,
				`emoji must be one of [${validEmojis.join(", ")}] but found: "${emoji}"`,
			];
		}
		return [true, ""];
	},
	ex: (): string => "feat ✨ (core): add new feature",
};

// Plugin object - commitlint plugin format
// Using inline type to avoid explicit any
const plugin: {
	rules: {
		"subject-jira": typeof subjectJiraRule;
		"header-emoji": typeof headerEmojiRule;
	};
} = {
	rules: {
		"subject-jira": subjectJiraRule,
		"header-emoji": headerEmojiRule,
	},
};

// Export everything
export {
	plugin,
	validScopes,
	validTypes,
	validEmojis,
	jiraKeyPattern,
};
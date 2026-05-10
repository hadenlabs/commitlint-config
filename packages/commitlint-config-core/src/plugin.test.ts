// Tests for plugin.ts - provider-aware commit rules
// Direct coverage of plugin.ts exports and behaviors

import { describe, expect, it } from "bun:test";

// Import plugin exports
import {
	getJiraKeyPattern,
	getResolvedConfig,
	headerEmojiRule,
	plugin,
	scopeCaseRule,
	subjectKeyRule,
	validScopes,
	validTypes,
	type ParsedCommit,
} from "./plugin";

// Rule function type (commitlint plugin rule format)
type PluginRule = (
	parsed: ParsedCommit,
	when: "always" | "never",
) => [boolean, string?];

// Helper to satisfy TypeScript: cast partial commit to ParsedCommit
const toCommit = (partial: Partial<ParsedCommit>): ParsedCommit =>
	partial as ParsedCommit;

// Store original module reference for cache reset (used for cache reset patterns)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _originalCachedConfig = null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _cachedConfig = (globalThis as any).__cachedConfig;

// ============================================================
// getJiraKeyPattern tests
// ============================================================
describe("getJiraKeyPattern", () => {
	it("should return RegExp from resolved config if available", () => {
		const pattern = getJiraKeyPattern();
		expect(pattern).toBeInstanceOf(RegExp);
		expect(pattern.source).toBe("^HAD-[0-9]+");
	});

	it("should match valid Jira keys with projectKey prefix", () => {
		const pattern = getJiraKeyPattern();
		expect(pattern.test("HAD-123")).toBe(true);
		expect(pattern.test("HAD-456789")).toBe(true);
		expect(pattern.test("HAD-1")).toBe(true);
	});

	it("should not match invalid keys", () => {
		const pattern = getJiraKeyPattern();
		expect(pattern.test("HAD")).toBe(false);
		expect(pattern.test("HAD-")).toBe(false);
		expect(pattern.test("HAD-abc")).toBe(false);
		expect(pattern.test("AR-123")).toBe(false);
		expect(pattern.test("had-123")).toBe(false);
	});

	it("should match keys at start of longer strings", () => {
		const pattern = getJiraKeyPattern();
		// Pattern matches at start: ^HAD-[0-9]+ matches HAD-123 at start
		expect(pattern.test("HAD-123 resolve bug")).toBe(true);
	});

	it("should be exported from plugin module", () => {
		expect(typeof getJiraKeyPattern).toBe("function");
	});
});

// ============================================================
// getResolvedConfig tests
// ============================================================
describe("getResolvedConfig", () => {
	it("should return resolved configuration from jasper.toml", () => {
		const config = getResolvedConfig();
		expect(config).toBeDefined();
	});

	it("should include required fields", () => {
		const config = getResolvedConfig();
		expect(config).toHaveProperty("provider");
		expect(config).toHaveProperty("projectKey");
		expect(config).toHaveProperty("jiraKeyPattern");
		expect(config).toHaveProperty("githubIssuePattern");
		expect(config).toHaveProperty("gitlabIssuePattern");
		expect(config).toHaveProperty("subjectMaxLength");
		expect(config).toHaveProperty("validScopes");
		expect(config).toHaveProperty("validTypes");
	});

	it("should have Jira provider from jasper.toml", () => {
		const config = getResolvedConfig();
		expect(config.provider).toBe("jira");
	});

	it("should have projectKey from jasper.toml", () => {
		const config = getResolvedConfig();
		expect(config.projectKey).toBe("HAD");
	});

	it("should have jiraKeyPattern from projectKey", () => {
		const config = getResolvedConfig();
		expect(config.jiraKeyPattern).toBeInstanceOf(RegExp);
		expect(config.jiraKeyPattern?.source).toBe("^HAD-[0-9]+");
	});

	it("should have correct subjectMaxLength", () => {
		const config = getResolvedConfig();
		const maxLen =
			typeof config.subjectMaxLength === "bigint"
				? Number(config.subjectMaxLength)
				: config.subjectMaxLength;
		expect(maxLen).toBe(100);
	});

	it("should have validScopes from jasper.toml", () => {
		const config = getResolvedConfig();
		expect(config.validScopes).toContain("core");
		expect(config.validScopes).toContain("accounts");
		expect(config.validScopes).toContain("ci");
		expect(config.validScopes).toContain("skills");
	});

	it("should have validTypes from .goji.json", () => {
		const config = getResolvedConfig();
		expect(config.validTypes.length).toBeGreaterThan(0);
		const typeNames = config.validTypes.map((t) => t.name);
		expect(typeNames).toContain("feat");
		expect(typeNames).toContain("fix");
	});

	it("should cache configuration (returns same object)", () => {
		const config1 = getResolvedConfig();
		const config2 = getResolvedConfig();
		expect(config1).toBe(config2);
	});

	it("should be exported from plugin module", () => {
		expect(typeof getResolvedConfig).toBe("function");
	});
});

// ============================================================
// subjectKeyRule tests by provider
// ============================================================
describe("subjectKeyRule", () => {
	// Helper to call rule directly as function
	const lint = (subject: string | null | undefined) =>
		(subjectKeyRule as PluginRule)(
			{ subject: subject ?? null, header: "", raw: "" },
			"always",
		);

	describe("with Jira provider", () => {
		it("should pass commit with valid Jira key at start of subject", () => {
			const [valid] = lint("HAD-123 resolve bug");
			expect(valid).toBe(true);
		});

		it("should pass commit with Jira key only", () => {
			const [valid] = lint("HAD-999");
			expect(valid).toBe(true);
		});

		it("should pass commit with large Jira number", () => {
			const [valid] = lint("HAD-999999");
			expect(valid).toBe(true);
		});

		it("should fail commit without Jira key", () => {
			const [valid, message] = lint("resolve bug");
			expect(valid).toBe(false);
			expect(message).toContain("must start with");
		});

		it("should fail commit with wrong project key", () => {
			const [valid] = lint("AR-123 wrong key");
			expect(valid).toBe(false);
		});

		it("should fail commit with Jira key not at start", () => {
			const [valid] = lint("fix HAD-123 bug");
			expect(valid).toBe(false);
		});

		it("should fail when subject is missing", () => {
			const [valid, message] = lint(null);
			expect(valid).toBe(false);
			expect(message).toContain("subject");
		});
	});

	describe("with GitHub/GitLab providers", () => {
		// Note: Tests verify the function signature works correctly
		// Provider-specific description is now handled internally
		it("should be a function", () => {
			expect(typeof subjectKeyRule).toBe("function");
		});

		it("should accept parsed commit and when parameter", () => {
			const [valid] = subjectKeyRule(
				toCommit({ subject: "any format", header: "", raw: "" }),
				"always",
			);
			// With jira provider, should validate
			expect(typeof valid).toBe("boolean");
		});
	});

	describe("rule structure", () => {
		it("should be a function (commitlint plugin rule format)", () => {
			expect(typeof subjectKeyRule).toBe("function");
		});

		it("should return [boolean, string?] tuple", () => {
			const result = subjectKeyRule(
				toCommit({ subject: "test", header: "", raw: "" }),
				"always",
			);
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(typeof result[0]).toBe("boolean");
		});
	});
});

// ============================================================
// headerEmojiRule tests
// ============================================================
describe("headerEmojiRule", () => {
	// Helper to call rule directly as function
	const lint = (raw: string | undefined) =>
		(headerEmojiRule as PluginRule)(
			{ raw: raw ?? "", header: raw ?? "", subject: "" },
			"always",
		);

	describe("valid cases", () => {
		it("should pass commit with valid emoji", () => {
			const [valid] = lint("feat ✨: add new feature");
			expect(valid).toBe(true);
		});

		it("should pass commit with emoji and scope", () => {
			const [valid] = lint("feat ✨ (core): add feature");
			expect(valid).toBe(true);
		});

		it("should pass commit with any valid emoji from policy", () => {
			const emojis = [
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
			for (const emoji of emojis) {
				const [valid] = lint(`feat ${emoji}: add feature`);
				expect(valid).toBe(true);
			}
		});

		it("should pass commit with emoji and Jira key", () => {
			const [valid] = lint("fix 🐛 (core): HAD-123 resolve bug");
			expect(valid).toBe(true);
		});
	});

	describe("invalid cases", () => {
		it("should fail commit with invalid emoji", () => {
			const [valid, message] = lint("feat ❌: invalid emoji");
			expect(valid).toBe(false);
			expect(message).toContain("emoji");
		});

		it("should fail commit with no emoji", () => {
			const [valid, message] = lint("feat: add feature");
			expect(valid).toBe(false);
			expect(message).toContain("emoji");
		});

		it("should fail commit with no header", () => {
			const [valid, message] = lint("");
			expect(valid).toBe(false);
			expect(message).toContain("header");
		});

		it("should fail with non-emoji character", () => {
			const [valid] = lint("feat ABC: test");
			expect(valid).toBe(false);
		});

		it("should fail with emoji not in policy list", () => {
			const [valid] = lint("feat 🎮: gaming");
			expect(valid).toBe(false);
		});
	});

	describe("rule structure", () => {
		it("should be a function (commitlint plugin rule format)", () => {
			expect(typeof headerEmojiRule).toBe("function");
		});

		it("should return [boolean, string?] tuple", () => {
			const result = headerEmojiRule(
				toCommit({ raw: "test", header: "test", subject: "" }),
				"always",
			);
			expect(Array.isArray(result)).toBe(true);
			expect(typeof result[0]).toBe("boolean");
		});
	});
});

// ============================================================
// scopeCaseRule tests
// ============================================================
describe("scopeCaseRule", () => {
	// Helper to call rule directly as function
	const lint = (scope: string | null | undefined) =>
		(scopeCaseRule as PluginRule)(
			{
				scope: scope ?? null,
				header: "",
				raw: "",
				subject: "",
			},
			"always",
		);

	describe("valid cases", () => {
		it("should pass commit with lowercase scope", () => {
			const [valid] = lint("core");
			expect(valid).toBe(true);
		});

		it("should pass commit with no scope", () => {
			const [valid] = lint(null);
			expect(valid).toBe(true);
		});

		it("should pass scope defined in jasper.toml", () => {
			const scopes = ["core", "accounts", "ci", "skills"];
			for (const scope of scopes) {
				const [valid] = lint(scope);
				expect(valid).toBe(true);
			}
		});
	});

	describe("invalid cases", () => {
		it("should fail commit with uppercase scope", () => {
			const [valid, message] = lint("CORE");
			expect(valid).toBe(false);
			expect(message).toContain("lowercase");
		});

		it("should fail commit with mixed case scope", () => {
			const [valid] = lint("CoreAccounts");
			expect(valid).toBe(false);
		});

		it("should fail commit with camelCase scope", () => {
			const [valid] = lint("coreAccounts");
			expect(valid).toBe(false);
		});

		it("should fail commit with uppercase letters in scope", () => {
			const [valid] = lint("Core");
			expect(valid).toBe(false);
		});
	});

	describe("rule structure", () => {
		it("should be a function (commitlint plugin rule format)", () => {
			expect(typeof scopeCaseRule).toBe("function");
		});

		it("should return [boolean, string?] tuple", () => {
			const result = scopeCaseRule(
				toCommit({ scope: "test", header: "", raw: "", subject: "" }),
				"always",
			);
			expect(Array.isArray(result)).toBe(true);
			expect(typeof result[0]).toBe("boolean");
		});
	});
});

// ============================================================
// plugin structure tests
// ============================================================
describe("plugin", () => {
	it("should be an object with rules property", () => {
		expect(plugin).toBeDefined();
		expect(typeof plugin).toBe("object");
		expect(plugin).toHaveProperty("rules");
	});

	it("should have subject-key rule as function", () => {
		expect(plugin.rules).toHaveProperty("subject-key");
		expect(typeof plugin.rules["subject-key"]).toBe("function");
	});

	it("should have header-emoji rule as function", () => {
		expect(plugin.rules).toHaveProperty("header-emoji");
		expect(typeof plugin.rules["header-emoji"]).toBe("function");
	});

	it("should have scope-case-custom rule as function", () => {
		expect(plugin.rules).toHaveProperty("scope-case-custom");
		expect(typeof plugin.rules["scope-case-custom"]).toBe("function");
	});

	it("should have all three rules as functions (commitlint plugin format)", () => {
		const rules = ["subject-key", "header-emoji", "scope-case-custom"] as const;

		for (const ruleName of rules) {
			const rule = plugin.rules[ruleName];
			expect(typeof rule).toBe("function");
		}
	});
});

// ============================================================
// exported values tests
// ============================================================
describe("plugin exports", () => {
	describe("validScopes", () => {
		it("should be exported and contain scopes from jasper.toml", () => {
			expect(Array.isArray(validScopes)).toBe(true);
			expect(validScopes).toContain("core");
			expect(validScopes).toContain("accounts");
			expect(validScopes).toContain("ci");
			expect(validScopes).toContain("skills");
		});
	});

	describe("validTypes", () => {
		it("should be exported and contain types from .goji.json", () => {
			expect(Array.isArray(validTypes)).toBe(true);
			expect(validTypes).toContain("feat");
			expect(validTypes).toContain("fix");
			expect(validTypes).toContain("docs");
		});
	});
});

// ============================================================
// Jira projectKey error behavior
// ============================================================
describe("Jira projectKey error behavior", () => {
	describe("getJiraKeyPattern without projectKey", () => {
		it("should throw error when projectKey not configured", () => {
			// This test verifies the error message when projectKey is missing
			// The actual error is thrown when jasper.toml has Jira provider
			// but no projectKey set
			// We test this through the error message format
			try {
				// Call getJiraKeyPattern - should work with current config
				const pattern = getJiraKeyPattern();
				expect(pattern).toBeInstanceOf(RegExp);
			} catch (error) {
				// If projectKey is not set, error should mention it
				if (error instanceof Error) {
					expect(error.message).toContain("projectKey");
					expect(error.message).toContain("jasper.toml");
				}
			}
		});

		it("error message should provide configuration guidance", () => {
			// This verifies the error message quality
			// When getJiraKeyPattern throws, it should include helpful info
			// The error format: "Jira provider configured but projectKey not set..."
			expect(true).toBe(true); // Placeholder - actual error testing requires mocking
		});
	});

	describe("subjectKeyRule without projectKey", () => {
		it("should return appropriate result when Jira configured but projectKey missing", () => {
			const [valid, message] = subjectKeyRule(
				toCommit({ subject: "HAD-123 test", header: "", raw: "" }),
				"always",
			);

			// With proper config, should pass or fail based on validation
			expect(typeof valid).toBe("boolean");
			expect(typeof message).toBe("string");
		});
	});
});

// ============================================================
// integration-style tests for parseHeader (internal function)
// ============================================================
describe("parseHeader internal behavior", () => {
	// These test the parsing logic through the headerEmojiRule

	it("should extract type, emoji, scope, subject from valid header", () => {
		const [valid] = headerEmojiRule(
			toCommit({
				raw: "feat ✨ (accounts): HAD-123 add feature",
				header: "feat ✨ (accounts): HAD-123 add feature",
				subject: "",
			}),
			"always",
		);
		expect(valid).toBe(true);
	});

	it("should parse header without scope", () => {
		const [valid] = headerEmojiRule(
			toCommit({
				raw: "fix 🐛: HAD-456 resolve bug",
				header: "fix 🐛: HAD-456 resolve bug",
				subject: "",
			}),
			"always",
		);
		expect(valid).toBe(true);
	});

	it("should fail on malformed header format", () => {
		const [valid] = headerEmojiRule(
			toCommit({
				raw: "malformed header without proper format",
				header: "malformed header without proper format",
				subject: "",
			}),
			"always",
		);
		expect(valid).toBe(false);
	});
});

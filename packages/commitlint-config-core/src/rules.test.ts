// Tests for provider-aware commit rules

import { describe, expect, it } from "bun:test";

// Import the actual rule
import {
	getResolvedConfig,
	headerEmojiRule,
	scopeCaseRule,
	subjectKeyRule,
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

describe("subjectKeyRule", () => {
	// Helper to call rule directly
	const lint = (subject: string | null | undefined) =>
		(subjectKeyRule as PluginRule)(
			toCommit({ subject: subject ?? null, header: "", raw: "" }),
			"always",
		);

	describe("with Jira provider (from jasper.toml)", () => {
		it("should pass commit with valid Jira key at start of subject", () => {
			const [valid] = lint("HAD-123 resolve bug");
			expect(valid).toBe(true);
		});

		it("should pass commit with Jira key only", () => {
			const [valid] = lint("HAD-999");
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

		it("should require subject to be present", () => {
			const [valid, message] = lint(null);
			expect(valid).toBe(false);
			expect(message).toContain("subject");
		});
	});

	describe("rule structure", () => {
		it("should be a function (commitlint plugin rule format)", () => {
			expect(typeof subjectKeyRule).toBe("function");
		});

		it("should return [boolean, string?] tuple", () => {
			const result = subjectKeyRule(
				{ subject: "test", header: "", raw: "" },
				"always",
			);
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(typeof result[0]).toBe("boolean");
		});
	});
});

describe("headerEmojiRule", () => {
	// Helper to call rule directly
	const lint = (raw: string | undefined) =>
		(headerEmojiRule as PluginRule)(
			{ raw: raw ?? "", header: raw ?? "", subject: "" },
			"always",
		);

	it("should pass commit with valid emoji", () => {
		const [valid] = lint("feat ✨: add new feature");
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

	it("should be a function (commitlint plugin rule format)", () => {
		expect(typeof headerEmojiRule).toBe("function");
	});
});

describe("scopeCaseRule", () => {
	// Helper to call rule directly
	const lint = (scope: string | null | undefined) =>
		(scopeCaseRule as PluginRule)(
			{ scope: scope ?? null, header: "", raw: "", subject: "" },
			"always",
		);

	it("should pass commit with lowercase scope", () => {
		const [valid] = lint("core");
		expect(valid).toBe(true);
	});

	it("should fail commit with uppercase scope", () => {
		const [valid, message] = lint("CORE");
		expect(valid).toBe(false);
		expect(message).toContain("lowercase");
	});

	it("should pass commit with no scope", () => {
		const [valid] = lint(null);
		expect(valid).toBe(true);
	});

	it("should pass commit with camelCase scope", () => {
		// camelCase like "coreAccounts" has uppercase in the middle, which should fail
		const [valid] = lint("coreAccounts");
		expect(valid).toBe(false);
	});

	it("should be a function (commitlint plugin rule format)", () => {
		expect(typeof scopeCaseRule).toBe("function");
	});
});

describe("provider info", () => {
	it("should expose getResolvedConfig for debugging", () => {
		const config = getResolvedConfig();
		expect(config).toHaveProperty("provider");
		expect(config).toHaveProperty("projectKey");
		expect(config).toHaveProperty("jiraKeyPattern");
	});

	it("should have jira provider from jasper.toml", () => {
		const config = getResolvedConfig();
		expect(config.provider).toBe("jira");
	});

	it("should have projectKey from jasper.toml", () => {
		const config = getResolvedConfig();
		expect(config.projectKey).toBe("HAD");
	});
});

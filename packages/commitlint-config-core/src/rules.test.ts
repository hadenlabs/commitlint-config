// Tests for provider-aware commit rules

import { describe, expect, it } from "bun:test";

// Import the actual rule
import {
	getResolvedConfig,
	headerEmojiRule,
	scopeCaseRule,
	subjectKeyRule,
} from "./plugin";

describe("subjectKeyRule", () => {
	describe("with Jira provider (from jasper.toml)", () => {
		it("should pass commit with valid Jira key at start of subject", () => {
			const rule = subjectKeyRule as unknown as {
				lint: (parsed: { subject?: string }) => [boolean, string];
			};
			const [valid] = rule.lint({ subject: "HAD-123 resolve bug" });
			expect(valid).toBe(true);
		});

		it("should pass commit with Jira key only", () => {
			const rule = subjectKeyRule as unknown as {
				lint: (parsed: { subject?: string }) => [boolean, string];
			};
			const [valid] = rule.lint({ subject: "HAD-999" });
			expect(valid).toBe(true);
		});

		it("should fail commit without Jira key", () => {
			const rule = subjectKeyRule as unknown as {
				lint: (parsed: { subject?: string }) => [boolean, string];
			};
			const [valid, message] = rule.lint({ subject: "resolve bug" });
			expect(valid).toBe(false);
			expect(message).toContain("must start with");
		});

		it("should fail commit with wrong project key", () => {
			const rule = subjectKeyRule as unknown as {
				lint: (parsed: { subject?: string }) => [boolean, string];
			};
			const [valid] = rule.lint({ subject: "AR-123 wrong key" });
			expect(valid).toBe(false);
		});

		it("should fail commit with Jira key not at start", () => {
			const rule = subjectKeyRule as unknown as {
				lint: (parsed: { subject?: string }) => [boolean, string];
			};
			const [valid] = rule.lint({ subject: "fix HAD-123 bug" });
			expect(valid).toBe(false);
		});

		it("should require subject to be present", () => {
			const rule = subjectKeyRule as unknown as {
				lint: (parsed: { subject?: string }) => [boolean, string];
			};
			const [valid, message] = rule.lint({
				subject: undefined as unknown as string,
			});
			expect(valid).toBe(false);
			expect(message).toContain("subject");
		});
	});

	describe("rule description", () => {
		it("should include project key in description for Jira provider", () => {
			const description = (subjectKeyRule as unknown as { description: string })
				.description;
			expect(description).toContain("HAD-");
		});

		it("should include example in ex() for Jira provider", () => {
			const example = (subjectKeyRule as unknown as { ex: () => string }).ex();
			expect(example).toContain("HAD-");
		});
	});
});

describe("headerEmojiRule", () => {
	it("should pass commit with valid emoji", () => {
		const rule = headerEmojiRule as unknown as {
			lint: (parsed: { raw?: string }) => [boolean, string];
		};
		const [valid] = rule.lint({ raw: "feat ✨: add new feature" });
		expect(valid).toBe(true);
	});

	it("should pass commit with any valid emoji from policy", () => {
		const rule = headerEmojiRule as unknown as {
			lint: (parsed: { raw?: string }) => [boolean, string];
		};
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
			const [valid] = rule.lint({ raw: `feat ${emoji}: add feature` });
			expect(valid).toBe(true);
		}
	});

	it("should fail commit with invalid emoji", () => {
		const rule = headerEmojiRule as unknown as {
			lint: (parsed: { raw?: string }) => [boolean, string];
		};
		const [valid, message] = rule.lint({ raw: "feat ❌: invalid emoji" });
		expect(valid).toBe(false);
		expect(message).toContain("emoji");
	});

	it("should fail commit with no emoji", () => {
		const rule = headerEmojiRule as unknown as {
			lint: (parsed: { raw?: string }) => [boolean, string];
		};
		const [valid, message] = rule.lint({ raw: "feat: add feature" });
		expect(valid).toBe(false);
		expect(message).toContain("emoji");
	});

	it("should fail commit with no header", () => {
		const rule = headerEmojiRule as unknown as {
			lint: (parsed: { raw?: string }) => [boolean, string];
		};
		const [valid, message] = rule.lint({ raw: undefined as unknown as string });
		expect(valid).toBe(false);
		expect(message).toContain("header");
	});

	it("should include example in ex()", () => {
		const example = (headerEmojiRule as unknown as { ex: () => string }).ex();
		expect(example).toContain("✨");
	});
});

describe("scopeCaseRule", () => {
	it("should pass commit with lowercase scope", () => {
		const rule = scopeCaseRule as unknown as {
			lint: (parsed: { scope?: string }) => [boolean, string];
		};
		const [valid] = rule.lint({ scope: "core" });
		expect(valid).toBe(true);
	});

	it("should fail commit with uppercase scope", () => {
		const rule = scopeCaseRule as unknown as {
			lint: (parsed: { scope?: string }) => [boolean, string];
		};
		const [valid, message] = rule.lint({ scope: "CORE" });
		expect(valid).toBe(false);
		expect(message).toContain("lowercase");
	});

	it("should pass commit with no scope", () => {
		const rule = scopeCaseRule as unknown as {
			lint: (parsed: { scope?: string }) => [boolean, string];
		};
		const [valid] = rule.lint({ scope: undefined as unknown as string });
		expect(valid).toBe(true);
	});

	it("should pass commit with camelCase scope", () => {
		const rule = scopeCaseRule as unknown as {
			lint: (parsed: { scope?: string }) => [boolean, string];
		};
		// camelCase like "coreAccounts" has uppercase in the middle, which should fail
		const [valid] = rule.lint({ scope: "coreAccounts" });
		expect(valid).toBe(false);
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

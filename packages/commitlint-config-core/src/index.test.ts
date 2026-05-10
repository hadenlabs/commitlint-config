import { describe, it, expect } from "bun:test";
import type { ParserPreset } from "@commitlint/types";
import config from "./index";
import { subjectJiraRule, headerEmojiRule } from "./plugin";

// Type guard for parserPreset - narrow to object form only
const parserPreset = config.parserPreset as ParserPreset | undefined;
const isParserPresetObject = (preset: ParserPreset | undefined): preset is { parserOpts: { headerPattern: RegExp; headerCorrespondence: string[] } } => {
	return typeof preset === "object" && preset !== null && "parserOpts" in preset;
};

// Type guard for plugin
const isPlugin = (p: unknown): p is { rules: Record<string, unknown> } => {
	return typeof p === "object" && p !== null && p !== undefined && "rules" in p;
};

describe("commitlint-config-core", () => {
	describe("plugins", () => {
		it("should have plugin with custom rules", () => {
			expect(config.plugins).toBeDefined();
			expect(config.plugins?.length).toBeGreaterThan(0);
			const p = config.plugins?.[0];
			expect(isPlugin(p)).toBe(true);
		});

		it("should export subject-jira rule in plugin", () => {
			const p = config.plugins?.[0] as { rules?: Record<string, unknown> } | undefined;
			expect(p?.rules).toBeDefined();
			expect(p?.rules?.["subject-jira"]).toBeDefined();
			expect(typeof p?.rules?.["subject-jira"]).toBe("object");
		});

		it("should export header-emoji rule in plugin", () => {
			const p = config.plugins?.[0] as { rules?: Record<string, unknown> } | undefined;
			expect(p?.rules).toBeDefined();
			expect(p?.rules?.["header-emoji"]).toBeDefined();
			expect(typeof p?.rules?.["header-emoji"]).toBe("object");
		});
	});

	describe("subject-jira-rule", () => {
		it("should pass commit with valid Jira key at start of subject", () => {
			const rule = subjectJiraRule as unknown as { lint: (parsed: { subject: string }) => [boolean, string] };
			const [valid] = rule.lint({ subject: "HAD-123 resolve bug" });
			expect(valid).toBe(true);
		});

		it("should pass commit with Jira key only (no additional text)", () => {
			const rule = subjectJiraRule as unknown as { lint: (parsed: { subject: string }) => [boolean, string] };
			const [valid] = rule.lint({ subject: "HAD-999" });
			expect(valid).toBe(true);
		});

		it("should fail commit without Jira key", () => {
			const rule = subjectJiraRule as unknown as { lint: (parsed: { subject: string }) => [boolean, string] };
			const [valid, message] = rule.lint({ subject: "resolve bug" });
			expect(valid).toBe(false);
			expect(message).toContain("HAD-<number>");
		});

		it("should fail commit with Jira key not at start", () => {
			const rule = subjectJiraRule as unknown as { lint: (parsed: { subject: string }) => [boolean, string] };
			const [valid, message] = rule.lint({ subject: "fix HAD-123 bug" });
			expect(valid).toBe(false);
			// Message should indicate the Jira key is not at start
			expect(message).toContain("must start");
		});

		it("should fail commit with invalid Jira key format", () => {
			const rule = subjectJiraRule as unknown as { lint: (parsed: { subject: string }) => [boolean, string] };
			const [valid] = rule.lint({ subject: "ABC-123 bad key" });
			expect(valid).toBe(false);
		});

		it("should fail commit with no subject", () => {
			const rule = subjectJiraRule as unknown as { lint: (parsed: { subject?: string }) => [boolean, string] };
			const [valid, message] = rule.lint({ subject: undefined as unknown as string });
			expect(valid).toBe(false);
			expect(message).toContain("subject");
		});
	});

	describe("header-emoji-rule", () => {
		it("should pass commit with valid emoji", () => {
			const rule = headerEmojiRule as unknown as { lint: (parsed: { raw?: string }) => [boolean, string] };
			const [valid] = rule.lint({ raw: "feat ✨: add new feature" });
			expect(valid).toBe(true);
		});

		it("should pass commit with any valid emoji from policy", () => {
			const rule = headerEmojiRule as unknown as { lint: (parsed: { raw?: string }) => [boolean, string] };
			const emojis = [
				"✨", "🐛", "📚", "🎨", "💄", "🧹", "🧪", "🚑", "⚰", "⚡", "🚧",
				"🛠", "📦", "🔍", "⏪", "👷", "📝",
			];
			for (const emoji of emojis) {
				const [valid] = rule.lint({ raw: `feat ${emoji}: add feature` });
				expect(valid).toBe(true);
			}
		});

		it("should fail commit with invalid emoji", () => {
			const rule = headerEmojiRule as unknown as { lint: (parsed: { raw?: string }) => [boolean, string] };
			const [valid, message] = rule.lint({ raw: "feat ❌: invalid emoji" });
			expect(valid).toBe(false);
			expect(message).toContain("emoji");
		});

		it("should fail commit with no emoji", () => {
			const rule = headerEmojiRule as unknown as { lint: (parsed: { raw?: string }) => [boolean, string] };
			const [valid, message] = rule.lint({ raw: "feat: add feature" });
			expect(valid).toBe(false);
			expect(message).toContain("emoji");
		});

		it("should fail commit with no header", () => {
			const rule = headerEmojiRule as unknown as { lint: (parsed: { raw?: string }) => [boolean, string] };
			const [valid, message] = rule.lint({ raw: undefined as unknown as string });
			expect(valid).toBe(false);
			expect(message).toContain("header");
		});
	});

	describe("parserPreset", () => {
		it("should have parserPreset configured", () => {
			expect(config.parserPreset).toBeDefined();
		});

		it("should have headerCorrespondence as type, emoji, scope, subject", () => {
			if (!isParserPresetObject(parserPreset)) {
				throw new Error("parserPreset is not an object");
			}
			const correspondence = parserPreset.parserOpts.headerCorrespondence;
			expect(correspondence).toEqual(["type", "emoji", "scope", "subject"]);
		});

		it("should parse commit header with emoji format correctly", () => {
			if (!isParserPresetObject(parserPreset)) {
				throw new Error("parserPreset is not an object");
			}
			const pattern = parserPreset.parserOpts.headerPattern;
			const testCases = [
				// With emoji format: <type> <emoji> (<scope>): <subject>
				{ input: "feat ✨: add new feature", expected: { type: "feat", emoji: "✨", scope: undefined, subject: "add new feature" } },
				{ input: "feat ✨ (core): add new feature", expected: { type: "feat", emoji: "✨", scope: "core", subject: "add new feature" } },
				{ input: "fix 🐛 (accounts): HAD-123 resolve bug", expected: { type: "fix", emoji: "🐛", scope: "accounts", subject: "HAD-123 resolve bug" } },
				{ input: "docs 📚 (ci): HAD-456 update documentation", expected: { type: "docs", emoji: "📚", scope: "ci", subject: "HAD-456 update documentation" } },
				{ input: "wip 🚧 (skills): HAD-789 work in progress", expected: { type: "wip", emoji: "🚧", scope: "skills", subject: "HAD-789 work in progress" } },
			];

			for (const { input, expected } of testCases) {
				const match = input.match(pattern);
				expect(match).not.toBeNull();
				if (match) {
					const [, type, emoji, scope, subject] = match;
					expect(type).toBe(expected.type);
					expect(emoji).toBe(expected.emoji);
					expect(scope ?? undefined).toBe(expected.scope);
					expect(subject).toEqual(expected.subject);
				}
			}
		});
	});

	describe("rules", () => {
		it("should have type-enum rule with correct commit types", () => {
			const typeEnum = config.rules?.["type-enum"] as [number, string, string[]] | undefined;
			expect(typeEnum).toBeDefined();
			expect(typeEnum?.[0]).toBe(2); // severity
			expect(typeEnum?.[1]).toBe("always");
			expect(typeEnum?.[2]).toContain("feat");
			expect(typeEnum?.[2]).toContain("fix");
			expect(typeEnum?.[2]).toContain("docs");
			expect(typeEnum?.[2]).toContain("refactor");
			expect(typeEnum?.[2]).toContain("test");
			expect(typeEnum?.[2]).toContain("chore");
			expect(typeEnum?.[2]).toContain("build");
			expect(typeEnum?.[2]).toContain("ci");
			expect(typeEnum?.[2]).toContain("perf");
			expect(typeEnum?.[2]).toContain("revert");
			expect(typeEnum?.[2]).toContain("style");
			expect(typeEnum?.[2]).toContain("hotfix");
			expect(typeEnum?.[2]).toContain("sample");
			expect(typeEnum?.[2]).toContain("package");
			expect(typeEnum?.[2]).toContain("wip");
			expect(typeEnum?.[2]).toContain("deprecate");
			expect(typeEnum?.[2]).toContain("prompt");
		});

		it("should have header-max-length rule with 100 character limit (from jasper.toml/.goji.json)", () => {
			const headerMaxLength = config.rules?.["header-max-length"] as [number, string, number] | undefined;
			expect(headerMaxLength).toBeDefined();
			expect(headerMaxLength?.[0]).toBe(2);
			expect(headerMaxLength?.[1]).toBe("always");
			expect(headerMaxLength?.[2]).toBe(100);
		});

		it("should have scope-enum rule with valid scopes from .goji.json", () => {
			const scopeEnum = config.rules?.["scope-enum"] as [number, string, string[]] | undefined;
			expect(scopeEnum).toBeDefined();
			expect(scopeEnum?.[0]).toBe(2);
			expect(scopeEnum?.[1]).toBe("always");
			expect(scopeEnum?.[2]).toContain("core");
			expect(scopeEnum?.[2]).toContain("accounts");
			expect(scopeEnum?.[2]).toContain("ci");
			expect(scopeEnum?.[2]).toContain("skills");
		});

		it("should have subject-jira rule defined in config", () => {
			const subjectJira = config.rules?.["subject-jira"];
			expect(subjectJira).toBeDefined();
			expect(subjectJira?.[0]).toBe(2);
			expect(subjectJira?.[1]).toBe("always");
		});

		it("should have header-emoji rule", () => {
			const headerEmoji = config.rules?.["header-emoji"] as [number, string, string[]] | undefined;
			expect(headerEmoji).toBeDefined();
			expect(headerEmoji?.[0]).toBe(2);
			expect(headerEmoji?.[1]).toBe("always");
		});

		it("should have subject-empty rule", () => {
			const subjectEmpty = config.rules?.["subject-empty"] as [number, string] | undefined;
			expect(subjectEmpty).toBeDefined();
			expect(subjectEmpty?.[0]).toBe(2);
			expect(subjectEmpty?.[1]).toBe("never");
		});

		it("should have type-empty rule", () => {
			const typeEmpty = config.rules?.["type-empty"] as [number, string] | undefined;
			expect(typeEmpty).toBeDefined();
			expect(typeEmpty?.[0]).toBe(2);
			expect(typeEmpty?.[1]).toBe("never");
		});

		it("should have body-leading-blank rule", () => {
			const bodyLeadingBlank = config.rules?.["body-leading-blank"] as [number, string] | undefined;
			expect(bodyLeadingBlank).toBeDefined();
			expect(bodyLeadingBlank?.[0]).toBe(2);
			expect(bodyLeadingBlank?.[1]).toBe("always");
		});

		it("should have footer-leading-blank rule", () => {
			const footerLeadingBlank = config.rules?.["footer-leading-blank"] as [number, string] | undefined;
			expect(footerLeadingBlank).toBeDefined();
			expect(footerLeadingBlank?.[0]).toBe(2);
			expect(footerLeadingBlank?.[1]).toBe("always");
		});

		it("should have subject-case rule", () => {
			const subjectCase = config.rules?.["subject-case"] as [number, string, string[]] | undefined;
			expect(subjectCase).toBeDefined();
			expect(subjectCase?.[0]).toBe(2);
			expect(subjectCase?.[1]).toBe("never");
			expect(subjectCase?.[2]).toContain("start-case");
			expect(subjectCase?.[2]).toContain("pascal-case");
			expect(subjectCase?.[2]).toContain("upper-case");
		});

		it("should have type-case rule", () => {
			const typeCase = config.rules?.["type-case"] as [number, string, string] | undefined;
			expect(typeCase).toBeDefined();
			expect(typeCase?.[0]).toBe(2);
			expect(typeCase?.[1]).toBe("always");
			expect(typeCase?.[2]).toBe("lower-case");
		});

		it("should have scope-case rule", () => {
			const scopeCase = config.rules?.["scope-case"] as [number, string, string] | undefined;
			expect(scopeCase).toBeDefined();
			expect(scopeCase?.[0]).toBe(2);
			expect(scopeCase?.[1]).toBe("always");
			expect(scopeCase?.[2]).toBe("lower-case");
		});

		it("should have subject-full-stop rule", () => {
			const subjectFullStop = config.rules?.["subject-full-stop"] as [number, string, string] | undefined;
			expect(subjectFullStop).toBeDefined();
			expect(subjectFullStop?.[0]).toBe(2);
			expect(subjectFullStop?.[1]).toBe("never");
			expect(subjectFullStop?.[2]).toBe(".");
		});

		it("should have subject-exclamation-mark rule", () => {
			const subjectExclamationMark = config.rules?.["subject-exclamation-mark"] as [number, string] | undefined;
			expect(subjectExclamationMark).toBeDefined();
			expect(subjectExclamationMark?.[0]).toBe(2);
			expect(subjectExclamationMark?.[1]).toBe("never");
		});
	});
});
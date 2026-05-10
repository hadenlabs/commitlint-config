// Tests for commitlint-config-core index (main config export)

import { describe, expect, it } from "bun:test";
import type { ParserPreset } from "@commitlint/types";
import config, { providerInfo } from "./index";

// Type guard for parserPreset
const parserPreset = config.parserPreset as ParserPreset | undefined;
const isParserPresetObject = (
	preset: ParserPreset | undefined,
): preset is {
	parserOpts: { headerPattern: RegExp; headerCorrespondence: string[] };
} => {
	return (
		typeof preset === "object" && preset !== null && "parserOpts" in preset
	);
};

// Type guard for plugin
const isPlugin = (p: unknown): p is { rules: Record<string, unknown> } => {
	return typeof p === "object" && p !== null && "rules" in p;
};

describe("commitlint-config-core", () => {
	describe("provider info", () => {
		it("should export provider info for debugging", () => {
			expect(providerInfo).toBeDefined();
			expect(providerInfo.provider).toBeDefined();
		});

		it("should have correct provider from jasper.toml", () => {
			// From jasper.toml: issueTracking.provider = "jira"
			expect(providerInfo.provider).toBe("jira");
		});

		it("should have projectKey from jasper.toml", () => {
			expect(providerInfo.projectKey).toBe("HAD");
		});

		it("should have correct Jira key pattern", () => {
			expect(providerInfo.jiraKeyPattern).toBe("^HAD-[0-9]+");
		});

		it("should include scope count", () => {
			expect(providerInfo.scopeCount).toBeGreaterThan(0);
		});

		it("should include type count", () => {
			expect(providerInfo.typeCount).toBeGreaterThan(0);
		});
	});

	describe("plugins", () => {
		it("should have plugin with custom rules", () => {
			expect(config.plugins).toBeDefined();
			expect(config.plugins?.length).toBeGreaterThan(0);
			const p = config.plugins?.[0];
			expect(isPlugin(p)).toBe(true);
		});

		it("should export subject-key rule in plugin (renamed from subject-jira)", () => {
			const p = config.plugins?.[0] as
				| { rules?: Record<string, unknown> }
				| undefined;
			expect(p?.rules).toBeDefined();
			expect(p?.rules?.["subject-key"]).toBeDefined();
			expect(typeof p?.rules?.["subject-key"]).toBe("function");
		});

		it("should export header-emoji rule in plugin", () => {
			const p = config.plugins?.[0] as
				| { rules?: Record<string, unknown> }
				| undefined;
			expect(p?.rules).toBeDefined();
			expect(p?.rules?.["header-emoji"]).toBeDefined();
			expect(typeof p?.rules?.["header-emoji"]).toBe("function");
		});

		it("should export scope-case-custom rule in plugin", () => {
			const p = config.plugins?.[0] as
				| { rules?: Record<string, unknown> }
				| undefined;
			expect(p?.rules).toBeDefined();
			expect(p?.rules?.["scope-case-custom"]).toBeDefined();
			expect(typeof p?.rules?.["scope-case-custom"]).toBe("function");
		});

		it("should export header-emoji rule in plugin", () => {
			const p = config.plugins?.[0] as
				| { rules?: Record<string, unknown> }
				| undefined;
			expect(p?.rules).toBeDefined();
			expect(p?.rules?.["header-emoji"]).toBeDefined();
			expect(typeof p?.rules?.["header-emoji"]).toBe("function");
		});

		it("should export scope-case-custom rule in plugin", () => {
			const p = config.plugins?.[0] as
				| { rules?: Record<string, unknown> }
				| undefined;
			expect(p?.rules).toBeDefined();
			expect(p?.rules?.["scope-case-custom"]).toBeDefined();
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
				{
					input: "feat ✨: add new feature",
					expected: {
						type: "feat",
						emoji: "✨",
						scope: undefined,
						subject: "add new feature",
					},
				},
				{
					input: "feat ✨ (core): add new feature",
					expected: {
						type: "feat",
						emoji: "✨",
						scope: "core",
						subject: "add new feature",
					},
				},
				{
					input: "fix 🐛 (accounts): HAD-123 resolve bug",
					expected: {
						type: "fix",
						emoji: "🐛",
						scope: "accounts",
						subject: "HAD-123 resolve bug",
					},
				},
				{
					input: "docs 📚 (ci): HAD-456 update documentation",
					expected: {
						type: "docs",
						emoji: "📚",
						scope: "ci",
						subject: "HAD-456 update documentation",
					},
				},
				{
					input: "wip 🚧 (skills): HAD-789 work in progress",
					expected: {
						type: "wip",
						emoji: "🚧",
						scope: "skills",
						subject: "HAD-789 work in progress",
					},
				},
			];

			for (const { input, expected } of testCases) {
				const match = input.match(pattern);
				expect(match).not.toBeNull();
				if (match) {
					const [, type, emoji, scope, subject] = match;
					expect(type).toBe(expected.type);
					expect(emoji).toBe(expected.emoji);
					if (expected.scope === undefined) {
						expect(scope ?? undefined).toBeUndefined();
					} else {
						expect(scope ?? undefined).toEqual(expected.scope);
					}
					expect(subject).toEqual(expected.subject);
				}
			}
		});
	});

	describe("rules", () => {
		it("should have type-enum rule with correct commit types from .goji.json", () => {
			const typeEnum = config.rules?.["type-enum"] as
				| [number, string, string[]]
				| undefined;
			expect(typeEnum).toBeDefined();
			expect(typeEnum?.[0]).toBe(2);
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

		it("should have header-max-length rule with configured max length", () => {
			const headerMaxLength = config.rules?.["header-max-length"] as
				| [number, string, number]
				| undefined;
			expect(headerMaxLength).toBeDefined();
			expect(headerMaxLength?.[0]).toBe(2);
			expect(headerMaxLength?.[1]).toBe("always");
			// From jasper.toml: subjectMaxLength = 100 (may be BigInt)
			const maxLen =
				typeof headerMaxLength?.[2] === "bigint"
					? Number(headerMaxLength?.[2])
					: headerMaxLength?.[2];
			expect(maxLen).toBe(100);
		});

		it("should have scope-enum rule NOT enforced (scopes are informational only)", () => {
			// New policy: scope-enum is not applied
			// Scopes from jasper.toml are for reference only
			// Undeclared scopes will NOT cause commit failures
			const scopeEnum = config.rules?.["scope-enum"] as
				| [number, string, string[]]
				| undefined;
			// scope-enum should be undefined (not configured)
			expect(scopeEnum).toBeUndefined();
		});

		it("should still have scope-case rule for lowercase validation", () => {
			const scopeCase = config.rules?.["scope-case"] as
				| [number, string, string]
				| undefined;
			expect(scopeCase).toBeDefined();
			expect(scopeCase?.[0]).toBe(2);
			expect(scopeCase?.[1]).toBe("always");
			expect(scopeCase?.[2]).toBe("lower-case");
		});

		it("should expose scopeEnumEnforced = false in providerInfo", () => {
			expect(providerInfo).toHaveProperty("scopeEnumEnforced");
			expect(providerInfo.scopeEnumEnforced).toBe(false);
		});

		it("should have subject-key rule defined in config (provider-aware)", () => {
			const subjectKey = config.rules?.["subject-key"];
			expect(subjectKey).toBeDefined();
			expect(subjectKey?.[0]).toBe(2);
			expect(subjectKey?.[1]).toBe("always");
		});

		it("should have header-emoji rule", () => {
			const headerEmoji = config.rules?.["header-emoji"] as
				| [number, string, string[]]
				| undefined;
			expect(headerEmoji).toBeDefined();
			expect(headerEmoji?.[0]).toBe(2);
			expect(headerEmoji?.[1]).toBe("always");
		});

		it("should have subject-empty rule", () => {
			const subjectEmpty = config.rules?.["subject-empty"] as
				| [number, string]
				| undefined;
			expect(subjectEmpty).toBeDefined();
			expect(subjectEmpty?.[0]).toBe(2);
			expect(subjectEmpty?.[1]).toBe("never");
		});

		it("should have type-empty rule", () => {
			const typeEmpty = config.rules?.["type-empty"] as
				| [number, string]
				| undefined;
			expect(typeEmpty).toBeDefined();
			expect(typeEmpty?.[0]).toBe(2);
			expect(typeEmpty?.[1]).toBe("never");
		});

		it("should have body-leading-blank rule", () => {
			const bodyLeadingBlank = config.rules?.["body-leading-blank"] as
				| [number, string]
				| undefined;
			expect(bodyLeadingBlank).toBeDefined();
			expect(bodyLeadingBlank?.[0]).toBe(2);
			expect(bodyLeadingBlank?.[1]).toBe("always");
		});

		it("should have footer-leading-blank rule", () => {
			const footerLeadingBlank = config.rules?.["footer-leading-blank"] as
				| [number, string]
				| undefined;
			expect(footerLeadingBlank).toBeDefined();
			expect(footerLeadingBlank?.[0]).toBe(2);
			expect(footerLeadingBlank?.[1]).toBe("always");
		});

		it("should have subject-case rule", () => {
			const subjectCase = config.rules?.["subject-case"] as
				| [number, string, string[]]
				| undefined;
			expect(subjectCase).toBeDefined();
			expect(subjectCase?.[0]).toBe(2);
			expect(subjectCase?.[1]).toBe("never");
			expect(subjectCase?.[2]).toContain("start-case");
			expect(subjectCase?.[2]).toContain("pascal-case");
			expect(subjectCase?.[2]).toContain("upper-case");
		});

		it("should have type-case rule", () => {
			const typeCase = config.rules?.["type-case"] as
				| [number, string, string]
				| undefined;
			expect(typeCase).toBeDefined();
			expect(typeCase?.[0]).toBe(2);
			expect(typeCase?.[1]).toBe("always");
			expect(typeCase?.[2]).toBe("lower-case");
		});

		it("should have scope-case rule", () => {
			const scopeCase = config.rules?.["scope-case"] as
				| [number, string, string]
				| undefined;
			expect(scopeCase).toBeDefined();
			expect(scopeCase?.[0]).toBe(2);
			expect(scopeCase?.[1]).toBe("always");
			expect(scopeCase?.[2]).toBe("lower-case");
		});

		it("should have subject-full-stop rule", () => {
			const subjectFullStop = config.rules?.["subject-full-stop"] as
				| [number, string, string]
				| undefined;
			expect(subjectFullStop).toBeDefined();
			expect(subjectFullStop?.[0]).toBe(2);
			expect(subjectFullStop?.[1]).toBe("never");
			expect(subjectFullStop?.[2]).toBe(".");
		});

		it("should have subject-exclamation-mark rule", () => {
			const subjectExclamationMark = config.rules?.[
				"subject-exclamation-mark"
			] as [number, string] | undefined;
			expect(subjectExclamationMark).toBeDefined();
			expect(subjectExclamationMark?.[0]).toBe(2);
			expect(subjectExclamationMark?.[1]).toBe("never");
		});
	});
});

// Tests for commitlint-config-core flat config

import { describe, expect, it } from "bun:test";
import type { ParserPreset } from "@commitlint/types";
import config from "./index";

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

describe("commitlint-config-core flat config", () => {
	describe("parserPreset", () => {
		it("should have parserPreset configured", () => {
			expect(config.parserPreset).toBeDefined();
		});

		it("should have headerCorrespondence as type, scope, subject", () => {
			if (!isParserPresetObject(parserPreset)) {
				throw new Error("parserPreset is not an object");
			}
			const correspondence = parserPreset.parserOpts.headerCorrespondence;
			expect(correspondence).toEqual(["type", "scope", "subject"]);
		});

		it("should have correct headerPattern", () => {
			if (!isParserPresetObject(parserPreset)) {
				throw new Error("parserPreset is not an object");
			}
			const pattern = parserPreset.parserOpts.headerPattern;
			// Test pattern matches expected format with emoji support
			expect(pattern.source).toBe(
				"^(\\w+)(?:\\s+[\\p{Emoji_Presentation}\\p{Extended_Pictographic}])?(?:\\s*\\((.*?)\\))?:\\s*(.*)$",
			);
		});

		it("should parse commit header correctly", () => {
			if (!isParserPresetObject(parserPreset)) {
				throw new Error("parserPreset is not an object");
			}
			const pattern = parserPreset.parserOpts.headerPattern;
			const testCases = [
				// Format: <type>(<scope>): <subject>
				{
					input: "feat: add new feature",
					expected: {
						type: "feat",
						scope: undefined,
						subject: "add new feature",
					},
				},
				{
					input: "feat(core): add new feature",
					expected: {
						type: "feat",
						scope: "core",
						subject: "add new feature",
					},
				},
				{
					input: "fix(accounts): resolve bug",
					expected: {
						type: "fix",
						scope: "accounts",
						subject: "resolve bug",
					},
				},
				{
					input: "docs(ci): update documentation",
					expected: {
						type: "docs",
						scope: "ci",
						subject: "update documentation",
					},
				},
				// Format with emoji: <type> <emoji> (<scope>): <subject>
				{
					input: "feat ✨ (core): add feature",
					expected: {
						type: "feat",
						scope: "core",
						subject: "add feature",
					},
				},
				{
					input: "fix 🔧 (auth): resolve issue",
					expected: {
						type: "fix",
						scope: "auth",
						subject: "resolve issue",
					},
				},
				{
					input: "docs 📚 (api): update guide",
					expected: {
						type: "docs",
						scope: "api",
						subject: "update guide",
					},
				},
				// Emoji format without scope
				{
					input: "chore 🔄: update dependencies",
					expected: {
						type: "chore",
						scope: undefined,
						subject: "update dependencies",
					},
				},
			];

			for (const { input, expected } of testCases) {
				const match = input.match(pattern);
				expect(match).not.toBeNull();
				if (match) {
					const [, type, scope, subject] = match;
					expect(type).toBe(expected.type);
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
		it("should have body-leading-blank rule", () => {
			const rule = config.rules?.["body-leading-blank"] as
				| [number, string]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("always");
		});

		it("should have footer-leading-blank rule", () => {
			const rule = config.rules?.["footer-leading-blank"] as
				| [number, string]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("always");
		});

		it("should have header-max-length rule with 80", () => {
			const rule = config.rules?.["header-max-length"] as
				| [number, string, number]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("always");
			expect(rule?.[2]).toBe(80);
		});

		it("should have scope-case rule", () => {
			const rule = config.rules?.["scope-case"] as
				| [number, string, string]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("always");
			expect(rule?.[2]).toBe("lower-case");
		});

		it("should have subject-case rule", () => {
			const rule = config.rules?.["subject-case"] as
				| [number, string, string[]]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("never");
			expect(rule?.[2]).toContain("start-case");
			expect(rule?.[2]).toContain("pascal-case");
			expect(rule?.[2]).toContain("upper-case");
		});

		it("should have subject-empty rule", () => {
			const rule = config.rules?.["subject-empty"] as
				| [number, string]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("never");
		});

		it("should have subject-exclamation-mark rule", () => {
			const rule = config.rules?.["subject-exclamation-mark"] as
				| [number, string]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("never");
		});

		it("should have subject-full-stop rule", () => {
			const rule = config.rules?.["subject-full-stop"] as
				| [number, string, string]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("never");
			expect(rule?.[2]).toBe(".");
		});

		it("should have type-case rule", () => {
			const rule = config.rules?.["type-case"] as
				| [number, string, string]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("always");
			expect(rule?.[2]).toBe("lower-case");
		});

		it("should have type-empty rule", () => {
			const rule = config.rules?.["type-empty"] as
				| [number, string]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("never");
		});

		it("should have type-enum rule with commit types", () => {
			const rule = config.rules?.["type-enum"] as
				| [number, string, string[]]
				| undefined;
			expect(rule).toBeDefined();
			expect(rule?.[0]).toBe(2);
			expect(rule?.[1]).toBe("always");
			expect(rule?.[2]).toContain("feat");
			expect(rule?.[2]).toContain("fix");
			expect(rule?.[2]).toContain("docs");
			expect(rule?.[2]).toContain("refactor");
			expect(rule?.[2]).toContain("chore");
			expect(rule?.[2]).toContain("test");
		});
	});
});
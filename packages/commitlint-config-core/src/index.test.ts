import { describe, it, expect } from "bun:test";
import type { ParserPreset } from "@commitlint/types";
import config from "./index";

// Type guard for parserPreset - narrow to object form only
const parserPreset = config.parserPreset as ParserPreset | undefined;
const isParserPresetObject = (preset: ParserPreset | undefined): preset is { parserOpts: { headerPattern: RegExp; headerCorrespondence: string[] } } => {
	return typeof preset === "object" && preset !== null && "parserOpts" in preset;
};

describe("commitlint-config-core", () => {
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

		it("should parse standard commit header correctly", () => {
			if (!isParserPresetObject(parserPreset)) {
				throw new Error("parserPreset is not an object");
			}
			const pattern = parserPreset.parserOpts.headerPattern;
			const testCases = [
				{ input: "feat: add new feature", expected: { type: "feat", scope: undefined, subject: "add new feature" } },
				{ input: "feat(core): add new feature", expected: { type: "feat", scope: "core", subject: "add new feature" } },
				{ input: "fix: resolve bug", expected: { type: "fix", scope: undefined, subject: "resolve bug" } },
				{ input: "docs(readme): update documentation", expected: { type: "docs", scope: "readme", subject: "update documentation" } },
			];

			for (const { input, expected } of testCases) {
				const match = input.match(pattern);
				expect(match).not.toBeNull();
				if (match) {
					const [, type, scope, subject] = match;
					expect(type).toBe(expected.type);
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
		});

		it("should have header-max-length rule with 80 character limit", () => {
			const headerMaxLength = config.rules?.["header-max-length"] as [number, string, number] | undefined;
			expect(headerMaxLength).toBeDefined();
			expect(headerMaxLength?.[0]).toBe(2);
			expect(headerMaxLength?.[1]).toBe("always");
			expect(headerMaxLength?.[2]).toBe(80);
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
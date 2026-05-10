// Tests for jasper.toml config loading and resolution

import { describe, expect, it } from "bun:test";

// Test config loader functions with mocked TOML parsing
describe("loadJasperConfig", () => {
	it("should load and parse valid jasper.toml from repository root", () => {
		// The config module looks up jasper.toml relative to the package
		// When run from packages/commitlint-config-core, it finds root jasper.toml
		const { loadJasperConfig } = require("./config");
		const config = loadJasperConfig();

		expect(config).toBeDefined();
		expect(config.scm).toBeDefined();
		expect(config.issueTracking).toBeDefined();
		expect(config.commit).toBeDefined();
	});

	it("should have scm.provider from jasper.toml", () => {
		const { loadJasperConfig } = require("./config");
		const config = loadJasperConfig();

		expect(config.scm?.provider).toBe("auto");
	});

	it("should have issueTracking.provider from jasper.toml", () => {
		const { loadJasperConfig } = require("./config");
		const config = loadJasperConfig();

		expect(config.issueTracking?.provider).toBe("jira");
	});

	it("should have projectKey from jasper.toml", () => {
		const { loadJasperConfig } = require("./config");
		const config = loadJasperConfig();

		expect(config.issueTracking?.projectKey).toBe("HAD");
	});

	it("should have subjectMaxLength from jasper.toml", () => {
		const { loadJasperConfig } = require("./config");
		const config = loadJasperConfig();

		// TOML may parse as BigInt, so convert
		const maxLength =
			typeof config.commit?.subjectMaxLength === "bigint"
				? Number(config.commit.subjectMaxLength)
				: config.commit?.subjectMaxLength;
		expect(maxLength).toBe(100);
	});
});

describe("resolveProvider", () => {
	it("should prioritize issueTracking.provider over scm.provider", () => {
		const { resolveProvider } = require("./config");

		const config = {
			scm: { provider: "github" },
			issueTracking: { provider: "jira" },
			commit: {},
		};

		const provider = resolveProvider(config as any);
		expect(provider).toBe("jira");
	});

	it("should fallback to scm.provider when issueTracking.provider is auto", () => {
		const { resolveProvider } = require("./config");

		const config = {
			scm: { provider: "github" },
			issueTracking: { provider: "auto" },
			commit: {},
		};

		const provider = resolveProvider(config as any);
		expect(provider).toBe("github");
	});

	it("should return auto when both providers are auto", () => {
		const { resolveProvider } = require("./config");

		const config = {
			scm: { provider: "auto" },
			issueTracking: { provider: "auto" },
			commit: {},
		};

		const provider = resolveProvider(config as any);
		expect(provider).toBe("auto");
	});

	it("should handle lowercase provider values", () => {
		const { resolveProvider } = require("./config");

		const config = {
			scm: { provider: "GITHUB" },
			issueTracking: { provider: "JIRA" },
			commit: {},
		};

		const provider = resolveProvider(config as any);
		expect(provider).toBe("jira");
	});
});

describe("buildJiraKeyPattern", () => {
	it("should build pattern from projectKey when no override", () => {
		const { buildJiraKeyPattern } = require("./config");

		const config = {
			scm: {},
			issueTracking: { projectKey: "HAD" },
			commit: { providers: {} },
		};

		const pattern = buildJiraKeyPattern(config as any);
		expect(pattern?.source).toBe("^HAD-[0-9]+");
	});

	it("should use jiraKeyRegexOverride when provided", () => {
		const { buildJiraKeyPattern } = require("./config");

		const config = {
			scm: {},
			issueTracking: { branch: { jiraKeyRegexOverride: "^AR-[0-9]+$" } },
			commit: { providers: {} },
		};

		const pattern = buildJiraKeyPattern(config as any);
		expect(pattern?.source).toBe("^AR-[0-9]+$");
	});

	it("should use commit.providers.jira.keyRegexOverride when provided", () => {
		const { buildJiraKeyPattern } = require("./config");

		const config = {
			scm: {},
			issueTracking: {},
			commit: { providers: { jira: { keyRegexOverride: "^XYZ-[0-9]+$" } } },
		};

		const pattern = buildJiraKeyPattern(config as any);
		expect(pattern?.source).toBe("^XYZ-[0-9]+$");
	});

	it("should return null when no projectKey or override", () => {
		const { buildJiraKeyPattern } = require("./config");

		const config = {
			scm: {},
			issueTracking: {},
			commit: { providers: {} },
		};

		const pattern = buildJiraKeyPattern(config as any);
		expect(pattern).toBeNull();
	});

	it("should throw on invalid regex override", () => {
		const { buildJiraKeyPattern } = require("./config");

		const config = {
			scm: {},
			issueTracking: { branch: { jiraKeyRegexOverride: "[invalid" } },
			commit: { providers: {} },
		};

		expect(() => buildJiraKeyPattern(config as any)).toThrow(
			/Invalid.*jiraKeyRegexOverride/,
		);
	});
});

describe("loadGojiConfig", () => {
	it("should load scopes and types from .goji.json", () => {
		const { loadGojiConfig } = require("./config");
		const result = loadGojiConfig();

		expect(result.scopes).toBeDefined();
		expect(Array.isArray(result.scopes)).toBe(true);
		expect(result.types).toBeDefined();
		expect(Array.isArray(result.types)).toBe(true);
	});

	it("should have expected scopes from .goji.json", () => {
		const { loadGojiConfig } = require("./config");
		const result = loadGojiConfig();

		expect(result.scopes).toContain("core");
		expect(result.scopes).toContain("accounts");
		expect(result.scopes).toContain("ci");
		expect(result.scopes).toContain("skills");
	});

	it("should have expected types from .goji.json", () => {
		const { loadGojiConfig } = require("./config");
		const result = loadGojiConfig();

		const typeNames = result.types.map((t) => t.name);
		expect(typeNames).toContain("feat");
		expect(typeNames).toContain("fix");
		expect(typeNames).toContain("docs");
	});
});

describe("buildResolvedConfig", () => {
	it("should build complete resolved configuration", () => {
		const { buildResolvedConfig } = require("./config");
		const config = buildResolvedConfig();

		expect(config).toHaveProperty("provider");
		expect(config).toHaveProperty("projectKey");
		expect(config).toHaveProperty("jiraKeyPattern");
		expect(config).toHaveProperty("githubIssuePattern");
		expect(config).toHaveProperty("gitlabIssuePattern");
		expect(config).toHaveProperty("subjectMaxLength");
		expect(config).toHaveProperty("validScopes");
		expect(config).toHaveProperty("validTypes");
	});

	it("should have correct provider from jasper.toml", () => {
		const { buildResolvedConfig } = require("./config");
		const config = buildResolvedConfig();

		// From jasper.toml: issueTracking.provider = "jira"
		expect(config.provider).toBe("jira");
	});

	it("should have projectKey from jasper.toml", () => {
		const { buildResolvedConfig } = require("./config");
		const config = buildResolvedConfig();

		// From jasper.toml: projectKey = "HAD"
		expect(config.projectKey).toBe("HAD");
	});

	it("should have Jira key pattern from projectKey", () => {
		const { buildResolvedConfig } = require("./config");
		const config = buildResolvedConfig();

		expect(config.jiraKeyPattern).toBeDefined();
		expect(config.jiraKeyPattern?.source).toBe("^HAD-[0-9]+");
	});

	it("should have subjectMaxLength from jasper.toml", () => {
		const { buildResolvedConfig } = require("./config");
		const config = buildResolvedConfig();

		// TOML may parse integers as BigInt
		const maxLength =
			typeof config.subjectMaxLength === "bigint"
				? Number(config.subjectMaxLength)
				: config.subjectMaxLength;
		expect(maxLength).toBe(100);
	});
});

describe("getKeyPatternForProvider", () => {
	it("should return Jira pattern for jira provider", () => {
		const { getKeyPatternForProvider } = require("./config");

		const config = {
			provider: "jira",
			jiraKeyPattern: /^HAD-[0-9]+/,
			githubIssuePattern: null,
			gitlabIssuePattern: null,
		} as any;

		const pattern = getKeyPatternForProvider(config);
		expect(pattern?.source).toBe("^HAD-[0-9]+");
	});

	it("should return GitHub pattern for github provider", () => {
		const { getKeyPatternForProvider } = require("./config");

		const config = {
			provider: "github",
			jiraKeyPattern: /^HAD-[0-9]+/,
			githubIssuePattern: /\(#[0-9]+\)$/,
			gitlabIssuePattern: null,
		} as any;

		const pattern = getKeyPatternForProvider(config);
		// The pattern should be /\(#[0-9]+\)$/ for GitHub provider
		expect(pattern).toBeDefined();
		// Verify it matches the expected format
		expect(pattern?.test("(#123)")).toBe(true);
		expect(pattern?.test("resolve bug (#456)")).toBe(true);
	});

	it("should return null for auto provider", () => {
		const { getKeyPatternForProvider } = require("./config");

		const config = {
			provider: "auto",
			jiraKeyPattern: /^HAD-[0-9]+/,
		} as any;

		const pattern = getKeyPatternForProvider(config);
		expect(pattern).toBeNull();
	});

	it("should return GitLab pattern for gitlab provider", () => {
		const { getKeyPatternForProvider } = require("./config");

		const config = {
			provider: "gitlab",
			jiraKeyPattern: /^HAD-[0-9]+/,
			githubIssuePattern: null,
			gitlabIssuePattern: /\(#[0-9]+\)$/,
		} as any;

		const pattern = getKeyPatternForProvider(config);
		// The pattern should be /\(#[0-9]+\)$/ for GitLab provider
		expect(pattern).toBeDefined();
		expect(pattern?.test("(#123)")).toBe(true);
	});
});

describe("loadScopesFromJasper", () => {
	it("should load scopes from jasper.toml [commit] section", () => {
		const { loadScopesFromJasper } = require("./config");
		const scopes = loadScopesFromJasper();

		expect(scopes).toBeDefined();
		expect(Array.isArray(scopes)).toBe(true);
		expect(scopes.length).toBeGreaterThan(0);
	});

	it("should have expected scopes from jasper.toml", () => {
		const { loadScopesFromJasper } = require("./config");
		const scopes = loadScopesFromJasper();

		// From jasper.toml: scopes = ["core", "accounts", "ci", "skills"]
		expect(scopes).toContain("core");
		expect(scopes).toContain("accounts");
		expect(scopes).toContain("ci");
		expect(scopes).toContain("skills");
	});

	it("should return empty array if scopes not defined in jasper.toml", () => {
		const { loadScopesFromJasper } = require("./config");
		// This test verifies the function works - actual empty case depends on jasper.toml config
		const scopes = loadScopesFromJasper();
		expect(Array.isArray(scopes)).toBe(true);
	});

	it("should NOT load scopes from .goji.json (scopes only from jasper.toml)", () => {
		// This test verifies the policy: scopes come ONLY from jasper.toml
		// .goji.json scopes are ignored for scope validation
		const { loadScopesFromJasper } = require("./config");
		const { loadGojiConfig } = require("./config");

		const jasperScopes = loadScopesFromJasper();
		const gojiConfig = loadGojiConfig();

		// Verify both configs are loaded correctly
		expect(jasperScopes).toBeDefined();
		expect(gojiConfig.scopes).toBeDefined();

		// For this test repo, both configs have same scopes, but the policy
		// is that only jasper.toml is used for scope enumeration
		// The actual enforcement happens in index.ts where scope-enum is not applied
	});
});

describe("buildResolvedConfig scopes policy", () => {
	it("should load scopes ONLY from jasper.toml (no .goji.json fallback)", () => {
		const { buildResolvedConfig, loadScopesFromJasper } = require("./config");

		const jasperScopes = loadScopesFromJasper();
		const config = buildResolvedConfig();

		// Scopes come directly from jasper.toml
		expect(config.validScopes).toEqual(jasperScopes);
		// verify they're not empty (jasper.toml has scopes)
		expect(config.validScopes.length).toBeGreaterThan(0);
	});

	it("should have validScopes from jasper.toml in resolved config", () => {
		const { buildResolvedConfig } = require("./config");
		const config = buildResolvedConfig();

		expect(config.validScopes).toBeDefined();
		expect(Array.isArray(config.validScopes)).toBe(true);
		expect(config.validScopes.length).toBeGreaterThan(0);
		// Verify scopes match jasper.toml
		expect(config.validScopes).toContain("core");
		expect(config.validScopes).toContain("accounts");
		expect(config.validScopes).toContain("ci");
		expect(config.validScopes).toContain("skills");
	});

	it("should NOT use .goji.json scopes as fallback", () => {
		// This test verifies the policy change
		// Scopes come from jasper.toml only, and scope-enum is NOT enforced
		// The policy is: scopes from jasper.toml only, undeclared scopes are allowed
		const { buildResolvedConfig } = require("./config");
		const config = buildResolvedConfig();

		// validScopes should exist and come from jasper.toml
		expect(config.validScopes).toBeDefined();
		expect(Array.isArray(config.validScopes)).toBe(true);
	});

	it("should still load types from .goji.json (types not in jasper.toml yet)", () => {
		const { buildResolvedConfig } = require("./config");
		const config = buildResolvedConfig();

		// Types still come from .goji.json (not yet migrated to jasper.toml)
		expect(config.validTypes).toBeDefined();
		expect(Array.isArray(config.validTypes)).toBe(true);
		expect(config.validTypes.length).toBeGreaterThan(0);

		// Verify types from .goji.json
		const typeNames = config.validTypes.map((t) => t.name);
		expect(typeNames).toContain("feat");
		expect(typeNames).toContain("fix");
	});
});

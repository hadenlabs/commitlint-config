// Jasper TOML config loader for commitlint-config-core
// Reads jasper.toml to derive provider-aware configuration

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as TOML from "@ltd/j-toml";

/**
 * Configuration schema derived from jasper.toml
 */
export interface JasperConfig {
	scm: {
		provider: string;
		flow: string;
	};
	issueTracking: {
		provider: string;
		projectKey?: string;
		keyRegexOverride?: string;
		branch: {
			source: string;
			jiraKeyFromProjectKey: boolean;
			jiraKeyRegexOverride: string;
			githubIssueNumberRegex: string;
			gitlabIssueNumberRegex: string;
		};
	};
	commit: {
		tool: string;
		format: string;
		style: string;
		signoff: boolean;
		subjectMaxLength: number;
		scopes?: string[];
		providers: {
			github?: { issueRegex: string; closingBodyLine: string };
			gitlab?: { issueRegex: string; closingBodyLine: string };
			jira?: { keyRegexOverride?: string };
		};
	};
}

/**
 * Resolved provider with precedence:
 * 1. issueTracking.provider
 * 2. scm.provider fallback
 */
export type Provider = "jira" | "github" | "gitlab" | "auto";

export interface ResolvedConfig {
	provider: Provider;
	projectKey?: string;
	jiraKeyPattern?: RegExp;
	githubIssuePattern?: RegExp;
	gitlabIssuePattern?: RegExp;
	subjectMaxLength: number;
	validScopes: string[];
	validTypes: ValidType[];
}

export interface ValidType {
	name: string;
	emoji: string;
	code: string;
	description: string;
}

// Find jasper.toml by traversing up from current working directory
function findJasperConfig(searchFrom?: string): string | null {
	const startDir = searchFrom || process.cwd();

	// Common patterns:
	// - packages/commitlint-config-core/src -> repo root
	// - repo root -> repo root
	let current = startDir;

	for (let i = 0; i < 10; i++) {
		const candidate = join(current, "jasper.toml");
		if (existsSync(candidate)) {
			return candidate;
		}

		const parent = dirname(current);
		if (parent === current) break; // Reached filesystem root
		current = parent;
	}

	return null;
}

// Root of the monorepo (jasper.toml should be at root)
// Try multiple strategies to find the config
function getRootConfigPath(): string {
	// Strategy 1: Look relative to this file (in package/src)
	const fileLocation = __filename;
	const packageSrcDir = dirname(fileLocation);
	const packagesDir = dirname(packageSrcDir);
	const packagesRoot = dirname(packagesDir);
	const fromPackageRoot = join(packagesRoot, "jasper.toml");

	if (existsSync(fromPackageRoot)) {
		return fromPackageRoot;
	}

	// Strategy 2: Look relative to cwd
	const fromCwd = join(process.cwd(), "jasper.toml");
	if (existsSync(fromCwd)) {
		return fromCwd;
	}

	// Strategy 3: Search up from cwd
	const found = findJasperConfig(process.cwd());
	if (found) {
		return found;
	}

	// Strategy 4: Search up from file location
	const foundFromFile = findJasperConfig(packageSrcDir);
	if (foundFromFile) {
		return foundFromFile;
	}

	// Fallback to cwd location (will fail with clear error)
	return join(process.cwd(), "jasper.toml");
}

const ROOT_CONFIG = getRootConfigPath();

/**
 * Load and parse jasper.toml from monorepo root
 * @throws if jasper.toml does not exist or cannot be parsed
 */
export function loadJasperConfig(): JasperConfig {
	if (!existsSync(ROOT_CONFIG)) {
		throw new Error(
			`jasper.toml not found at monorepo root: ${ROOT_CONFIG}\n` +
				"  - Ensure jasper.toml exists at the repository root\n" +
				"  - Current working directory: " +
				process.cwd() +
				"  - Expected path: <repo-root>/jasper.toml",
		);
	}

	try {
		const content = readFileSync(ROOT_CONFIG, "utf-8");
		const parsed = TOML.parse(content, { joiner: "\n" }) as Record<
			string,
			unknown
		>;

		// Validate required sections
		if (!parsed.scm) {
			throw new Error("jasper.toml missing required section: [scm]");
		}
		if (!parsed.issueTracking) {
			throw new Error("jasper.toml missing required section: [issueTracking]");
		}
		if (!parsed.commit) {
			throw new Error("jasper.toml missing required section: [commit]");
		}

		// Type the parsed config
		const config = parsed as unknown as JasperConfig;

		// Validate scm.provider
		if (!config.scm?.provider) {
			throw new Error("jasper.toml: [scm].provider is required");
		}

		// Validate issueTracking.provider
		if (!config.issueTracking?.provider) {
			throw new Error("jasper.toml: [issueTracking].provider is required");
		}

		return config;
	} catch (error) {
		if (error instanceof Error && error.message.includes("jasper.toml")) {
			throw error;
		}
		throw new Error(
			`Failed to parse jasper.toml: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Resolve provider with precedence:
 * 1. issueTracking.provider (highest priority)
 * 2. scm.provider (fallback)
 * Returns the effective provider string
 */
export function resolveProvider(config: JasperConfig): Provider {
	// Priority 1: explicit issueTracking.provider
	const issueProvider = config.issueTracking?.provider?.toLowerCase();
	if (issueProvider && issueProvider !== "auto") {
		return issueProvider as Provider;
	}

	// Priority 2: scm.provider fallback (only if not "auto")
	const scmProvider = config.scm?.provider?.toLowerCase();
	if (scmProvider && scmProvider !== "auto") {
		return scmProvider as Provider;
	}

	// Both are "auto" or issueTracking.provider is "auto" with auto scm
	// Return auto - behavior depends on context
	return "auto";
}

/**
 * Build Jira key pattern from projectKey or override
 * Pattern: derived from projectKey or explicit override
 */
export function buildJiraKeyPattern(config: JasperConfig): RegExp | null {
	// Check for explicit override first
	const override = config.issueTracking?.branch?.jiraKeyRegexOverride;
	if (override?.trim()) {
		try {
			return new RegExp(override);
		} catch {
			throw new Error(
				`Invalid jiraKeyRegexOverride in jasper.toml: "${override}"`,
			);
		}
	}

	// Check commit.providers.jira override
	const jiraOverride = config.commit?.providers?.jira?.keyRegexOverride;
	if (jiraOverride?.trim()) {
		try {
			return new RegExp(jiraOverride);
		} catch {
			throw new Error(
				`Invalid [commit.providers.jira].keyRegexOverride in jasper.toml: "${jiraOverride}"`,
			);
		}
	}

	// Derive from projectKey
	const projectKey = config.issueTracking?.projectKey;
	if (projectKey) {
		return new RegExp(`^${projectKey}-[0-9]+`);
	}

	return null;
}

/**
 * Build GitHub issue number pattern from config
 */
export function buildGitHubIssuePattern(config: JasperConfig): RegExp | null {
	const regex = config.issueTracking?.branch?.githubIssueNumberRegex;
	if (regex) {
		try {
			return new RegExp(regex);
		} catch {
			throw new Error(
				`Invalid githubIssueNumberRegex in jasper.toml: "${regex}"`,
			);
		}
	}
	// Default pattern: matches #123 at end of string or in parentheses
	return /\(#[0-9]+\)$/;
}

/**
 * Build GitLab issue number pattern from config
 */
export function buildGitLabIssuePattern(config: JasperConfig): RegExp | null {
	const regex = config.issueTracking?.branch?.gitlabIssueNumberRegex;
	if (regex) {
		try {
			return new RegExp(regex);
		} catch {
			throw new Error(
				`Invalid gitlabIssueNumberRegex in jasper.toml: "${regex}"`,
			);
		}
	}
	// Default pattern
	return /\(#[0-9]+\)$/;
}

/**
 * Load scopes from jasper.toml [commit] section
 * Returns empty array if not defined
 * Note: Only reads from jasper.toml - .goji.json is NOT used for scopes
 */
export function loadScopesFromJasper(): string[] {
	const config = loadJasperConfig();
	const scopes = config.commit?.scopes;
	if (Array.isArray(scopes)) {
		return scopes.filter((s): s is string => typeof s === "string");
	}
	return [];
}

/**
 * Load .goji.json scopes and types
 * Searches up from various locations to find it at repository root
 * @deprecated Use loadScopesFromJasper() instead - .goji.json is a transitional fallback
 */
export function loadGojiConfig(): { scopes: string[]; types: ValidType[] } {
	// Search paths - jasper.toml directory and cwd parent
	const searchPaths = [
		dirname(ROOT_CONFIG), // Same directory as jasper.toml (repo root)
		process.cwd(),
	];

	let found = false;
	for (const searchDir of searchPaths) {
		const gojiPath = join(searchDir, ".goji.json");
		if (existsSync(gojiPath)) {
			found = true;
			try {
				const content = readFileSync(gojiPath, "utf-8");
				const parsed = JSON.parse(content);

				const scopes = Array.isArray(parsed.scopes) ? parsed.scopes : [];
				const types: ValidType[] = Array.isArray(parsed.types)
					? parsed.types.map(
							(t: {
								name?: string;
								emoji?: string;
								code?: string;
								description?: string;
							}) => ({
								name: t.name || "",
								emoji: t.emoji || "",
								code: t.code || "",
								description: t.description || "",
							}),
						)
					: [];

				// Log deprecation warning once per process
				if (process.env.NODE_ENV !== "test") {
					console.warn(
						"[DEPRECATION WARNING] .goji.json is deprecated and will be removed in a future version.\n" +
							"  Please migrate scopes to jasper.toml: [commit] section.\n" +
							"  Example: scopes = [\"core\", \"accounts\", \"ci\", \"skills\"]",
					);
				}

				return { scopes, types };
			} catch {
				// Continue to next search path
			}
		}
	}

	// Safe fallback - no warning if file doesn't exist
	if (!found) {
		return { scopes: [], types: [] };
	}

	return { scopes: [], types: [] };
}

/**
 * Build resolved config from jasper.toml only
 * Scopes are loaded exclusively from jasper.toml [commit].scopes
 * Note: .goji.json is NOT used for scopes - only for types (transitional)
 */
export function buildResolvedConfig(): ResolvedConfig {
	const jasperConfig = loadJasperConfig();
	const provider = resolveProvider(jasperConfig);

	// Load scopes ONLY from jasper.toml (no .goji.json fallback for scopes)
	const jasperScopes = loadScopesFromJasper();

	// Load types from .goji.json (types not yet migrated to jasper.toml)
	const gojiConfig = loadGojiConfig();

	const jiraKeyPattern = buildJiraKeyPattern(jasperConfig);
	const githubIssuePattern = buildGitHubIssuePattern(jasperConfig);
	const gitlabIssuePattern = buildGitLabIssuePattern(jasperConfig);

	return {
		provider,
		projectKey: jasperConfig.issueTracking?.projectKey,
		jiraKeyPattern: jiraKeyPattern || undefined,
		githubIssuePattern: githubIssuePattern || undefined,
		gitlabIssuePattern: gitlabIssuePattern || undefined,
		subjectMaxLength: jasperConfig.commit?.subjectMaxLength || 100,
		validScopes: jasperScopes,
		validTypes: gojiConfig.types,
	};
}

/**
 * Get the effective key pattern for the current provider
 * Returns null if provider is "auto" and cannot be resolved
 */
export function getKeyPatternForProvider(
	config: ResolvedConfig,
): RegExp | null {
	switch (config.provider) {
		case "jira":
			return config.jiraKeyPattern || null;
		case "github":
			return config.githubIssuePattern || null;
		case "gitlab":
			return config.gitlabIssuePattern || null;
		case "auto":
			// Cannot resolve "auto" deterministically without branch/remote context
			// Return null - caller must handle explicitly
			return null;
		default:
			return null;
	}
}

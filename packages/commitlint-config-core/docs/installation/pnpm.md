# @hadenlabs/commitlint-config-core

Shared types, utilities and config integrations for commitlint-config-core.

---

# Prerequisites

- Node.js >= 22
- Bun >= 1.3
- GitHub Personal Access Token (PAT)

Required GitHub token scopes:

- `read:packages`

For publishing packages:

- `write:packages`

---

# Configure GitHub Packages

Create or update your `~/.npmrc`:

```ini
@hadenlabs:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Or configure it locally inside the project:

```bash
echo "@hadenlabs:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc
```

---

# Install

## pnpm

```bash
pnpm add @hadenlabs/commitlint-config-core@1.2.0
```
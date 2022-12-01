# How to use this project

Create file `.commitlintrc.json` with extending preset and define set of scopes:

```json
{
  "extends": ["@hadenlabs/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        // as examples
        "app",
        "common"
      ]
    ]
  }
}
```

Add to `package.json` next section:

```json
{
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

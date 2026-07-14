# Genter

Monorepo for **genter** — a CLI tool to download streaming videos from supported sites.

## Project structure

```
genter/
├── packages/
│   └── core/          # CLI tool + core library
│       ├── src/       # TypeScript source
│       └── dist/      # Compiled output
├── docs/              # Documentation
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Development

```bash
pnpm install          # Install all workspace dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm typecheck        # Type-check without emitting
pnpm --filter genter build  # Build only the core package
```

## Publishing

1. Merge a PR to `main` → auto-bump creates a version tag
2. Create a GitHub Release from that tag → auto-publishes to npm

[genter on npm](https://www.npmjs.com/package/genter) | [publish workflow](./.github/workflows/publish.yml)

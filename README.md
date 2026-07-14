# Genter

CLI tool for downloading streaming videos from supported sites. Run it anywhere with `npx genter <url>`.

## How it works

```
 URL → Extractor → CDN video URL → Downloader → local file
```

1. **Extractor** — site-specific logic to find the raw video URL (parses HTML embed pages, handles redirects)
2. **Downloader** — streaming HTTP download with progress tracking and resume support
3. **CLI** — ties it together with commander, ora spinners, and a progress bar

## Quick start

```bash
npx genter https://xpvid.cc/videos/abc123
```

```bash
npm install -g genter
genter https://xpvid.cc/videos/abc123 -d ./videos
```

## Supported sites

| Site | Domains | Notes |
|---|---|---|
| XpVid | `xpvid.cc`, `vidbl.ing` | Direct extraction, no auth needed |
| Twitter / X | `x.com`, `twitter.com` | Requires auth tokens or browser cookies |

For full usage details, see [packages/core/README.md](./packages/core/README.md).

## Project structure

```
genter/
├── packages/
│   └── core/              # CLI tool + extractor library
│       ├── src/
│       │   ├── cli.ts     # CLI entry point (npx genter)
│       │   ├── cli/       # CLI helpers (prompts, path resolution)
│       │   ├── downloader/ # Streaming downloader + FileWriter interface
│       │   ├── extractors/ # Site-specific video URL extractors
│       │   ├── index.ts   # Public API (browser-safe)
│       │   └── node.ts    # Node.js-only exports (Twitter extractor, file writer)
│       └── dist/          # Compiled JavaScript (target: ES2022)
├── docs/                  # Requirements, task breakdown
├── .github/workflows/     # CI: auto-bump version + npm publish
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Development

```bash
pnpm install              # Install all workspace dependencies
pnpm build                # Build all packages
pnpm test                 # Run tests (vitest)
pnpm typecheck            # Type-check without emitting

# Build and run CLI locally
pnpm --filter genter build
node packages/core/dist/cli.js https://xpvid.cc/videos/abc123
```

## Publishing

| Event | What happens |
|---|---|
| PR merged to `main` | Auto-bump version (reads PR title for `feat:` / `fix:` / `BREAKING CHANGE`) → creates git tag |
| GitHub Release published | Build + publish to npm |

Requires `NPM_TOKEN` set in [repository secrets](https://github.com/mahalarang/genter/settings/secrets/actions).

## Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict, target ES2022, ESM) |
| Package manager | pnpm |
| Monorepo | pnpm workspaces |
| CLI | Commander.js, ora, cli-progress, chalk, @inquirer/prompts |
| Video | ffmpeg-static, ytdlp-nodejs (Twitter HLS) |
| Testing | Vitest |

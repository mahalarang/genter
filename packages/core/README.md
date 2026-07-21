# genter

Download streaming videos from supported sites via CLI.

## Quick start

```bash
npx genter https://xpvid.cc/videos/abc123
```

Or install globally:

```bash
npm install -g genter
genter https://xpvid.cc/videos/abc123
```

## Usage

```
genter [url] [options]
```

### Options

| Option | Description |
|---|---|
| `-o, --output <path>` | Output file path (overrides automatic naming) |
| `-d, --output-dir <dir>` | Output directory (default: current directory) |
| `--no-progress` | Disable progress bar |
| `--cookies-from-browser <browser>` | Read cookies from browser for Twitter/X auth (chrome, firefox, edge) |
| `--cookies <path>` | Path to Netscape-format cookies file for Twitter/X auth |
| `--twitter-auth <auth_token:ct0>` | Quick Twitter/X auth — paste auth_token and ct0 tokens |

### Examples

```bash
# Basic download
genter https://xpvid.cc/videos/abc123

# Custom output directory
genter -d ./videos https://xpvid.cc/videos/abc123

# Custom filename
genter -o my-video.mp4 https://xpvid.cc/videos/abc123

# Twitter/X with auth tokens
genter --twitter-auth "abc123:x-ct0-def456" https://x.com/user/status/789

# Twitter/X with browser cookies
genter --cookies-from-browser chrome https://x.com/user/status/789
```

## Supported sites

| Site | Domains |
|---|---|
| XpVid | `xpvid.cc`, `vidbl.ing`, `vdy.to` |
| Twitter / X | `x.com`, `twitter.com` |

### Twitter/X setup

Twitter requires authentication. Use one of:

- `--twitter-auth` — quickest. Get `auth_token` and `ct0` from devtools (F12 → Application → Cookies → x.com)
- `--cookies-from-browser` — reads cookies from Chrome/Firefox/Edge
- `--cookies` — manual Netscape-format cookies file

## Requirements

**[ffmpeg](https://ffmpeg.org)** must be installed on your system.

| OS | Install |
|---|---|
| macOS | `brew install ffmpeg` |
| Linux | `sudo apt install ffmpeg` (Debian/Ubuntu) or `sudo dnf install ffmpeg` (Fedora) |
| Windows | `winget install ffmpeg` or `choco install ffmpeg` |

Verify installation:
```bash
ffmpeg -version
```

## Programmatic API

```js
import { findExtractor, download } from 'genter';

const extractor = findExtractor(url);
const { videoUrl, filename } = await extractor.extract(url);

await download({
  videoUrl,
  referer: 'https://example.com',
  createWriter: async () => myFileWriter,
  onProgress: (downloaded, total) => {
    console.log(`${downloaded} / ${total}`);
  },
});
```

For Node.js-specific features (Twitter extractor, file writer):

```js
import { TwitterExtractor, NodeFileWriter } from 'genter/node';
```

# GitHub Pages Publishing

This wiki supports runtime discovery from GitHub API on `*.github.io` hosts.

## Runtime fallback order

1. GitHub API tree scan for `wiki/content/**/*.md`
2. Static manifest at `wiki/data/content-manifest.json`
3. Embedded fallback object in `wiki/data/wiki-fallback.js`

## Deployment checks

- Confirm `wiki.html` is reachable.
- Open `wiki.html?page=index.md`.
- Test heading hash navigation (for example `#runtime-fallback-order`).
- Test search prefill with `?hit=wiki`.

![Interwell Mark](https://cdn.craft.cloud/eefb662a-81d2-4c81-a4e3-3430f73d17d0/assets/assets/Interwell_Logo_Symbol_Dark_Purple-2.png)

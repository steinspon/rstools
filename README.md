# RSTools

## Wiki workflow

### Rebuild index and fallback

Run this to regenerate the wiki manifest and embedded fallback content after adding or editing markdown pages:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\rebuild-wiki-manifest.ps1
```

This generates:

- `wiki/data/content-manifest.json`
- `wiki/data/wiki-fallback.js`

### Run watcher

Use this command during documentation work to auto-regenerate the manifest on markdown create/change/delete/rename:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\watch-wiki-manifest.ps1
```

Or run a one-shot rebuild and then keep watching:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-wiki.ps1
```

### Markdown authoring conventions

- Place all wiki source files under `wiki/content/**/*.md`.
- Use the first `# H1` as the page title shown in nav.
- If `# H1` is missing, nav title falls back to filename.
- Use folder structure to shape the navigation information architecture.
- Prefer relative links between markdown pages, for example `[WAP](tools/wap.md)`.
- Use forward slashes (`/`) in links and paths.

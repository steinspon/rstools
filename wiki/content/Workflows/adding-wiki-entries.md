# Adding New Wiki Entries

This wiki is Markdown-first. Every page lives under `wiki/content/**/*.md`.

## Quick steps

1. Create a new `.md` file in the right folder under `wiki/content`.
2. Add a first-level heading (`# Title`) at the top of the file.
3. Write your content using standard Markdown.
4. Rebuild the manifest so navigation updates.

## Choose the right location

- Put tool-specific docs in `wiki/content/tools/`.
- Put process and guidance docs in `wiki/content/workflows/`.
- Create subfolders when you need clearer structure.

Folders become wiki navigation groups automatically.

## Title conventions

- The first `# H1` is used as the page title in nav.
- If no `# H1` exists, title falls back to filename.
- Keep titles short and specific.

## Link conventions

- Use relative links between markdown pages, for example:
  - `[WAP Tool Notes](../tools/wap.md)`
- Use forward slashes (`/`) in paths.

## Rebuild commands

- Rebuild once:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\rebuild-wiki-manifest.ps1`
- Watch for changes:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\watch-wiki-manifest.ps1`
- Rebuild and then watch:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\dev-wiki.ps1`

## Checklist before commit

- Page appears in left navigation after rebuild.
- Internal links resolve correctly.
- Heading structure is clear (`#`, `##`, `###`).
- Content is scoped to one topic per page.

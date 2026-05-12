# Local Wiki Development

Use the PowerShell scripts in `scripts/` to keep wiki metadata up to date.

## Commands

- Rebuild once: `powershell -ExecutionPolicy Bypass -File .\scripts\rebuild-wiki-manifest.ps1`
- Watch changes: `powershell -ExecutionPolicy Bypass -File .\scripts\watch-wiki-manifest.ps1`
- Rebuild + watch: `powershell -ExecutionPolicy Bypass -File .\scripts\dev-wiki.ps1`

## Authoring reminder

Create pages anywhere under `wiki/content/**/*.md` and rerun rebuild to refresh navigation.

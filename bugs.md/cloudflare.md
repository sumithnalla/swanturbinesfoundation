# Deploy the website to Cloudflare Pages (PowerShell)

Run these commands from the repository root in PowerShell. They build a clean public-assets staging directory, then deploy it to the existing Pages project. The staging folder name is unique per run and stays inside `.agent-cache`.

```powershell
npx wrangler whoami
$stage = ".agent-cache/pages-manual-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
.\scripts\stage-pages.ps1 -Destination $stage
npx wrangler pages deploy $stage --project-name swan-turbines-foundation --branch main
```

If Wrangler asks to install its package, approve the prompt. Confirm the deployment URL printed by Wrangler before testing. Do not include `.env` files or secrets in a Pages deployment; the staging script deliberately copies only public site assets.

# Deploy the website

Open **PowerShell** and paste this whole block. It moves to the project folder, prepares the website files, and deploys them to Cloudflare Pages.

```powershell
Set-Location -LiteralPath 'D:\sumith\Websitter Technologies\swan turbines\swan turbines foundation\swan 2\swan'
$stage = ".agent-cache/pages-manual-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
.\scripts\stage-pages.ps1 -Destination $stage
npx wrangler pages deploy $stage --project-name swan-turbines-foundation --branch main
``
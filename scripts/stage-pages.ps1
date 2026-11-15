param([string]$Destination = '.agent-cache/pages-production')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$target = [IO.Path]::GetFullPath((Join-Path $repo $Destination))
if (-not $target.StartsWith((Join-Path $repo '.agent-cache') + [IO.Path]::DirectorySeparatorChar)) { throw 'Staging must be inside .agent-cache.' }
if (Test-Path -LiteralPath $target) { throw 'Use a new staging directory; existing staging will not be overwritten.' }
New-Item -ItemType Directory -Path $target | Out-Null
$allowed = @('.html','.css','.js','.png','.jpg','.jpeg','.webp','.svg','.ico','.pdf','.woff','.woff2','.ttf')
Get-ChildItem -LiteralPath $repo -File | Where-Object { $allowed -contains $_.Extension.ToLower() -and $_.Name -ne '404.html' } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $target
}
foreach ($name in @('_headers', 'robots.txt', 'sitemap.xml', '404.html')) {
    $source = Join-Path $repo $name
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Required public file is missing: $name" }
    Copy-Item -LiteralPath $source -Destination $target
}
foreach ($folder in @('css','js','manage','super-admin','swan_foundation_img','pdf_pages')) {
    Get-ChildItem -LiteralPath (Join-Path $repo $folder) -File -Recurse | Where-Object { $allowed -contains $_.Extension.ToLower() } | ForEach-Object {
        $relative = $_.FullName.Substring($repo.Length + 1)
        $dest = Join-Path $target $relative
        New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $dest
    }
}
$siteKey = $env:TURNSTILE_SITE_KEY
if (-not $siteKey) {
    $localEnv = Join-Path $repo 'backend/.env'
    if (Test-Path -LiteralPath $localEnv -PathType Leaf) {
        foreach ($line in [IO.File]::ReadLines($localEnv)) {
            if ($line -match '^\s*TURNSTILE_SITE_KEY\s*=\s*["'']?([A-Za-z0-9_-]{10,100})["'']?\s*$' -or
                $line -match '^\s*([A-Za-z0-9_-]{10,100})\s*(?:-->)?\s+Site\s+key\s*$') { $siteKey = $Matches[1]; break }
        }
    }
}
if (-not $siteKey -or $siteKey -notmatch '^[A-Za-z0-9_-]{10,100}$') {
    throw 'Set TURNSTILE_SITE_KEY to the public site key before staging this version.'
}
$siteKeyJson = ConvertTo-Json -Compress -InputObject $siteKey
[IO.File]::WriteAllText((Join-Path $target 'js/turnstile-site-config.js'), "window.__TURNSTILE_SITE_KEY__ = $siteKeyJson;`n", [Text.UTF8Encoding]::new($false))
$files = Get-ChildItem -LiteralPath $target -Recurse -File
if ($files | Where-Object { $_.Name -match '(?i)\.env|\.md$|\.sql$|\.toml$' }) { throw 'Non-public file found in staging.' }
Write-Output "Staged $($files.Count) public assets in $target"

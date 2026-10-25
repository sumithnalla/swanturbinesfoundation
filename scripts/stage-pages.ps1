param([string]$Destination = '.agent-cache/pages-production')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$target = [IO.Path]::GetFullPath((Join-Path $repo $Destination))
if (-not $target.StartsWith((Join-Path $repo '.agent-cache') + [IO.Path]::DirectorySeparatorChar)) { throw 'Staging must be inside .agent-cache.' }
if (Test-Path -LiteralPath $target) { throw 'Use a new staging directory; existing staging will not be overwritten.' }
New-Item -ItemType Directory -Path $target | Out-Null
$allowed = @('.html','.css','.js','.png','.jpg','.jpeg','.webp','.svg','.ico','.pdf','.woff','.woff2','.ttf')
Get-ChildItem -LiteralPath $repo -File | Where-Object { $allowed -contains $_.Extension.ToLower() } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $target
}
foreach ($folder in @('css','js','manage','super-admin','swan_foundation_img','pdf_pages')) {
    Get-ChildItem -LiteralPath (Join-Path $repo $folder) -File -Recurse | Where-Object { $allowed -contains $_.Extension.ToLower() } | ForEach-Object {
        $relative = $_.FullName.Substring($repo.Length + 1)
        $dest = Join-Path $target $relative
        New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $dest
    }
}
$files = Get-ChildItem -LiteralPath $target -Recurse -File
if ($files | Where-Object { $_.Name -match '(?i)\.env|\.md$|\.sql$|\.toml$' }) { throw 'Non-public file found in staging.' }
Write-Output "Staged $($files.Count) public assets in $target"

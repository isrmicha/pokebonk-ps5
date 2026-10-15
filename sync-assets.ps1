param (
    [string]$BaseUrl = "https://pokebonk.com",
    [int]$Gen1Max = 151,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "=== Sincronizando PokéBonk com o oficial ($BaseUrl) ===" -ForegroundColor Cyan

# 1. Baixar index.html
Write-Host "1. Baixando index.html..."
$indexHtml = (Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing).Content

# 2. Descobrir bundles principais (Vite hashes)
Write-Host "2. Detectando bundles e chunks JavaScript/CSS..."
$mainEntryMatch = [regex]::Match($indexHtml, 'src="\./(assets/main-[^"]+\.js)"')
if (-not $mainEntryMatch.Success) {
    Write-Error "Não foi possível encontrar o script principal no index.html"
}
$mainEntryRel = $mainEntryMatch.Groups[1].Value
$mainEntryContent = (Invoke-WebRequest -Uri "$BaseUrl/$mainEntryRel" -UseBasicParsing).Content

# Extrair lista de dependências mapeadas pelo Vite (__vite__mapDeps)
$depsMatch = [regex]::Match($mainEntryContent, '\[("\./assets/[^\]]+"|"\./[^\]]+\.(?:js|css)"[^\]]*)\]')
$chunkList = @($mainEntryRel)
if ($depsMatch.Success) {
    $depsRaw = $depsMatch.Groups[1].Value
    $chunks = [regex]::Matches($depsRaw, '"\./([^"]+)"') | ForEach-Object {
        $val = $_.Groups[1].Value
        if ($val -notlike "assets/*") { "assets/$val" } else { $val }
    }
    $chunkList += $chunks
}
$chunkList = $chunkList | Select-Object -Unique

# 3. Garantir pastas
$dirs = @(
    "assets",
    "assets\models",
    "assets\env\common",
    "assets\env\forest",
    "assets\music",
    "assets\ui\icons",
    "assets\ui\types",
    "assets\pmd",
    "assets\cries",
    "assets\items",
    "data",
    "data\i18n"
)
foreach ($d in $dirs) {
    $targetDir = Join-Path $root $d
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
}

$wc = New-Object System.Net.WebClient

# 4. Baixar bundles JS e CSS
Write-Host "3. Baixando $($chunkList.Count) chunks JS e CSS..."
foreach ($chunk in $chunkList) {
    $dest = Join-Path $root ($chunk -replace '/', '\')
    if ($Force -or (-not (Test-Path $dest))) {
        try {
            $wc.DownloadFile("$BaseUrl/$chunk", $dest)
            Write-Host "  + $chunk" -ForegroundColor Gray
        } catch {
            Write-Warning "Falha ao baixar $chunk : $_"
        }
    }
}

# Limpeza de chunks antigos que não estão mais na lista de dependências
$activeFileNames = $chunkList | ForEach-Object { Split-Path $_ -Leaf }
Get-ChildItem -Path (Join-Path $root "assets") -File | Where-Object {
    ($_.Name -match '^(?:main|i18n|news|\d+)-[A-Za-z0-9_-]+\.(?:js|css)$') -and
    ($_.Name -notin $activeFileNames)
} | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "  - Removido chunk obsoleto: $($_.Name)" -ForegroundColor DarkYellow
}

# 5. Baixar dados JSON
Write-Host "4. Baixando arquivos de dados JSON..."
$dataFiles = @(
    "pokemon.json",
    "moves.json",
    "learnsets.json",
    "abilities.json",
    "types.json",
    "items.json",
    "sprites.json",
    "i18n/pt.json",
    "i18n/es.json",
    "i18n/en.json"
)
foreach ($df in $dataFiles) {
    $dest = Join-Path $root "data\$($df -replace '/', '\')"
    if ($Force -or (-not (Test-Path $dest))) {
        try {
            $wc.DownloadFile("$BaseUrl/data/$df", $dest)
            Write-Host "  + data/$df" -ForegroundColor Gray
        } catch {
            Write-Warning "Falha em data/$df : $_"
        }
    }
}

# 6. Baixar modelos 3D (.glb)
Write-Host "5. Baixando modelos 3D..."
$models = @(
    "ball", "chest", "freechest", "altar", "greed", "goldrock",
    "cage", "boss", "portal", "shrine", "challenge", "cursed",
    "cursedchest", "bounceshroom", "slots", "sanct_portal"
)
foreach ($m in $models) {
    $dest = Join-Path $root "assets\models\$m.glb"
    if ($Force -or (-not (Test-Path $dest))) {
        try {
            $wc.DownloadFile("$BaseUrl/assets/models/$m.glb", $dest)
            Write-Host "  + models/$m.glb" -ForegroundColor Gray
        } catch {
            Write-Warning "Falha em models/$m.glb : $_"
        }
    }
}

# 7. Baixar texturas do bioma forest e common
Write-Host "6. Baixando texturas e atlas de ambiente..."
$envFiles = @(
    "assets/env/common/atlas.json",
    "assets/env/common/atlas.png",
    "assets/env/forest/atlas.json",
    "assets/env/forest/atlas.png",
    "assets/env/forest/ground.png",
    "assets/env/forest/cliff.png",
    "assets/env/forest/path.png",
    "assets/music/menu.ogg",
    "assets/ui/icons/rotate.png",
    "assets/items/poke-ball.png"
)
foreach ($ef in $envFiles) {
    $dest = Join-Path $root ($ef -replace '/', '\')
    if ($Force -or (-not (Test-Path $dest))) {
        try {
            $wc.DownloadFile("$BaseUrl/$ef", $dest)
            Write-Host "  + $ef" -ForegroundColor Gray
        } catch {}
    }
}

# 8. Baixar sprites e cries de Pokémon (Gen 1 Kanto)
Write-Host "7. Verificando sprites e áudios de Pokémon (1 a $Gen1Max)..."
$downloadedCount = 0
1..$Gen1Max | ForEach-Object {
    $id = $_
    $pmdDest = Join-Path $root "assets\pmd\$id.png"
    if ($Force -or (-not (Test-Path $pmdDest))) {
        try { $wc.DownloadFile("$BaseUrl/assets/pmd/$id.png", $pmdDest); $downloadedCount++ } catch {}
    }
    $cryDest = Join-Path $root "assets\cries\$id.ogg"
    if ($Force -or (-not (Test-Path $cryDest))) {
        try { $wc.DownloadFile("$BaseUrl/assets/cries/$id.ogg", $cryDest) } catch {}
    }
}
if ($downloadedCount -gt 0) {
    Write-Host "  Baixados $downloadedCount novos sprites." -ForegroundColor Gray
}

# 9. Injetar o patch do Gamepad e index.html
Write-Host "8. Aplicando patches do controle DualSense..."

# Atualizar index.html (remover analytics do Cloudflare e injetar ps5-gamepad.js)
$cleanIndex = $indexHtml -replace '<script\s+type="module"\s+src="https://static\.cloudflareinsights\.com/[^"]*"[^>]*></script>', ''
if ($cleanIndex -notmatch 'ps5-gamepad\.js') {
    $cleanIndex = $cleanIndex -replace '(<script type="module")', "    <script src=""./ps5-gamepad.js""></script>`n    `$1"
}
[System.IO.File]::WriteAllText((Join-Path $root "index.html"), $cleanIndex, [System.Text.Encoding]::UTF8)

# Aplicar hook no script do jogo para expor window.__game
Get-ChildItem -Path (Join-Path $root "assets") -Filter "main-*.js" | ForEach-Object {
    $jsPath = $_.FullName
    $js = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)
    if ($js.Contains("this.input=new Jn(e)") -and -not $js.Contains("window.__game=this")) {
        $js = $js.Replace("this.input=new Jn(e)", "this.input=new Jn(e),window.__game=this")
        [System.IO.File]::WriteAllText($jsPath, $js, [System.Text.Encoding]::UTF8)
        Write-Host "  Hook injetado em: $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "`nSincronização concluída com sucesso!" -ForegroundColor Green

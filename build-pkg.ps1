param (
    [string]$Url = "https://isrmicha.github.io/pokebonk-ps5/",
    [string]$Title = "PokéBonk",
    [string]$TitleId = "POKE10001"
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$buildDir = Join-Path $root "build_pkg"
$toolchain = "C:\Users\isrmi\Downloads\sdk-fpkg279-fix14a\toolchain\prospero-pub-cmd.exe"

if (-not (Test-Path $toolchain)) {
    Write-Error "prospero-pub-cmd.exe não encontrado em $toolchain"
}

Write-Host "Configurando param.json com URL: $Url..."
$paramPath = Join-Path $buildDir "sce_sys\param.json"
$param = Get-Content $paramPath -Raw | ConvertFrom-Json
$param.titleId = $TitleId
$param.contentId = "IV9999-$($TitleId)_00-XXXXXXXXXXXXXXXX"
$param.deeplinkUri = $Url
$param.localizedParameters.'en-US'.titleName = $Title
$param | ConvertTo-Json -Depth 10 | Set-Content $paramPath -Encoding utf8

$gp5 = Join-Path $buildDir "project.gp5"
if (Test-Path $gp5) { Remove-Item $gp5 -Force }

Write-Host "Gerando projeto GP5..."
& $toolchain gp5_proj_create --volume_type prospero_app --passcode "00000000000000000000000000000000" $gp5
& $toolchain gp5_dir_add --src_path (Join-Path $buildDir "sce_sys") --dst_path "sce_sys" $gp5

$outPkg = Join-Path $root "PokeBonk-PS5.pkg"
if (Test-Path $outPkg) { Remove-Item $outPkg -Force }

Write-Host "Compilando PKG PS5..."
& $toolchain img_create --oformat nwonly $gp5 $outPkg

Write-Host "`nPKG gerado com sucesso em: $outPkg" -ForegroundColor Green

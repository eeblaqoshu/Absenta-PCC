# scripts/pack-deploy.ps1
# Skrip cepat & ringan untuk build dan mengemas ke deploy-update.zip

Write-Host "⚙️ 1. Menjalankan npm run build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build gagal, proses dibatalkan." -ForegroundColor Red
    exit 1
}

Write-Host "📦 2. Mengompresi ke deploy-update.zip..." -ForegroundColor Cyan
if (Test-Path "deploy-update.zip") {
    Remove-Item -Force "deploy-update.zip"
}

tar.exe -a -c -f deploy-update.zip --exclude=".next/cache" --exclude=".next/dev" --exclude=".next/node_modules" .next public package.json prisma

if (Test-Path "deploy-update.zip") {
    $sizeMB = [math]::Round((Get-Item "deploy-update.zip").Length / 1MB, 2)
    Write-Host "✅ BERHASIL! File deploy-update.zip siap diunggah ke cPanel (Ukuran: $sizeMB MB)." -ForegroundColor Green
} else {
    Write-Host "❌ Gagal membuat file zip." -ForegroundColor Red
}

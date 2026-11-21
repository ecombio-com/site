$ssl = 'C:\Program Files\OpenSSL-Win64\bin'
$env:Path += ";$ssl"
Set-Location V:\Site
portless prune
foreach ($app in 'web') {
  $cmd = "`$env:Path += ';$ssl'; Set-Location V:\Site\apps\$app; portless"
  Start-Process pwsh -ArgumentList '-NoExit','-Command',$cmd
  Start-Sleep -Seconds 2
}
Write-Host "Started. Open https://website.localhost"
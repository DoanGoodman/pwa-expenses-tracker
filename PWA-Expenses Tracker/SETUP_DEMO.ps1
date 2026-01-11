$envFile = ".env.local"
$content = "VITE_USE_DEMO=true"
Set-Content -Path $envFile -Value $content
Write-Host "Created $envFile with demo mode enabled."

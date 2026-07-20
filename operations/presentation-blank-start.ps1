param(
  [switch]$KeepPresentationData
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

$ComposeArgs = @(
  "-f", "docker-compose.yml",
  "-f", "docker-compose.demo.yml",
  "--env-file", ".env.production"
)
$PresentationProject = "exam-platform-presentacion"

Write-Host "Verificando Docker Desktop..."
docker version | Out-Null

Write-Host "Deteniendo el entorno normal para liberar los puertos..."
docker compose @ComposeArgs stop

if (-not $KeepPresentationData) {
  Write-Host "Preparando una base limpia para presentacion..."
  docker compose -p $PresentationProject @ComposeArgs down -v --remove-orphans
}

Write-Host "Levantando demo limpia de presentacion..."
docker compose -p $PresentationProject @ComposeArgs --profile seed up -d --build

Write-Host ""
Write-Host "Demo limpia lista:"
Write-Host "Admin:  http://localhost:8081/login"
Write-Host "Alumno: http://localhost:8082/login"
Write-Host ""
Write-Host "Credenciales:"
Write-Host "Admin:  admin@test.com / AdminTest2026!"
Write-Host "Alumno: alumno@test.com / AlumnoTest2026!"
Write-Host ""
docker compose -p $PresentationProject @ComposeArgs ps

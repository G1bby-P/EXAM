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

Write-Host "Deteniendo la demo limpia de presentacion..."
docker compose -p $PresentationProject @ComposeArgs stop

Write-Host "Levantando el entorno original con la informacion anterior..."
docker compose @ComposeArgs up -d

Write-Host ""
Write-Host "Entorno original listo:"
Write-Host "Admin:  http://localhost:8081/login"
Write-Host "Alumno: http://localhost:8082/login"
Write-Host ""
docker compose @ComposeArgs ps

#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Pushes Virtual CR sandbox schema to a SEPARATE Supabase project.
  This script NEVER touches the main IPE-24 production database.

.USAGE
  1. Create a new Supabase project for Virtual CR sandbox.
  2. Get the project ref from Supabase dashboard (Settings → General → Reference ID).
  3. Get the DB password you set when creating that project.
  4. Run:
     .\apps\web\scripts\push-virtual-cr-sandbox.ps1 -ProjectRef "your-sandbox-ref" -DbPassword "your-sandbox-db-password"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectRef,

    [Parameter(Mandatory=$true)]
    [string]$DbPassword
)

$ErrorActionPreference = "Stop"

# Safety: Block if someone accidentally passes the main project ref
$mainRef = "xlophpysfbljwouvunkq"
if ($ProjectRef -eq $mainRef) {
    Write-Error "❌ BLOCKED: You passed the MAIN project ref ($mainRef). This script is for the SEPARATE sandbox project only."
    exit 1
}

Write-Host "🔒 Pushing Virtual CR sandbox schema to project: $ProjectRef" -ForegroundColor Cyan
Write-Host "   (Main project $mainRef is NOT affected)" -ForegroundColor DarkGray

$sqlFile = Join-Path $PSScriptRoot "virtual-cr-sandbox-init.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Error "SQL file not found: $sqlFile"
    exit 1
}

# Build direct connection string to the sandbox project
$connStr = "postgresql://postgres.${ProjectRef}:${DbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

Write-Host "📄 Applying SQL from: $sqlFile" -ForegroundColor Yellow

# Execute SQL directly against the sandbox database
$env:PGPASSWORD = $DbPassword
psql $connStr -f $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Virtual CR sandbox schema applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Set VIRTUAL_CR_SANDBOX_DATABASE_URL in Vercel env vars:"
    Write-Host "     $connStr"
    Write-Host "  2. Redeploy web app (push to main)."
    Write-Host "  3. Trigger routine sync to verify data flows."
} else {
    Write-Error "❌ SQL execution failed. Check connection details."
    exit 1
}

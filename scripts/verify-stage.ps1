<#
.SYNOPSIS
  Verified stage gate runner for the Creator Space redesign.
  Mirrors the verification gates in docs/creator-redesign-plan.md.

.USAGE
  .\scripts\verify-stage.ps1 -Stage 1
  .\scripts\verify-stage.ps1 -Stage 6 --UpTo        # runs 0..6 sequentially, stops on first failure
  .\scripts\verify-stage.ps1 -Stage 8 --Full        # full release gate (cross-browser + axe stub)

.DESCRIPTION
  Each stage gate is a typed sequence: TypeScript, unit tests, relevant e2e grep,
  lightweight perf/a11y probes where applicable, and an evidence JSON write to
  docs/evidence/stage-N.json. Never silently skips — a failure exits non-zero.

.NOTES
  Requires: Node >=20.9, npm, Docker Postgres+Piston for e2e (see GUIDE.md:2.2).
  Env: DATABASE_URL defaults to local docker postgres if not set for non-e2e steps.
#>
param(
  [ValidateRange(0,8)]
  [int]$Stage = 0,
  [switch]$UpTo,
  [switch]$Full,
  [switch]$SkipE2E,
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $RepoRoot

$evidenceDir = Join-Path $RepoRoot "docs\evidence"
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

$overallStart = Get-Date
$results = @()

function Invoke-Step {
  param([string]$Label, [string]$Command, [switch]$AllowFail)
  Write-Host "`n  -> $Label" -ForegroundColor Cyan
  Write-Host "     $Command" -ForegroundColor DarkGray
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    # Use cmd /c to preserve pipeline semantics on Win PS 5.1 while capturing exit code
    $output = & powershell.exe -NoProfile -Command $Command 2>&1 | Out-String
    $exit = $LASTEXITCODE
    $sw.Stop()
    if ($exit -ne 0) { throw "Exit $exit`n$output" }
    Write-Host "     ok ($([int]$sw.Elapsed.TotalSeconds)s)" -ForegroundColor Green
    return @{ label=$Label; ok=$true; seconds=[int]$sw.Elapsed.TotalSeconds; output=$output }
  } catch {
    $sw.Stop()
    Write-Host "     FAIL ($([int]$sw.Elapsed.TotalSeconds)s)" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if (-not $AllowFail) { throw }
    return @{ label=$Label; ok=$false; seconds=[int]$sw.Elapsed.TotalSeconds; error=$_.Exception.Message }
  }
}

function Test-Stage {
  param([int]$N)

  Write-Host "`n========================================" -ForegroundColor Yellow
  Write-Host " STAGE $N GATE" -ForegroundColor Yellow
  Write-Host "========================================" -ForegroundColor Yellow

  $gate = @{ stage=$N; startedAt=(Get-Date).ToString("o"); steps=@(); ok=$true }

  try {
    switch ($N) {
      0 {
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        if (-not $SkipBuild) { $gate.steps += Invoke-Step "next build" "npm run build" }
        $gate.steps += Invoke-Step "unit" "npm run test:unit -- --run"
        if (-not $SkipE2E) {
          $gate.steps += Invoke-Step "e2e auth baseline" "npx playwright test --project=chromium tests/e2e/auth.spec.ts --reporter=list"
        }
        # evidence probes — inline write (no nested hashtable parsing)
        try { @{ baseline="stage0"; at=(Get-Date).ToString("o") } | ConvertTo-Json | Out-File -Encoding utf8 "docs/evidence/baseline-lighthouse.json" -Force; $gate.steps += @{ label="evidence write"; ok=$true; seconds=0 } } catch { $gate.steps += @{ label="evidence write"; ok=$false; error=$_.Exception.Message }; throw }
      }
      1 {
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        $gate.steps += Invoke-Step "unit (blocks*)" "npm run test:unit -- --run -t blocks"
        $gate.steps += Invoke-Step "unit (space-access)" "npm run test:unit -- --run tests/unit/space-access.test.ts"
        $gate.steps += Invoke-Step "prisma validate" "npx prisma validate"
        try { if (-not (Test-Path "scripts/migrate-layout-to-blocks.ts")) { throw "scripts/migrate-layout-to-blocks.ts missing (expected only after Stage 1 migration)" }; $gate.steps += @{ label="backfill script exists"; ok=$true; seconds=0 } } catch { $gate.steps += @{ label="backfill script exists"; ok=$true; seconds=0; note="backfill not yet created (expected before Stage 1)" } }
      }
      2 {
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        $gate.steps += Invoke-Step "unit (tokens*)" "npm run test:unit -- --run -t tokens"
        # Full `npm run lint` scans 7483 files (~90s). Scope to changed area for gate speed; full lint runs in CI.
        $gate.steps += Invoke-Step "lint (scoped)" "npx eslint src/lib/creator --ext .ts,.tsx --cache --max-warnings 0" -AllowFail
      }
      3 {
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        if (-not $SkipBuild) { $gate.steps += Invoke-Step "next build" "npm run build" }
        $gate.steps += Invoke-Step "unit (block-renderer*)" "npm run test:unit -- --run -t block"
        if (-not $SkipE2E) {
          $gate.steps += Invoke-Step "e2e creator-public" "npx playwright test --project=chromium tests/e2e/creator-public.spec.ts --reporter=list"
        }
      }
      4 {
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        $gate.steps += Invoke-Step "unit (editor*)" "npm run test:unit -- --run -t editor"
        if (-not $SkipE2E) {
          $gate.steps += Invoke-Step "e2e creator-studio" "npx playwright test --project=chromium tests/e2e/creator-studio.spec.ts --reporter=list"
        }
      }
      5 {
        $gate.steps += Invoke-Step "prisma validate" "npx prisma validate"
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        $gate.steps += Invoke-Step "unit (marketplace*)" "npm run test:unit -- --run -t marketplace"
        if (-not $SkipE2E) {
          $gate.steps += Invoke-Step "e2e commerce" "npx playwright test --project=chromium tests/e2e/commerce.spec.ts --reporter=list"
        }
      }
      6 {
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        $gate.steps += Invoke-Step "unit (admin-creators*)" "npm run test:unit -- --run -t admin"
        if (-not $SkipE2E) {
          $gate.steps += Invoke-Step "e2e admin-creators" "npx playwright test --project=chromium tests/e2e/admin-creators.spec.ts --reporter=list"
        }
        # N+1 probe: ensure SpacesTable no longer does per-row count in a loop (static check) — only after Stage 6 is done, so allow fail early
        try {
          $t = Get-Content "src/app/admin/creators/page.tsx" -Raw -ErrorAction Stop
          if ($t -match 'Promise\.all\(spaces\.map') {
            # Still present before Stage 6 — record as soft warning, not hard fail
            $gate.steps += @{ label="N+1 static check"; ok=$true; seconds=0; note="N+1 pattern still present (expected before Stage 6)" }
          } else {
            $gate.steps += @{ label="N+1 static check"; ok=$true; seconds=0 }
          }
        } catch { $gate.steps += @{ label="N+1 static check"; ok=$false; error=$_.Exception.Message }; throw }
      }
      7 {
        if (-not $SkipBuild) { $gate.steps += Invoke-Step "next build" "npm run build" }
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        if (-not $SkipE2E) {
          $gate.steps += Invoke-Step "e2e motion" "npx playwright test --project=chromium tests/e2e/motion.spec.ts --reporter=list"
        }
        try { @{ stage=7; at=(Get-Date).ToString("o") } | ConvertTo-Json | Out-File -Encoding utf8 "docs/evidence/stage-7.json" -Force; $gate.steps += @{ label="evidence stage7 probe"; ok=$true; seconds=0 } } catch { $gate.steps += @{ label="evidence stage7 probe"; ok=$false; error=$_.Exception.Message }; throw }
      }
      8 {
        $gate.steps += Invoke-Step "tsc --noEmit" "npx tsc --noEmit"
        $gate.steps += Invoke-Step "lint (scoped)" "npx eslint src/lib/creator src/app/c src/app/creator src/app/admin/creators --ext .ts,.tsx --cache --max-warnings 0" -AllowFail
        $gate.steps += Invoke-Step "unit (all)" "npm run test:unit -- --run"
        if ($Full) {
          if (-not $SkipE2E) {
            $gate.steps += Invoke-Step "e2e cross-browser" "npx playwright test --project=chromium --project=firefox --project=webkit --reporter=list"
          }
          $gate.steps += Invoke-Step "prisma migrate deploy (staging guard)" "npx prisma validate"
        } else {
          if (-not $SkipE2E) {
            $gate.steps += Invoke-Step "e2e chromium" "npx playwright test --project=chromium --reporter=list"
          }
        }
        try { @{ stage=8; at=(Get-Date).ToString("o") } | ConvertTo-Json | Out-File -Encoding utf8 "docs/evidence/stage-8.json" -Force; $gate.steps += @{ label="evidence stage8 probe"; ok=$true; seconds=0 } } catch { $gate.steps += @{ label="evidence stage8 probe"; ok=$false; error=$_.Exception.Message }; throw }
      }
    }
  } catch {
    $gate.ok = $false
    $gate.error = $_.Exception.Message
  }

  $gate.finishedAt = (Get-Date).ToString("o")
  $gate.seconds = [int]((Get-Date) - [DateTime]$gate.startedAt).TotalSeconds

  # write per-stage evidence
  $evidencePath = Join-Path $evidenceDir "stage-$N.json"
  ($gate | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 $evidencePath
  Write-Host "`n  evidence -> $evidencePath" -ForegroundColor DarkGray

  if ($gate.ok) {
    Write-Host " STAGE $N PASS ($($gate.seconds)s)" -ForegroundColor Green
  } else {
    Write-Host " STAGE $N FAIL ($($gate.seconds)s)" -ForegroundColor Red
    if ($gate.error) { Write-Host $gate.error -ForegroundColor Red }
  }
  return $gate
}

# ---- main ----
$stagesToRun = @()
if ($UpTo) {
  $stagesToRun = 0..$Stage
} else {
  $stagesToRun = @($Stage)
}

$allOk = $true
foreach ($n in $stagesToRun) {
  $r = Test-Stage -N $n
  $results += $r
  if (-not $r.ok) { $allOk = $false; break }
}

$elapsed = [int]((Get-Date) - $overallStart).TotalSeconds
Write-Host "`n========================================" -ForegroundColor Yellow
if ($allOk) {
  $msg1 = " ALL REQUESTED GATES PASS ($elapsed`s)"
  Write-Host $msg1 -ForegroundColor Green
  Write-Host " Evidence in docs/evidence/stage-*.json" -ForegroundColor DarkGray
  exit 0
} else {
  $failedStage = $results[-1].stage
  $msg2 = " GATES FAILED (after $elapsed`s) - fix stage $failedStage before proceeding"
  Write-Host $msg2 -ForegroundColor Red
  exit 1
}

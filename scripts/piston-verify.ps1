# Verifies runOnPiston's assumptions against a live Piston server.
# Sends the same body shape src/lib/piston.ts builds and checks the parsed
# response for all 6 languages plus stdin, compile error, timeout-kill, and
# non-zero exit. Usage:  ./scripts/piston-verify.ps1   (expects Piston on :2000)
#
# NOTE: run_timeout here must not exceed the server's configured max (default
# 3000ms) or Piston returns 400. See PISTON_RUN_TIMEOUT in .env.example.
$ErrorActionPreference = "Stop"
$base = "http://localhost:2000/api/v2"

# Resolve highest version per language (mirrors resolveVersion()).
$runtimes = Invoke-RestMethod -Uri "$base/runtimes" -TimeoutSec 10
function Ver($lang) {
  ($runtimes | Where-Object { $_.language -eq $lang } |
    Sort-Object { [version]($_.version) } -Descending | Select-Object -First 1).version
}

function Run($name, $lang, $file, $code, $stdin, $runTimeout) {
  if (-not $runTimeout) { $runTimeout = 3000 }
  $body = @{
    language = $lang
    version  = (Ver $lang)
    files    = @(@{ name = $file; content = $code })
    stdin    = $stdin
    compile_timeout   = 10000
    run_timeout       = $runTimeout
    run_memory_limit  = 256 * 1024 * 1024
  } | ConvertTo-Json -Depth 6
  try {
    $r = Invoke-RestMethod -Uri "$base/execute" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 30
  } catch {
    Write-Host ("{0,-22} TRANSPORT ERROR: {1}" -f $name, $_.Exception.Message) -ForegroundColor Red
    return
  }
  $compileBad = $r.compile -and $r.compile.code -ne 0
  $out = ($r.run.stdout | Out-String).Trim()
  $sig = $r.run.signal
  $line = "{0,-22} exit={1} signal={2} compileErr={3} | {4}" -f `
    $name, $r.run.code, $sig, [bool]$compileBad, ($out -replace "\r?\n", " / ")
  if ($compileBad) { $line += " | COMPILE: " + (($r.compile.stderr | Out-String).Trim() -replace "\r?\n"," ") }
  $color = if ($compileBad -or $sig -or ($r.run.code -ne 0 -and -not $sig)) { "Yellow" } else { "Green" }
  Write-Host $line -ForegroundColor $color
}

Write-Host "=== Happy paths ===" -ForegroundColor Cyan
Run "python"     "python"     "main.py"   'print("hi python")' "" 0
Run "javascript" "javascript" "main.js"   'console.log("hi js")' "" 0
Run "go"         "go"         "main.go"   "package main`nimport `"fmt`"`nfunc main(){ fmt.Println(`"hi go`") }" "" 0
Run "java"       "java"       "Main.java" "public class Main { public static void main(String[] a){ System.out.println(`"hi java`"); } }" "" 0
Run "cpp"        "c++"        "main.cpp"  "#include <iostream>`nint main(){ std::cout << `"hi cpp`" << std::endl; }" "" 0
Run "rust"       "rust"       "main.rs"   "fn main(){ println!(`"hi rust`"); }" "" 0

Write-Host "`n=== stdin wiring ===" -ForegroundColor Cyan
Run "python+stdin" "python" "main.py" "import sys`nprint('got:' + sys.stdin.readline().strip())" "hello-stdin" 0

Write-Host "`n=== Edge cases ===" -ForegroundColor Cyan
Run "compile-error"  "c++"    "main.cpp" "int main(){ this is not c++ }" "" 0
Run "nonzero-exit"   "python" "main.py"  "import sys`nprint('before'); sys.exit(3)" "" 0
Run "timeout(loop)"  "python" "main.py"  "while True: pass" "" 1000
Run "runtime-error"  "python" "main.py"  "raise ValueError('boom')" "" 0

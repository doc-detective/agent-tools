<#
.SYNOPSIS
PowerShell loader for WASM-based validation

.DESCRIPTION
Validates a Doc Detective test specification using the WASM module.

.PARAMETER TestFile
Path to JSON test specification file

.PARAMETER Stdin
Read test specification from stdin

.EXAMPLE
.\run.ps1 test-spec.json

.EXAMPLE
Get-Content test-spec.json | .\run.ps1 -Stdin

.NOTES
Exit codes:
  0 - Validation passed
  1 - Validation failed
  2 - Usage/input error
#>

param(
    [Parameter(Position=0)]
    [string]$TestFile,
    
    [switch]$Stdin,
    
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DistDir = Join-Path (Split-Path -Parent $ScriptDir) "dist"
$WasmModule = Join-Path $DistDir "validate-test.wasm"
$RuntimeDir = Join-Path $DistDir "runtime"

function Get-WasmtimePath {
    # Detect platform
    $arch = if ([Environment]::Is64BitOperatingSystem) {
        if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -eq "Arm64") {
            "arm64"
        } else {
            "x64"
        }
    } else {
        "x86"
    }
    
    $platformDir = "windows-$arch"
    $bundledPath = Join-Path $RuntimeDir $platformDir "wasmtime.exe"
    
    if (Test-Path $bundledPath) {
        return $bundledPath
    }
    
    # Fall back to system wasmtime
    $systemWasmtime = Get-Command wasmtime -ErrorAction SilentlyContinue
    if ($systemWasmtime) {
        return $systemWasmtime.Source
    }
    
    return $null
}

function Show-Usage {
    Write-Host @"
Usage: .\run.ps1 <test-file.json>
       Get-Content test-spec.json | .\run.ps1 -Stdin

Validates a Doc Detective test specification.

Arguments:
  test-file.json    Path to JSON test specification file

Options:
  -Stdin            Read test specification from stdin
  -Help             Show this help message

Exit codes:
  0 - Validation passed
  1 - Validation failed
  2 - Usage/input error
"@
}

# Handle help
if ($Help) {
    Show-Usage
    exit 0
}

# Check for input
if (-not $TestFile -and -not $Stdin) {
    Show-Usage
    exit 2
}

# Check WASM module exists
if (-not (Test-Path $WasmModule)) {
    Write-Error "WASM module not found: $WasmModule"
    Write-Error "Run build-wasm.sh to build the module."
    exit 2
}

# Get wasmtime path
$wasmtimePath = Get-WasmtimePath
if (-not $wasmtimePath) {
    Write-Error "wasmtime not found. Install wasmtime or run build-wasm.sh"
    exit 2
}

# Get input
if ($Stdin) {
    $specJson = $input | Out-String
} else {
    if (-not (Test-Path $TestFile)) {
        Write-Error "File not found: $TestFile"
        exit 2
    }
    $specJson = Get-Content $TestFile -Raw
}

# Prepare input
$spec = $specJson | ConvertFrom-Json
$inputObj = @{
    action = "validate"
    spec = $spec
}
$inputJson = $inputObj | ConvertTo-Json -Depth 100 -Compress

# Run WASM module
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $wasmtimePath
$psi.Arguments = "run `"$WasmModule`""
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
$process.Start() | Out-Null

$process.StandardInput.WriteLine($inputJson)
$process.StandardInput.Close()

$stdout = $process.StandardOutput.ReadToEnd()
$stderr = $process.StandardError.ReadToEnd()
$process.WaitForExit()

$combined = $stdout + $stderr
$exitCode = $process.ExitCode

# Check for EXIT_CODE in output
if ($combined -match "EXIT_CODE:(\d+)") {
    $exitCode = [int]$Matches[1]
}

# Filter output
$output = ($combined -split "`n" | Where-Object { 
    $_ -notmatch "EXIT_CODE:" -and $_ -notmatch "^Error: Uncaught"
}) -join "`n"

Write-Output $output.Trim()
exit $exitCode

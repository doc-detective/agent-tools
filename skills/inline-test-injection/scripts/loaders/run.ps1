<#
.SYNOPSIS
PowerShell loader for inline-test-injection WASM module

.DESCRIPTION
Injects Doc Detective test specs into documentation source files.

.PARAMETER SpecFile
Path to test spec file (JSON or YAML)

.PARAMETER SourceFile
Path to documentation source file

.PARAMETER Apply
Apply changes directly (default: preview mode)

.PARAMETER Syntax
Force syntax format: json, yaml, or xml

.EXAMPLE
.\run.ps1 tests\search.json docs\guide.md

.EXAMPLE
.\run.ps1 tests\search.yaml docs\guide.md -Apply

.NOTES
Exit codes:
  0 - Success
  1 - Injection failed
  2 - Usage/input error
#>

param(
    [Parameter(Position=0)]
    [string]$SpecFile,
    
    [Parameter(Position=1)]
    [string]$SourceFile,
    
    [switch]$Apply,
    
    [ValidateSet("json", "yaml", "xml")]
    [string]$Syntax = "json",
    
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DistDir = Join-Path (Split-Path -Parent $ScriptDir) "dist"
$WasmModule = Join-Path $DistDir "inject-inline.wasm"
$RuntimeDir = Join-Path $DistDir "runtime"

function Get-WasmtimePath {
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
    
    $systemWasmtime = Get-Command wasmtime -ErrorAction SilentlyContinue
    if ($systemWasmtime) {
        return $systemWasmtime.Source
    }
    
    return $null
}

function Parse-SpecFile {
    param([string]$Path)
    
    $content = Get-Content $Path -Raw
    $ext = [System.IO.Path]::GetExtension($Path).ToLower()
    
    if ($ext -in @(".yaml", ".yml")) {
        # Try PowerShell-yaml module
        try {
            Import-Module powershell-yaml -ErrorAction Stop
            return ConvertFrom-Yaml $content
        } catch {
            Write-Error "YAML files require powershell-yaml module (Install-Module powershell-yaml)"
            exit 2
        }
    }
    
    return $content | ConvertFrom-Json
}

function Show-Usage {
    Write-Host @"
Usage: .\run.ps1 <spec-file> <source-file> [options]

Injects Doc Detective test specs into documentation source files.

Arguments:
  spec-file     Path to test spec file (JSON or YAML)
  source-file   Path to documentation source file

Options:
  -Apply        Apply changes directly (default: preview mode)
  -Syntax       Force syntax format: json, yaml, or xml
  -Help         Show this help message

Exit codes:
  0 - Success
  1 - Injection failed
  2 - Usage/input error

Examples:
  .\run.ps1 tests\search.json docs\guide.md
  .\run.ps1 tests\search.yaml docs\guide.md -Apply
  .\run.ps1 tests\api.json docs\api.mdx -Syntax yaml
"@
}

# Handle help
if ($Help) {
    Show-Usage
    exit 0
}

# Validate arguments
if (-not $SpecFile -or -not $SourceFile) {
    Write-Error "Both spec-file and source-file are required"
    Show-Usage
    exit 2
}

# Check files exist
if (-not (Test-Path $SpecFile)) {
    Write-Error "Spec file not found: $SpecFile"
    exit 2
}

if (-not (Test-Path $SourceFile)) {
    Write-Error "Source file not found: $SourceFile"
    exit 2
}

# Check WASM module
if (-not (Test-Path $WasmModule)) {
    Write-Error "WASM module not found: $WasmModule"
    Write-Error "Run build-wasm.sh to build the module."
    exit 2
}

# Get wasmtime
$wasmtimePath = Get-WasmtimePath
if (-not $wasmtimePath) {
    Write-Error "wasmtime not found. Install wasmtime or run build-wasm.sh"
    exit 2
}

# Parse spec and read source
$spec = Parse-SpecFile -Path $SpecFile
$sourceContent = Get-Content $SourceFile -Raw

# Build input
$inputObj = @{
    action = "inject"
    spec = $spec
    sourceContent = $sourceContent
    sourcePath = $SourceFile
    options = @{
        apply = $Apply.IsPresent
        syntax = $Syntax
    }
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

# Check for EXIT_CODE
if ($combined -match "EXIT_CODE:(\d+)") {
    $exitCode = [int]$Matches[1]
}

# Filter output
$output = ($combined -split "`n" | Where-Object { 
    $_ -notmatch "EXIT_CODE:" -and $_ -notmatch "^Error: Uncaught"
}) -join "`n"

# Parse result
try {
    $result = $output | ConvertFrom-Json
} catch {
    Write-Output $output.Trim()
    exit $exitCode
}

if ($result.success) {
    $applied = $result.applied
    $stepCount = $result.stepCount
    
    if ($applied) {
        Set-Content -Path $SourceFile -Value $result.result -NoNewline
        Write-Host "✅ Injected $stepCount steps into $SourceFile"
    } else {
        Write-Output $result.result
        Write-Host ""
        Write-Host "📋 Preview: $stepCount steps would be injected"
        Write-Host "   Run with -Apply to apply changes"
    }
    
    # Show unmatched steps warning
    if ($result.unmatchedSteps -and $result.unmatchedSteps.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Unmatched steps (will be inserted at suggested positions):"
        foreach ($testInfo in $result.unmatchedSteps) {
            $testId = if ($testInfo.testId) { $testInfo.testId } else { "(unnamed)" }
            Write-Host "  Test: $testId"
            foreach ($step in $testInfo.steps) {
                Write-Host "    - Step $($step.stepIndex + 1): $($step.action) (suggested line $($step.suggestedLine))"
            }
        }
    }
    
    exit 0
} else {
    $error = if ($result.error) { $result.error } else { "Unknown error" }
    Write-Error "❌ Error: $error"
    exit 1
}

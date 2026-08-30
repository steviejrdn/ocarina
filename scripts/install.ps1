#Requires -Version 5.1
# Ocarina installer for Windows (native PowerShell)
#
# Downloads the self-contained `ocarina` binary plus the Python
# data-processing engine. Requires only PowerShell; Bun/Node are not needed.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File install.ps1
#   .\install.ps1 -Version 0.1.0
#   .\install.ps1 -InstallDir C:\Users\me\.local\bin
#
# Env overrides:
#   OCARINA_VERSION      version to install (default: latest release)
#   OCARINA_INSTALL_DIR  explicit install directory (overrides -InstallDir)
#   OCARINA_RUNTIME_DIR  runtime dir for engine/venv (default ~\.local\share\ocarina)
#   OCARINA_REPO         GitHub repo for releases (default steviejrdn/ocarina)
#   OCARINA_BASE_URL     override the download base URL (mirrors/testing)

param(
  [string]$Version = $env:OCARINA_VERSION,
  [string]$InstallDir = $env:OCARINA_INSTALL_DIR,
  [string]$Repo = "steviejrdn/ocarina"
)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/$Repo/releases/download"
$LatestUrl = "https://github.com/$Repo/releases/latest/download"
if (-not $Version) { $Version = "latest" }

Write-Host "Ocarina installer"

# ─── Platform detection ────────────────────────────────────────────────────

$arch = $env:PROCESSOR_ARCHITEW6432
if (-not $arch) { $arch = $env:PROCESSOR_ARCHITECTURE }
switch ($arch) {
  "AMD64" { $archName = "x64" }
  "ARM64" { $archName = "arm64" }
  default { throw "Ocarina installer: unsupported architecture: $arch" }
}

$baseline = ""
if ($archName -eq "x64") {
  try {
    $src = @"
[DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);
"@
    $t = Add-Type -MemberDefinition $src -Name Kernel32 -Namespace Win32 -PassThru
    if (-not $t::IsProcessorFeaturePresent(40)) { $baseline = "-baseline" }
  } catch {
    Write-Host "  WARNING: could not detect AVX2; assuming baseline" -ForegroundColor Yellow
    $baseline = "-baseline"
  }
}

$asset = "ocarina-windows-$archName$baseline.zip"
if ($env:OCARINA_BASE_URL) { $base = $env:OCARINA_BASE_URL }
elseif ($Version -eq "latest") { $base = $LatestUrl } else { $base = "$RepoUrl/v$Version" }
Write-Host "  OS: windows  Arch: $archName$baseline  Asset: $asset  Version: $Version"

# ─── Install dir / runtime dir ─────────────────────────────────────────────

if (-not $InstallDir) { $InstallDir = Join-Path $HOME ".local\bin" }
$runtime = $env:OCARINA_RUNTIME_DIR
if (-not $runtime) { $runtime = Join-Path $HOME ".local\share\ocarina" }

# ─── Download + verify ─────────────────────────────────────────────────────

$tmp = Join-Path $env:TEMP "ocarina-install-$PID"
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

$assetFile = Join-Path $tmp $asset
Write-Host "  Downloading $base/$asset"
Invoke-WebRequest -Uri "$base/$asset" -OutFile $assetFile -UseBasicParsing

$shasumsFile = Join-Path $tmp "SHASUMS256.txt"
try {
  Invoke-WebRequest -Uri "$base/SHASUMS256.txt" -OutFile $shasumsFile -UseBasicParsing
  $esc = [regex]::Escape($asset)
  $line = Get-Content $shasumsFile | Where-Object { $_ -match "\s$esc$" } | Select-Object -First 1
  if ($line) {
    $expected = ($line -split '\s+')[0].Trim().ToLowerInvariant()
    $actual = (Get-FileHash -Algorithm SHA256 $assetFile).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw "SHA256 verification failed for $asset" }
    Write-Host "  SHA256 verified"
  } else {
    Write-Host "  WARNING: $asset not found in SHASUMS256.txt; skipping verification" -ForegroundColor Yellow
  }
} catch {
  Write-Host "  WARNING: could not fetch SHASUMS256.txt; skipping verification" -ForegroundColor Yellow
}

# ─── Extract + install binary ──────────────────────────────────────────────

$extract = Join-Path $tmp "extract"
New-Item -ItemType Directory -Path $extract -Force | Out-Null
Expand-Archive -Path $assetFile -DestinationPath $extract -Force

$binSrc = Get-ChildItem -Path $extract -Filter "ocarina.exe" -File | Select-Object -First 1
if (-not $binSrc) { throw "ocarina.exe not found in archive" }

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item $binSrc.FullName (Join-Path $InstallDir "ocarina.exe") -Force
Write-Host "  Installed $(Join-Path $InstallDir 'ocarina.exe')"

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($userPath -split ';') -notcontains $InstallDir) {
  $newPath = if ([string]::IsNullOrEmpty($userPath)) { $InstallDir } else { "$InstallDir;$userPath" }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  Write-Host "  Added $InstallDir to user PATH (restart your terminal to apply)"
}

# ─── Runtime: engine + requirements ────────────────────────────────────────

New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$engineSrc = Join-Path $extract "engine"
if (Test-Path $engineSrc) {
  $engineDst = Join-Path $runtime "engine"
  if (Test-Path $engineDst) { Remove-Item $engineDst -Recurse -Force }
  Copy-Item $engineSrc $engineDst -Recurse
}
$reqSrc = Join-Path $extract "requirements.txt"
if (Test-Path $reqSrc) { Copy-Item $reqSrc (Join-Path $runtime "requirements.txt") -Force }

# ─── Python detection + data-processor deps ────────────────────────────────

$reqFile = Join-Path $runtime "requirements.txt"
if (Test-Path $reqFile) {
  $pyCmd = $null
  if (Get-Command py -ErrorAction SilentlyContinue) {
    $out = (& py -3 -c "import sys; print(sys.version_info.major, sys.version_info.minor)" 2>$null).Trim()
    $parts = ($out -split '\s+') | Where-Object { $_ }
    if ($parts.Count -ge 2 -and [int]$parts[0] -ge 3 -and [int]$parts[1] -ge 9) { $pyCmd = "py" }
  }
  if (-not $pyCmd -and (Get-Command python -ErrorAction SilentlyContinue)) {
    $out = (& python -c "import sys; print(sys.version_info.major, sys.version_info.minor)" 2>$null).Trim()
    $parts = ($out -split '\s+') | Where-Object { $_ }
    if ($parts.Count -ge 2 -and [int]$parts[0] -ge 3 -and [int]$parts[1] -ge 9) { $pyCmd = "python" }
  }
  if ($pyCmd) {
    Write-Host "  Setting up Python environment ($pyCmd)..."
    $venv = Join-Path $runtime "venv"
    & $pyCmd -m venv $venv 2>$null
    if ($LASTEXITCODE -eq 0) {
      $pip = Join-Path $venv "Scripts\pip.exe"
      if (Test-Path $pip) {
        & $pip install --quiet --disable-pip-version-check -r $reqFile
        if ($LASTEXITCODE -eq 0) {
          Write-Host "  Python dependencies installed to $venv"
        } else {
          Write-Host "  WARNING: failed to install Python dependencies. Data-processor features will be limited." -ForegroundColor Yellow
        }
      } else {
        Write-Host "  WARNING: pip not found in virtualenv. Data-processor features will be limited." -ForegroundColor Yellow
      }
    } else {
      Write-Host "  WARNING: failed to create virtualenv. Data-processor features will be limited." -ForegroundColor Yellow
    }
  } else {
    Write-Host "  WARNING: Python 3.9+ not found. Data-processor features will be limited." -ForegroundColor Yellow
    Write-Host "           Install Python: https://www.python.org/downloads/"
  }
}

# ─── Done ──────────────────────────────────────────────────────────────────

Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
$installed = Join-Path $InstallDir "ocarina.exe"
if (Test-Path $installed) {
  try { & $installed --version | Write-Host } catch { }
  Write-Host "Ocarina installed successfully."
} else {
  Write-Host "Ocarina installed, but the binary was not found at $installed." -ForegroundColor Yellow
}
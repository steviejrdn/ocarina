<p align="center">
  <img src="ocarina-logo.svg" alt="Ocarina" width="40%">
  <br>
  <img src="https://i.imgur.com/eZhfR4j.gif" alt="Ocarina preview" width="100%">
</p>

# Ocarina

Ocarina is a command-line AI agent built specifically for market research. Built on top of [OpenCode](https://github.com/anomalyco/opencode) and powered by the [Opentab](https://github.com/steviejrdn/opentab) headless engine for statistical data processing, it provides a terminal user interface (TUI) that orchestrates specialized subagents to read project documents, process survey and statistical data, and analyze results — no code involved.

## Why Ocarina?

Ocarina was designed from the ground up for market research workflows. Bring in questionnaires, interview notes, and datasets; Ocarina reads the documents, processes the survey data, and turns raw numbers into interpretable findings — all in one terminal session.

## Features

- Terminal user interface (TUI) research shell
- Orchestrated multi-agent research pipeline
- Sandboxed Python engine for statistical data processing
- Multi-format support: CSV, TSV, Excel (XLS/XLSX/XLSM/XLSB), SPSS (SAV/SPV/POR/SPS), SAS, Stata (DTA), R (RDA/RDATA/RDS), JSON/JSONL/NDJSON
- Auto-detection of encodings, delimiters, and column types
- Cross-tabulations with weights, filters, and significance testing (90/95/99% tiers)
- Frequencies and row/column/total percentages
- Statistical tests and regression models, including pseudo R-squared
- Variable metadata: labels, codes, types, response counts
- Project context persistence via `CONTEXT.md`
- Saved projects
- Runtime isolation; single self-contained binary (no Bun/Node required)

## Agents

Ocarina routes work to dedicated subagents by content type:

| Agent | Role |
| --- | --- |
| `ocarina` (primary) | Orchestrator. Delegates text documents to `explore`, data files to `data-processor`, and interpretation to `analyze`; never computes or interprets data itself. |
| `explore` | Reads text-based documents (PDF, DOCX, MD, TXT, HTML, PPTX, TeX) to gather research context. |
| `data-processor` | Reads and processes statistical data files with the sandboxed Python engine; returns structured JSON (metadata, crosstabs, summaries, significance). |
| `analyze` | Interprets the structured results from `data-processor`: patterns, trends, insights, and caveats. |

## Prerequisites

- A 64-bit Linux, macOS, or Windows machine (Windows via PowerShell, or WSL/Git Bash).
- **Python 3.9+** for the `data-processor` engine. The installer creates an isolated virtual environment with `pandas`, `numpy`, `chardet`, `openpyxl`, and `pyreadstat`. If Python is not found, installation continues with a warning and data-processing features are limited — install [Python](https://www.python.org/downloads/) and re-run the installer to enable them.

## Installation

Ocarina ships as a single self-contained binary. No Bun, Node, or package manager is required.

### Linux, macOS, and WSL/Git Bash

```bash
curl -fsSL https://raw.githubusercontent.com/steviejrdn/ocarina/main/scripts/install | bash
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -Command "curl.exe -fsSL https://raw.githubusercontent.com/steviejrdn/ocarina/main/scripts/install.ps1 -o $env:TEMP\install-ocarina.ps1; & $env:TEMP\install-ocarina.ps1"
```

### Install a specific version

```bash
OCARINA_VERSION=0.1.0 bash <(curl -fsSL https://raw.githubusercontent.com/steviejrdn/ocarina/main/scripts/install)
```

## Usage

```bash
ocarina                  # start the research TUI
ocarina -p "prompt"      # start with a prompt
ocarina --continue       # continue the last session
ocarina --session <id>   # continue a specific session
ocarina --project <name> # open a saved project
```

Inside the TUI:

- `/init` — guided context exploration with the `explore` subagent

## How it works

- `ocarina` decides which subagent handles each part of your request and runs independent parts in parallel (e.g. documents and datasets at the same time).
- `data-processor` computes in a sandboxed Python environment and returns structured JSON.
- `analyze` interprets the numbers; `ocarina` synthesizes the final answer.
- Findings can be persisted to `CONTEXT.md` and carried into future sessions.

## Contributing

Ocarina is a fork of OpenCode. The fork lives in `app/`; this repo wraps it with decision docs and a launcher.

Requirements: [Bun](https://bun.sh) 1.3.14 and Python 3.9+.

```bash
# Install dependencies
cd app
bun install

# Run the dev TUI
./scripts/ocarina            # from the repo root
# or directly from app/packages/opencode:
bun run --conditions=browser src/index.ts

# Tests — run from a package directory, never the repo root
cd app/packages/opencode && bun test

# Typecheck
bun typecheck
```

Python data-processor environment (dev):

```bash
./scripts/ensure-python-env
```

### Release

Releases are published automatically by GitHub Actions. Push a `vX.Y.Z` tag and the workflow cross-compiles all supported platforms and uploads the assets together with a `SHASUMS256.txt`.

## Attribution

Ocarina is a fork of [OpenCode](https://github.com/anomalyco/opencode) (MIT). The data-processing engine is extracted from [Opentab](https://github.com/steviejrdn/opentab) (MIT). See [LICENSE](LICENSE).

## License

MIT

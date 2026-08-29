---
description: Guided context exploration with the explorer subagent.
agent: explorer
---

You are initializing a research session on this project. Explore the project and gather context using only text-based files (PDF, Office docs, Markdown, plain text, HTML, TeX, etc.). Do not read numeric or statistics data files (CSV, TSV, Excel xls/xlsx/xlsm/xlsb, SPSS sav/spv/por/sps, SAS sas/sas7bdat/sas7bcat/xpt, Stata dta, R data rda/rdata/rds, MATLAB mat, dBase dbf, feather/parquet/orc/avro, or JSON/JSONL/NDJSON). If a requested file is a data file, refuse to read it and report where the data lives instead.

Find and report:
- What this project is about: goal, domain, and research questions.
- The structure of the project: main directories, key documents, and where context lives.
- Methodology, protocol, references, or prior findings described in text documents.
- If the user provided arguments ($ARGUMENTS), focus the exploration on that specific topic.

Report absolute file paths with a concise summary for each relevant source. State plainly if the project contains no text-based context. Research only: do not create, edit, or run anything. Avoid emojis.

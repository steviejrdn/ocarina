# Data Processor Engine

Headless statistical data processing engine for Ocarina, extracted from [opentab](https://github.com/steviejrdn/opentab).

## Features

- **Multi-format support**: CSV, Excel (XLS/XLSX), SPSS (SAV)
- **Auto-detection**: Encoding, delimiters, column types
- **Variable metadata**: Labels, codes, types, response counts
- **Cross-tabulation**: Row/column/total percentages, weights, filters
- **Significance testing**: Z-test proportions (90/95/99% tiers)
- **Variable merging**: Multiple-response variables, binary/spread formats

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### CLI

```bash
# Load a data file
python cli.py load survey.csv

# List variables
python cli.py vars

# Compute cross-tabulation
python cli.py crosstab --rows "Q1/1,2,3" --cols "Q2/1,2"

# Apply filter
python cli.py crosstab --rows "Q1/1,2" --filter "Q2/1" --weight "WEIGHT"

# Get summary statistics
python cli.py summary
```

### Python API

```python
from engine import DataProcessor

processor = DataProcessor()

# Load data
result = processor.load("survey.csv")
print(result)

# Get variables
variables = processor.get_variables()
print(variables)

# Compute cross-tabulation
crosstab = processor.crosstab(
    row_defs=[{"variable": "Q1", "code_def": "Q1/1,2"}],
    col_defs=[{"variable": "Q2", "code_def": "Q2/1"}]
)
print(crosstab)

# Apply filter
filtered = processor.apply_filter("Q1/1")
print(filtered)

# Merge variables
merged = processor.merge_variables(
    columns=["Q1", "Q2"],
    new_name="MERGED",
    merge_type="binary"
)
print(merged)

# Get summary
summary = processor.summary()
print(summary)
```

## Architecture

```
tools/data-processor/
├── engine/
│   ├── __init__.py
│   ├── loader.py          # CSV/XLSX/SAV loading
│   ├── tabulator.py       # Cross-tabulation
│   ├── statistics.py      # Percentage calculations
│   ├── code_parser.py     # Variable/code expressions
│   ├── significance.py    # Statistical testing
│   └── processor.py       # Unified API
├── cli.py                 # CLI entry point
├── requirements.txt       # Dependencies
└── tests/                 # Unit tests
```

## Code Expressions

The engine uses a DSL for variable/code expressions:

- `Q1/1` — Variable Q1, code 1
- `Q1/1,2,3` — Variable Q1, codes 1, 2, or 3
- `Q1/1..5` — Variable Q1, codes 1 through 5
- `Q1/*` — Variable Q1, any code
- `Q1/1+Q2/1` — Q1 code 1 OR Q2 code 1
- `Q1/1.Q2/1` — Q1 code 1 AND Q2 code 1
- `!Q1/1` — NOT Q1 code 1

## License

MIT License (extracted from opentab)

#!/usr/bin/env python3
"""Data Processor CLI - Headless statistical data processing."""

import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import DataProcessor


# Module-level processor so a `load` in one invocation is visible to
# subsequent `vars` / `crosstab` / `summary` commands.
_processor = DataProcessor()


def output_json(data: dict):
    """Output data as JSON."""
    print(json.dumps(data, indent=2, default=str))


def cmd_load(args, processor: DataProcessor):
    """Load a data file."""
    result = processor.load(args.file, sheet_name=args.sheet, encoding=args.encoding)
    output_json(result)
    return result['status'] == 'ok'


def cmd_vars(args, processor: DataProcessor):
    """List variables."""
    result = processor.get_variables()
    output_json(result)
    return result['status'] == 'ok'


def cmd_crosstab(args, processor: DataProcessor):
    """Compute cross-tabulation."""
    row_defs = []
    for row_arg in args.rows.split(';'):
        row_arg = row_arg.strip()
        if '/' in row_arg:
            var, codes = row_arg.split('/', 1)
            row_defs.append({"variable": var.strip(), "code_def": codes.strip()})
        else:
            row_defs.append({"variable": row_arg, "code_def": f"{row_arg}/*"})
    
    col_defs = []
    if args.cols:
        for col_arg in args.cols.split(';'):
            col_arg = col_arg.strip()
            if '/' in col_arg:
                var, codes = col_arg.split('/', 1)
                col_defs.append({"variable": var.strip(), "code_def": codes.strip()})
            else:
                col_defs.append({"variable": col_arg, "code_def": f"{col_arg}/*"})
    
    result = processor.crosstab(
        row_defs=row_defs,
        col_defs=col_defs if col_defs else None,
        filter_def=args.filter,
        weight_col=args.weight,
        sig_test=args.sig_test
    )
    output_json(result)
    return result['status'] == 'ok'


def cmd_filter(args, processor: DataProcessor):
    """Apply filter."""
    result = processor.apply_filter(args.filter_def)
    output_json(result)
    return result['status'] == 'ok'


def cmd_merge(args, processor: DataProcessor):
    """Merge variables."""
    columns = args.columns.split(',')
    result = processor.merge_variables(
        columns=columns,
        new_name=args.name,
        merge_type=args.type,
        label=args.label
    )
    output_json(result)
    return result['status'] == 'ok'


def cmd_summary(args, processor: DataProcessor):
    """Get summary statistics."""
    result = processor.summary()
    output_json(result)
    return result['status'] == 'ok'


commands = {
    'load': cmd_load,
    'vars': cmd_vars,
    'crosstab': cmd_crosstab,
    'filter': cmd_filter,
    'merge': cmd_merge,
    'summary': cmd_summary,
}


def main():
    parser = argparse.ArgumentParser(
        description='Data Processor - Headless statistical data processing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s load survey.csv
  %(prog)s vars
  %(prog)s crosstab --rows "Q1/1,2,3" --cols "Q2/1,2"
  %(prog)s crosstab --rows "Q1/1,2" --filter "Q2/1" --weight "WEIGHT"
  %(prog)s summary
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # load command
    load_parser = subparsers.add_parser('load', help='Load a data file')
    load_parser.add_argument('file', help='Path to data file (CSV, XLSX, SAV)')
    load_parser.add_argument('--sheet', help='Sheet name for Excel files')
    load_parser.add_argument('--encoding', help='Character encoding for CSV files')
    
    # vars command
    subparsers.add_parser('vars', help='List variables and metadata')
    
    # crosstab command
    ct_parser = subparsers.add_parser('crosstab', help='Compute cross-tabulation')
    ct_parser.add_argument('--rows', required=True, help='Row variables (e.g., "Q1/1,2,3" or "Q1;Q2")')
    ct_parser.add_argument('--cols', default='', help='Column variables (e.g., "Q3/1,2")')
    ct_parser.add_argument('--filter', help='Filter expression (e.g., "Q4/1,2")')
    ct_parser.add_argument('--weight', help='Weight column name')
    ct_parser.add_argument('--sig-test', action='store_true', help='Enable significance testing')
    
    # filter command
    filter_parser = subparsers.add_parser('filter', help='Apply filter to data')
    filter_parser.add_argument('filter_def', help='Filter expression (e.g., "Q1/1,2")')
    
    # merge command
    merge_parser = subparsers.add_parser('merge', help='Merge multiple columns')
    merge_parser.add_argument('columns', help='Comma-separated column names')
    merge_parser.add_argument('name', help='Name for new merged column')
    merge_parser.add_argument('--type', choices=['binary', 'spread'], required=True, help='Merge type')
    merge_parser.add_argument('--label', help='Label for new variable')
    
    # summary command
    subparsers.add_parser('summary', help='Get summary statistics')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    success = commands[args.command](args, _processor)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

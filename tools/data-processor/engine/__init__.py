"""Data Processor Engine - Headless statistical data processing."""

from .loader import load_csv, load_excel, load_sav, detect_column_types
from .tabulator import create_crosstab, calculate_base
from .statistics import calculate_frequencies
from .code_parser import parse_code_def, evaluate_code_def, validate_code_def
from .significance import compute_proportion_significance, compute_total_significance
from .processor import DataProcessor

__version__ = "0.1.0"
__all__ = [
    "DataProcessor",
    "load_csv",
    "load_excel", 
    "load_sav",
    "detect_column_types",
    "create_crosstab",
    "calculate_base",
    "calculate_frequencies",
    "parse_code_def",
    "evaluate_code_def",
    "validate_code_def",
    "compute_proportion_significance",
    "compute_total_significance",
]

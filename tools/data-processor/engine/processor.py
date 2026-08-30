"""Unified API for headless statistical data processing."""

import pandas as pd
from typing import Optional, Any
from .loader import load_csv, load_excel, load_sav, detect_column_types, merge_multiple_response, merge_spread_columns
from .tabulator import create_crosstab, calculate_base
from .statistics import calculate_frequencies
from .code_parser import parse_code_def, evaluate_code_def


class DataProcessor:
    """Headless data processor for statistical survey data."""
    
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.metadata: dict = {}
        self.file_name: Optional[str] = None
        self.merged_variables: dict = {}
    
    def load(self, file_path: str, sheet_name: Optional[str] = None, encoding: Optional[str] = None) -> dict:
        """Load CSV, XLSX, or SAV file. Returns metadata.
        
        Args:
            file_path: Path to the data file
            sheet_name: Sheet name for Excel files (optional)
            encoding: Character encoding for CSV files (optional, auto-detected)
            
        Returns:
            dict with keys: columns, row_count, metadata, format
        """
        ext = file_path.lower().rsplit('.', 1)[-1] if '.' in file_path else ''
        
        try:
            if ext in ('csv', 'txt'):
                self.df, self.metadata = load_csv(file_path, encoding=encoding)
            elif ext == 'xlsx':
                self.df, self.metadata = load_excel(file_path, sheet_name=sheet_name)
            elif ext == 'sav':
                self.df, self.metadata = load_sav(file_path)
            else:
                raise ValueError(f"Unsupported file format: {ext}. Use CSV, XLSX, or SAV.")
        except (FileNotFoundError, ValueError) as e:
            return {"status": "error", "error": str(e)}
        
        self.file_name = file_path
        self.merged_variables = {}
        
        return {
            "status": "ok",
            "data": {
                "columns": list(self.df.columns),
                "row_count": len(self.df),
                "metadata": self.metadata,
                "format": ext
            }
        }
    
    def get_variables(self) -> dict:
        """Get variable metadata for all columns.
        
        Returns:
            dict with keys: status, data (dict of variable info)
        """
        if self.df is None:
            return {"status": "error", "error": "No data loaded"}
        
        variables = {}
        base_count = len(self.df)
        
        for col in self.df.columns:
            if col in self.merged_variables:
                merged = self.merged_variables[col]
                response_count = 0
                if col in self.df.columns:
                    for val in self.df[col].dropna():
                        if val:
                            response_count += len(str(val).split(';'))
                
                variables[col] = {
                    "name": col,
                    "label": merged['label'],
                    "type": merged.get('type', 'categorical'),
                    "answer_type": "multiple_answer",
                    "codes": merged['codes'],
                    "response_count": response_count,
                    "base_count": base_count,
                    "is_valid": True,
                    "is_custom": True
                }
                continue
            
            col_meta = self.metadata.get(col, {})
            codes = col_meta.get('codes', [])
            
            if codes and isinstance(codes[0], dict) and 'code' in codes[0]:
                codes = sorted(codes, key=lambda x: (int(x['code']) if str(x['code']).isdigit() else float('inf'), str(x['code'])))
            
            label = col_meta.get('label', col)
            var_type = col_meta.get('type', 'categorical')
            answer_type = col_meta.get('answer_type', 'single_answer')
            response_count = col_meta.get('response_count', len(self.df[col].dropna()))
            is_valid = col_meta.get('is_valid', True)
            
            normalized_codes = []
            for c in codes:
                if isinstance(c, dict):
                    normalized_codes.append({
                        'code': str(c.get('code', '')),
                        'label': c.get('label', str(c.get('code', '')))
                    })
                else:
                    normalized_codes.append({'code': str(c), 'label': str(c)})
            
            if not normalized_codes:
                unique_vals = sorted(self.df[col].dropna().unique().tolist(), key=lambda x: (int(x) if str(x).isdigit() else float('inf'), str(x)))
                normalized_codes = [{'code': str(v), 'label': str(v)} for v in unique_vals]
            
            normalized_codes = sorted(normalized_codes, key=lambda x: (int(x['code']) if str(x['code']).isdigit() else float('inf'), str(x['code'])))
            
            variables[col] = {
                "name": col,
                "label": label,
                "type": var_type,
                "answer_type": answer_type,
                "codes": normalized_codes,
                "response_count": response_count,
                "base_count": base_count,
                "is_valid": is_valid
            }
        
        return {"status": "ok", "data": variables}
    
    def crosstab(
        self,
        row_defs: list[dict],
        col_defs: Optional[list[dict]] = None,
        filter_def: Optional[str] = None,
        weight_col: Optional[str] = None,
        mean_score_mappings: Optional[list[dict]] = None,
        sig_test: bool = False,
        sig_level: float = 0.95
    ) -> dict:
        """Compute cross-tabulation.
        
        Args:
            row_defs: List of row definitions, each with 'variable' and 'code_def'
            col_defs: List of column definitions (optional)
            filter_def: Filter expression (e.g., "Q1/1,2")
            weight_col: Weight column name (optional)
            mean_score_mappings: Mean score mappings (optional)
            sig_test: Whether to compute significance testing
            sig_level: Significance level (default 0.95)
            
        Returns:
            dict with keys: counts, row_pct, col_pct, total_pct, base, weighted_base, effective_base
        """
        if self.df is None:
            return {"status": "error", "error": "No data loaded"}
        
        if not row_defs:
            return {"status": "error", "error": "Row definitions are required"}
        
        try:
            df = self.df.copy()
            
            if filter_def:
                filter_mask = parse_code_def(filter_def, df)
                df = df[filter_mask]
            
            processed_row_defs = []
            for item in row_defs:
                if '/' in item['code_def']:
                    var_part, codes_part = item['code_def'].split('/', 1)
                    codes = codes_part.split(',')
                else:
                    codes = item['code_def'].split(',')
                    var_part = item['variable']
                
                for code in codes:
                    code_clean = code.strip()
                    code_def = f"{var_part}/{code_clean}"
                    processed_row_defs.append({
                        'name': item['variable'],
                        'label': code_def,
                        'code_def': code_def
                    })
            
            processed_col_defs = []
            if col_defs:
                for item in col_defs:
                    if '/' in item['code_def']:
                        var_part, codes_part = item['code_def'].split('/', 1)
                        codes = codes_part.split(',')
                    else:
                        codes = item['code_def'].split(',')
                        var_part = item['variable']
                    
                    for code in codes:
                        code_clean = code.strip()
                        code_def = f"{var_part}/{code_clean}"
                        processed_col_defs.append({
                            'name': item['variable'],
                            'label': code_def,
                            'code_def': code_def
                        })
            
            crosstab = create_crosstab(df, processed_row_defs, processed_col_defs, weight_col, None)
            stats = calculate_frequencies(crosstab)
            
            counts_dict = stats['counts'].to_dict(orient='index')
            row_pct_dict = stats['row_pct'].to_dict(orient='index')
            col_pct_dict = stats['col_pct'].to_dict(orient='index')
            total_pct_dict = stats['total_pct'].to_dict(orient='index')
            
            base = calculate_base(df, None)
            
            weighted_base = None
            effective_base = None
            if weight_col and weight_col in df.columns:
                w = df[weight_col].astype(float)
                weighted_base = round(float(w.sum()), 1)
                sq = float((w ** 2).sum())
                effective_base = round((weighted_base ** 2) / sq, 1) if sq > 0 else 0.0
            
            result = {
                "status": "ok",
                "data": {
                    "counts": counts_dict,
                    "row_pct": row_pct_dict,
                    "col_pct": col_pct_dict,
                    "total_pct": total_pct_dict,
                    "base": int(base),
                    "weighted_base": weighted_base,
                    "effective_base": effective_base
                }
            }
            
            if sig_test and processed_col_defs:
                from .significance import compute_proportion_significance, compute_total_significance
                unweighted = create_crosstab(df, processed_row_defs, processed_col_defs, weight_col=None, filter_def=None)
                col_bases = {c: float(unweighted.loc['Total', c]) for c in unweighted.columns if c != 'Total'}
                column_letters, letters = compute_proportion_significance(unweighted, col_bases)
                total_markers = compute_total_significance(unweighted, col_bases)
                result["data"]["significance"] = {
                    "column_letters": column_letters,
                    "letters": letters,
                    "total": total_markers
                }
            
            return result
            
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def apply_filter(self, filter_def: str) -> dict:
        """Apply filter to loaded data.
        
        Args:
            filter_def: Filter expression (e.g., "Q1/1,2")
            
        Returns:
            dict with keys: status, data (filtered row count)
        """
        if self.df is None:
            return {"status": "error", "error": "No data loaded"}
        
        try:
            filter_mask = parse_code_def(filter_def, self.df)
            filtered_count = filter_mask.sum()
            
            return {
                "status": "ok",
                "data": {
                    "original_count": len(self.df),
                    "filtered_count": int(filtered_count),
                    "filter_def": filter_def
                }
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def merge_variables(self, columns: list[str], new_name: str, merge_type: str, label: Optional[str] = None) -> dict:
        """Merge multiple columns into one.
        
        Args:
            columns: List of column names to merge
            new_name: Name for the new merged column
            merge_type: "binary" or "spread"
            label: Optional label for the new variable
            
        Returns:
            dict with keys: status, data (merged variable info)
        """
        if self.df is None:
            return {"status": "error", "error": "No data loaded"}
        
        for col in columns:
            if col not in self.df.columns:
                return {"status": "error", "error": f"Column '{col}' not found in data"}
        
        if new_name in self.df.columns:
            return {"status": "error", "error": f"Variable '{new_name}' already exists"}
        
        if merge_type not in ('binary', 'spread'):
            return {"status": "error", "error": "merge_type must be 'binary' or 'spread'"}
        
        try:
            if merge_type == 'binary':
                merged_series = merge_multiple_response(self.df, columns, new_name)
            else:
                merged_series = merge_spread_columns(self.df, columns, new_name)
            
            self.df[new_name] = merged_series
            
            codes = [{'code': str(i + 1), 'label': columns[i]} for i in range(len(columns))]
            var_label = label or new_name
            
            self.merged_variables[new_name] = {
                'label': var_label,
                'type': 'categorical',
                'answer_type': 'multiple_answer',
                'codes': codes,
                'source_columns': columns,
            }
            
            return {
                "status": "ok",
                "data": {
                    "name": new_name,
                    "label": var_label,
                    "codes": codes,
                    "source_columns": columns
                }
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def summary(self) -> dict:
        """Get summary statistics for loaded data.
        
        Returns:
            dict with keys: status, data (summary info)
        """
        if self.df is None:
            return {"status": "error", "error": "No data loaded"}
        
        try:
            numeric_cols = self.df.select_dtypes(include=['number']).columns.tolist()
            categorical_cols = [col for col in self.df.columns if col not in numeric_cols]
            
            numeric_stats = {}
            for col in numeric_cols:
                col_data = self.df[col].dropna()
                if len(col_data) > 0:
                    numeric_stats[col] = {
                        "count": len(col_data),
                        "mean": round(float(col_data.mean()), 2),
                        "std": round(float(col_data.std()), 2),
                        "min": round(float(col_data.min()), 2),
                        "max": round(float(col_data.max()), 2),
                        "median": round(float(col_data.median()), 2)
                    }
            
            categorical_stats = {}
            for col in categorical_cols:
                col_data = self.df[col].dropna()
                if len(col_data) > 0:
                    value_counts = col_data.value_counts().head(10).to_dict()
                    categorical_stats[col] = {
                        "count": len(col_data),
                        "unique": len(col_data.unique()),
                        "top_values": {str(k): int(v) for k, v in value_counts.items()}
                    }
            
            return {
                "status": "ok",
                "data": {
                    "file_name": self.file_name,
                    "total_rows": len(self.df),
                    "total_columns": len(self.df.columns),
                    "numeric_columns": len(numeric_cols),
                    "categorical_columns": len(categorical_cols),
                    "numeric_stats": numeric_stats,
                    "categorical_stats": categorical_stats
                }
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

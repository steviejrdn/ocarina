"""Tests for statistics module."""

import os
import pytest
import pandas as pd
from engine.loader import load_csv
from engine.tabulator import create_crosstab
from engine.statistics import calculate_frequencies


class TestStatistics:
    """Tests for statistics calculations."""
    
    def setup_method(self):
        """Load sample data for tests."""
        csv_path = os.path.join(os.path.dirname(__file__), 'sample.csv')
        self.df, self.metadata = load_csv(csv_path)
    
    def test_calculate_frequencies(self):
        """Test frequency calculations."""
        row_defs = [{'name': 'Q1', 'label': 'Q1/1', 'code_def': 'Q1/1'}]
        col_defs = [{'name': 'Q2', 'label': 'Q2/1', 'code_def': 'Q2/1'}]
        
        crosstab = create_crosstab(self.df, row_defs, col_defs)
        stats = calculate_frequencies(crosstab)
        
        assert 'counts' in stats
        assert 'row_pct' in stats
        assert 'col_pct' in stats
        assert 'total_pct' in stats
    
    def test_row_percentages(self):
        """Test row percentage calculations."""
        row_defs = [
            {'name': 'Q1', 'label': 'Q1/1', 'code_def': 'Q1/1'},
            {'name': 'Q1', 'label': 'Q1/2', 'code_def': 'Q1/2'}
        ]
        col_defs = [
            {'name': 'Q2', 'label': 'Q2/1', 'code_def': 'Q2/1'},
            {'name': 'Q2', 'label': 'Q2/2', 'code_def': 'Q2/2'}
        ]
        
        crosstab = create_crosstab(self.df, row_defs, col_defs)
        stats = calculate_frequencies(crosstab)
        
        for row in stats['row_pct'].index:
            if row != 'Total':
                row_sum = sum(stats['row_pct'].loc[row].values())
                assert abs(row_sum - 100) < 0.1 or row_sum == 0
    
    def test_column_percentages(self):
        """Test column percentage calculations."""
        row_defs = [
            {'name': 'Q1', 'label': 'Q1/1', 'code_def': 'Q1/1'},
            {'name': 'Q1', 'label': 'Q1/2', 'code_def': 'Q1/2'}
        ]
        col_defs = [
            {'name': 'Q2', 'label': 'Q2/1', 'code_def': 'Q2/1'},
            {'name': 'Q2', 'label': 'Q2/2', 'code_def': 'Q2/2'}
        ]
        
        crosstab = create_crosstab(self.df, row_defs, col_defs)
        stats = calculate_frequencies(crosstab)
        
        for col in stats['col_pct'].columns:
            if col != 'Total':
                col_sum = sum(stats['col_pct'][col].values())
                assert abs(col_sum - 100) < 0.1 or col_sum == 0

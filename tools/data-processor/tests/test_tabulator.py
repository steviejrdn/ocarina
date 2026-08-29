"""Tests for tabulator module."""

import os
import pytest
import pandas as pd
from engine.loader import load_csv
from engine.tabulator import create_crosstab, calculate_base


class TestTabulator:
    """Tests for cross-tabulation functionality."""
    
    def setup_method(self):
        """Load sample data for tests."""
        csv_path = os.path.join(os.path.dirname(__file__), 'sample.csv')
        self.df, self.metadata = load_csv(csv_path)
    
    def test_create_crosstab_simple(self):
        """Test simple cross-tabulation."""
        row_defs = [{'name': 'Q1', 'label': 'Q1/1', 'code_def': 'Q1/1'}]
        col_defs = [{'name': 'Q2', 'label': 'Q2/1', 'code_def': 'Q2/1'}]
        
        result = create_crosstab(self.df, row_defs, col_defs)
        
        assert isinstance(result, pd.DataFrame)
        assert 'Total' in result.columns
        assert 'Total' in result.index
    
    def test_create_crosstab_multiple_codes(self):
        """Test cross-tabulation with multiple codes."""
        row_defs = [
            {'name': 'Q1', 'label': 'Q1/1', 'code_def': 'Q1/1'},
            {'name': 'Q1', 'label': 'Q1/2', 'code_def': 'Q1/2'}
        ]
        col_defs = [
            {'name': 'Q2', 'label': 'Q2/1', 'code_def': 'Q2/1'},
            {'name': 'Q2', 'label': 'Q2/2', 'code_def': 'Q2/2'}
        ]
        
        result = create_crosstab(self.df, row_defs, col_defs)
        
        assert isinstance(result, pd.DataFrame)
        assert result.shape[0] >= 2
        assert result.shape[1] >= 2
    
    def test_calculate_base(self):
        """Test base calculation."""
        base = calculate_base(self.df)
        
        assert base == 10
    
    def test_calculate_base_with_filter(self):
        """Test base calculation with filter."""
        base = calculate_base(self.df, filter_def='Q1/1')
        
        assert base < 10
        assert base > 0
    
    def test_create_crosstab_with_weight(self):
        """Test cross-tabulation with weights."""
        row_defs = [{'name': 'Q1', 'label': 'Q1/1', 'code_def': 'Q1/1'}]
        col_defs = [{'name': 'Q2', 'label': 'Q2/1', 'code_def': 'Q2/1'}]
        
        result = create_crosstab(self.df, row_defs, col_defs, weight_col='WEIGHT')
        
        assert isinstance(result, pd.DataFrame)

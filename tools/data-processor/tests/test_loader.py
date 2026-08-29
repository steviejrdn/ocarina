"""Tests for data loader module."""

import os
import tempfile
import pytest
import pandas as pd
from engine.loader import load_csv, detect_column_types


class TestLoader:
    """Tests for CSV loading functionality."""
    
    def test_load_csv(self):
        """Test loading a CSV file."""
        csv_path = os.path.join(os.path.dirname(__file__), 'sample.csv')
        df, metadata = load_csv(csv_path)
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) == 10
        assert list(df.columns) == ['Q1', 'Q2', 'Q3', 'Q4', 'WEIGHT']
        assert isinstance(metadata, dict)
    
    def test_detect_column_types(self):
        """Test column type detection."""
        data = {
            'cat_col': ['1', '2', '1', '2', '3'],
            'num_col': ['10', '20', '30', '40', '50'],
            'text_col': ['a', 'b', 'c', 'd', 'e']
        }
        df = pd.DataFrame(data)
        metadata = detect_column_types(df)
        
        assert 'cat_col' in metadata
        assert 'num_col' in metadata
        assert 'text_col' in metadata
        assert metadata['cat_col']['type'] == 'categorical'
        assert metadata['num_col']['type'] == 'numeric'
        assert metadata['text_col']['type'] == 'text'
    
    def test_load_csv_with_encoding(self):
        """Test loading CSV with specific encoding."""
        csv_path = os.path.join(os.path.dirname(__file__), 'sample.csv')
        df, metadata = load_csv(csv_path, encoding='utf-8')
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) == 10

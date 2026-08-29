"""Tests for processor module."""

import os
import pytest
from engine.processor import DataProcessor


class TestProcessor:
    """Tests for DataProcessor class."""
    
    def setup_method(self):
        """Create a fresh processor for each test."""
        self.processor = DataProcessor()
        self.sample_csv = os.path.join(os.path.dirname(__file__), 'sample.csv')
    
    def test_init(self):
        """Test processor initialization."""
        assert self.processor.df is None
        assert self.processor.metadata == {}
        assert self.processor.file_name is None
    
    def test_load_csv(self):
        """Test loading CSV file."""
        result = self.processor.load(self.sample_csv)
        
        assert result['status'] == 'ok'
        assert 'data' in result
        assert result['data']['columns'] == ['Q1', 'Q2', 'Q3', 'Q4', 'WEIGHT']
        assert result['data']['row_count'] == 10
    
    def test_get_variables(self):
        """Test getting variable metadata."""
        self.processor.load(self.sample_csv)
        result = self.processor.get_variables()
        
        assert result['status'] == 'ok'
        assert 'data' in result
        assert 'Q1' in result['data']
        assert 'Q2' in result['data']
    
    def test_crosstab(self):
        """Test cross-tabulation."""
        self.processor.load(self.sample_csv)
        result = self.processor.crosstab(
            row_defs=[{'variable': 'Q1', 'code_def': 'Q1/1'}],
            col_defs=[{'variable': 'Q2', 'code_def': 'Q2/1'}]
        )
        
        assert result['status'] == 'ok'
        assert 'data' in result
        assert 'counts' in result['data']
        assert 'row_pct' in result['data']
    
    def test_apply_filter(self):
        """Test applying filter."""
        self.processor.load(self.sample_csv)
        result = self.processor.apply_filter('Q1/1')
        
        assert result['status'] == 'ok'
        assert 'data' in result
        assert result['data']['filtered_count'] < result['data']['original_count']
    
    def test_merge_variables(self):
        """Test merging variables."""
        self.processor.load(self.sample_csv)
        result = self.processor.merge_variables(
            columns=['Q1', 'Q2'],
            new_name='MERGED',
            merge_type='binary'
        )
        
        assert result['status'] == 'ok'
        assert 'data' in result
        assert result['data']['name'] == 'MERGED'
    
    def test_summary(self):
        """Test summary statistics."""
        self.processor.load(self.sample_csv)
        result = self.processor.summary()
        
        assert result['status'] == 'ok'
        assert 'data' in result
        assert result['data']['total_rows'] == 10
        assert result['data']['total_columns'] == 5
    
    def test_error_no_data(self):
        """Test error when no data loaded."""
        result = self.processor.get_variables()
        
        assert result['status'] == 'error'
        assert 'error' in result
    
    def test_error_invalid_file(self):
        """Test error with invalid file."""
        result = self.processor.load('nonexistent.csv')
        
        assert result['status'] == 'error'
        assert 'error' in result

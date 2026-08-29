"""Tests for code parser module."""

import os
import pytest
import pandas as pd
from engine.loader import load_csv
from engine.code_parser import parse_code_def, evaluate_code_def, validate_code_def


class TestCodeParser:
    """Tests for code expression parsing."""
    
    def setup_method(self):
        """Load sample data for tests."""
        csv_path = os.path.join(os.path.dirname(__file__), 'sample.csv')
        self.df, self.metadata = load_csv(csv_path)
    
    def test_parse_single_code(self):
        """Test parsing single code expression."""
        mask = parse_code_def('Q1/1', self.df)
        
        assert isinstance(mask, pd.Series)
        assert mask.dtype == bool
        assert mask.sum() > 0
    
    def test_parse_multiple_codes(self):
        """Test parsing multiple codes expression."""
        mask = parse_code_def('Q1/1,2', self.df)
        
        assert isinstance(mask, pd.Series)
        assert mask.sum() > 0
    
    def test_parse_range_codes(self):
        """Test parsing range codes expression."""
        mask = parse_code_def('Q1/1..3', self.df)
        
        assert isinstance(mask, pd.Series)
        assert mask.sum() > 0
    
    def test_parse_wildcard(self):
        """Test parsing wildcard expression."""
        mask = parse_code_def('Q1/*', self.df)
        
        assert isinstance(mask, pd.Series)
        assert mask.sum() == len(self.df)
    
    def test_parse_or_expression(self):
        """Test parsing OR expression."""
        mask = parse_code_def('Q1/1+Q2/1', self.df)
        
        assert isinstance(mask, pd.Series)
        assert mask.sum() > 0
    
    def test_parse_and_expression(self):
        """Test parsing AND expression."""
        mask = parse_code_def('Q1/1.Q2/1', self.df)
        
        assert isinstance(mask, pd.Series)
        assert mask.sum() >= 0
    
    def test_parse_negation(self):
        """Test parsing negation expression."""
        mask = parse_code_def('!Q1/1', self.df)
        
        assert isinstance(mask, pd.Series)
        assert mask.sum() > 0
    
    def test_evaluate_code_def(self):
        """Test evaluating code definition."""
        mask = evaluate_code_def('Q1/1', self.df)
        
        assert isinstance(mask, pd.Series)
        assert mask.dtype == bool
    
    def test_validate_code_def_valid(self):
        """Test validating valid code definition."""
        errors = validate_code_def('Q1/1', self.df)
        
        assert isinstance(errors, list)
        assert len(errors) == 0
    
    def test_validate_code_def_invalid_variable(self):
        """Test validating code definition with invalid variable."""
        errors = validate_code_def('INVALID/1', self.df)
        
        assert isinstance(errors, list)
        assert len(errors) > 0

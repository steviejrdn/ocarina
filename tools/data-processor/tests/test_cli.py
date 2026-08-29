"""Tests for CLI module."""

import os
import sys
import pytest
from unittest.mock import patch
from io import StringIO

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cli import main, output_json
from engine.processor import DataProcessor


class TestCLI:
    """Tests for CLI functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.sample_csv = os.path.join(os.path.dirname(__file__), 'sample.csv')
    
    def test_output_json(self):
        """Test JSON output function."""
        data = {"status": "ok", "data": {"test": "value"}}
        
        with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
            output_json(data)
            output = mock_stdout.getvalue()
        
        assert '"status": "ok"' in output
        assert '"test": "value"' in output
    
    def test_load_command(self):
        """Test load command."""
        with patch('sys.argv', ['cli.py', 'load', self.sample_csv]):
            with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
                try:
                    main()
                except SystemExit:
                    pass
                output = mock_stdout.getvalue()
        
        assert '"status": "ok"' in output
        assert '"columns"' in output
    
    def test_vars_command(self):
        """Test vars command."""
        processor = DataProcessor()
        processor.load(self.sample_csv)
        
        with patch('sys.argv', ['cli.py', 'vars']):
            with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
                try:
                    main()
                except SystemExit:
                    pass
                output = mock_stdout.getvalue()
        
        assert '"status": "ok"' in output
        assert '"Q1"' in output
    
    def test_crosstab_command(self):
        """Test crosstab command."""
        with patch('sys.argv', ['cli.py', 'load', self.sample_csv]):
            try:
                main()
            except SystemExit:
                pass
        
        with patch('sys.argv', ['cli.py', 'crosstab', '--rows', 'Q1/1', '--cols', 'Q2/1']):
            with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
                try:
                    main()
                except SystemExit:
                    pass
                output = mock_stdout.getvalue()
        
        assert '"status": "ok"' in output
        assert '"counts"' in output
    
    def test_summary_command(self):
        """Test summary command."""
        with patch('sys.argv', ['cli.py', 'load', self.sample_csv]):
            try:
                main()
            except SystemExit:
                pass
        
        with patch('sys.argv', ['cli.py', 'summary']):
            with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
                try:
                    main()
                except SystemExit:
                    pass
                output = mock_stdout.getvalue()
        
        assert '"status": "ok"' in output
        assert '"total_rows"' in output

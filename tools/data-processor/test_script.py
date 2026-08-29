#!/usr/bin/env python3
"""Test script for Data Processor Engine."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import DataProcessor


def main():
    print("=" * 60)
    print("Data Processor Engine - Test Script")
    print("=" * 60)
    
    processor = DataProcessor()
    
    # Test 1: Load data
    print("\n1. Loading sample.csv...")
    result = processor.load("tests/sample.csv")
    print(f"   Status: {result['status']}")
    print(f"   Columns: {result['data']['columns']}")
    print(f"   Row count: {result['data']['row_count']}")
    
    # Test 2: Get variables
    print("\n2. Getting variables...")
    result = processor.get_variables()
    print(f"   Status: {result['status']}")
    print(f"   Variables: {list(result['data'].keys())}")
    
    # Test 3: Simple crosstab
    print("\n3. Computing simple crosstab...")
    result = processor.crosstab(
        row_defs=[{"variable": "Q1", "code_def": "Q1/1"}],
        col_defs=[{"variable": "Q2", "code_def": "Q2/1"}]
    )
    print(f"   Status: {result['status']}")
    print(f"   Counts: {result['data']['counts']}")
    
    # Test 4: Multi-code crosstab
    print("\n4. Computing multi-code crosstab...")
    result = processor.crosstab(
        row_defs=[
            {"variable": "Q1", "code_def": "Q1/1"},
            {"variable": "Q1", "code_def": "Q1/2"}
        ],
        col_defs=[
            {"variable": "Q2", "code_def": "Q2/1"},
            {"variable": "Q2", "code_def": "Q2/2"}
        ]
    )
    print(f"   Status: {result['status']}")
    print(f"   Counts shape: {len(result['data']['counts'])} rows")
    
    # Test 5: Apply filter
    print("\n5. Applying filter Q1/1...")
    result = processor.apply_filter("Q1/1")
    print(f"   Status: {result['status']}")
    print(f"   Filtered: {result['data']['filtered_count']}/{result['data']['original_count']}")
    
    # Test 6: Summary statistics
    print("\n6. Getting summary statistics...")
    result = processor.summary()
    print(f"   Status: {result['status']}")
    print(f"   Total rows: {result['data']['total_rows']}")
    print(f"   Total columns: {result['data']['total_columns']}")
    print(f"   Numeric columns: {result['data']['numeric_columns']}")
    print(f"   Categorical columns: {result['data']['categorical_columns']}")
    
    # Test 7: Merge variables
    print("\n7. Merging Q1 and Q2...")
    result = processor.merge_variables(
        columns=["Q1", "Q2"],
        new_name="MERGED",
        merge_type="binary"
    )
    print(f"   Status: {result['status']}")
    if result['status'] == 'ok':
        print(f"   Merged name: {result['data']['name']}")
        print(f"   Codes: {result['data']['codes']}")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)


if __name__ == '__main__':
    main()

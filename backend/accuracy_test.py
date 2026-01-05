"""
PayGuard DQ Accuracy Testing Suite
Creates multiple realistic test datasets and verifies scoring accuracy.
"""
import pandas as pd
import numpy as np
import requests
import json
import io
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def create_perfect_dataset(n_rows=500):
    """Create a perfect quality dataset (should score 85-100)"""
    np.random.seed(42)
    timestamps = pd.date_range(start=datetime.now() - timedelta(hours=24), periods=n_rows, freq='2min')
    return pd.DataFrame({
        'txn_id': [f'TXN{str(i).zfill(8)}' for i in range(1, n_rows + 1)],
        'timestamp': timestamps,
        'amount': np.random.uniform(10, 500, n_rows).round(2),
        'currency': np.random.choice(['USD', 'EUR', 'GBP'], n_rows, p=[0.7, 0.2, 0.1]),
        'status': np.random.choice(['completed', 'pending', 'refunded'], n_rows, p=[0.85, 0.10, 0.05]),
        'merchant_id': [f'M{np.random.randint(1000, 9999)}' for _ in range(n_rows)],
        'country': np.random.choice(['US', 'UK', 'DE', 'FR', 'JP'], n_rows),
        'mcc': np.random.choice(['5411', '5812', '5912', '5999'], n_rows),
    })

def create_terrible_dataset(n_rows=500):
    """Create a TERRIBLE dataset that should score very low (0-30)"""
    np.random.seed(99)
    df = pd.DataFrame({
        'txn_id': ['DUP001'] * n_rows,  # All duplicates!
        'timestamp': [None] * n_rows,  # All null timestamps
        'amount': [-100] * (n_rows // 2) + [999999] * (n_rows // 2),  # All invalid
        'currency': ['XXX'] * n_rows,  # Invalid currencies
        'status': [None] * n_rows,  # All null
        'merchant_id': [None] * n_rows,  # All null
        'country': ['ZZ'] * n_rows,  # Invalid country
        'mcc': ['ABCD'] * n_rows,  # Invalid MCC
    })
    return df

def create_high_null_dataset(n_rows=500):
    """Create dataset with many missing values (should score 40-70)"""
    df = create_perfect_dataset(n_rows)
    null_mask = np.random.random(n_rows) < 0.30
    df.loc[null_mask, 'amount'] = np.nan
    null_mask = np.random.random(n_rows) < 0.25
    df.loc[null_mask, 'currency'] = np.nan
    null_mask = np.random.random(n_rows) < 0.20
    df.loc[null_mask, 'status'] = np.nan
    return df

def create_invalid_values_dataset(n_rows=500):
    """Create dataset with invalid values (should score 40-70)"""
    df = create_perfect_dataset(n_rows)
    neg_mask = np.random.random(n_rows) < 0.20
    df.loc[neg_mask, 'amount'] = df.loc[neg_mask, 'amount'] * -1
    inv_mask = np.random.random(n_rows) < 0.15
    df.loc[inv_mask, 'currency'] = np.random.choice(['XXX', 'ZZZ', 'ABC'], inv_mask.sum())
    return df

def create_stale_data_dataset(n_rows=500):
    """Create dataset with old timestamps (should score 50-85)"""
    df = create_perfect_dataset(n_rows)
    old_timestamps = pd.date_range(start=datetime.now() - timedelta(days=180), periods=n_rows, freq='1h')
    df['timestamp'] = old_timestamps
    return df

def run_analysis(df, dataset_name):
    """Send dataset to API and get analysis results"""
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_content = csv_buffer.getvalue()
    files = {'dataset_file': (f'{dataset_name}.csv', csv_content, 'text/csv')}
    
    try:
        response = requests.post(f"{BASE_URL}/api/ingest", files=files, timeout=120)
        if response.status_code == 200:
            result = response.json()
            run_id = result.get('run_id')
            time.sleep(3)
            detail_response = requests.get(f"{BASE_URL}/api/runs/{run_id}")
            if detail_response.status_code == 200:
                return detail_response.json()
        print(f"Error: {response.status_code} - {response.text[:200]}")
        return None
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def main():
    print("\n" + "="*80)
    print("PayGuard DQ Accuracy Test Results")
    print("="*80)
    
    test_cases = [
        {'name': 'perfect_quality', 'data': create_perfect_dataset(500), 'expected': (80, 100)},
        {'name': 'terrible_quality', 'data': create_terrible_dataset(500), 'expected': (0, 35)},
        {'name': 'high_null_rate', 'data': create_high_null_dataset(500), 'expected': (50, 90)},
        {'name': 'invalid_values', 'data': create_invalid_values_dataset(500), 'expected': (50, 80)},
        {'name': 'stale_data', 'data': create_stale_data_dataset(500), 'expected': (20, 70)},
    ]
    
    results = []
    passed = 0
    
    for test in test_cases:
        print(f"\n📊 Testing: {test['name']}")
        print(f"   Expected Score: {test['expected'][0]}-{test['expected'][1]}")
        
        result = run_analysis(test['data'], test['name'])
        if result is None:
            print(f"   ❌ FAILED - Could not get results")
            continue
        
        score = result.get('scores', {}).get('composite_dqs', 0)
        in_range = test['expected'][0] <= score <= test['expected'][1]
        
        if in_range:
            passed += 1
            print(f"   ✅ PASSED - Score: {score:.1f}")
        else:
            print(f"   ❌ FAILED - Score: {score:.1f} (expected {test['expected'][0]}-{test['expected'][1]})")
        
        results.append({
            'name': test['name'],
            'expected': test['expected'],
            'actual': score,
            'passed': in_range
        })
    
    accuracy = (passed / len(test_cases) * 100) if test_cases else 0
    
    print("\n" + "="*80)
    print(f"ACCURACY: {passed}/{len(test_cases)} tests passed = {accuracy:.1f}%")
    print("="*80)
    
    with open('accuracy_test_results.json', 'w') as f:
        json.dump({'accuracy': accuracy, 'results': results}, f, indent=2)
    
    return accuracy

if __name__ == "__main__":
    main()

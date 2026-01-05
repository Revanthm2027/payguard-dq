"""
Anomaly Detection Agent - Unsupervised ML for detecting data quality anomalies.

Uses Isolation Forest for detecting outliers in numeric data,
and statistical methods for categorical/text anomalies.

Industry-standard unsupervised anomaly detection approach.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime


class AnomalyDetectionAgent:
    """
    ML-powered anomaly detection using Isolation Forest.
    
    This agent identifies data quality issues that rule-based checks might miss:
    - Numeric outliers using Isolation Forest
    - Rare categorical values using frequency analysis
    - Unusual patterns in text fields
    """
    
    def __init__(self, contamination: float = 0.05):
        """
        Initialize the anomaly detection agent.
        
        Args:
            contamination: Expected proportion of anomalies (default 5%)
        """
        self.name = "AnomalyDetectionAgent"
        self.contamination = contamination
        self._isolation_forest = None
    
    def detect(self, df: pd.DataFrame, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run anomaly detection on the dataset.
        
        Returns:
            AnomalyResult with detected anomalies and check results
        """
        start_time = datetime.now()
        
        anomalies = {
            "numeric_anomalies": [],
            "categorical_anomalies": [],
            "text_anomalies": [],
            "row_anomalies": []
        }
        
        check_results = []
        
        # Detect numeric anomalies using Isolation Forest
        numeric_result = self._detect_numeric_anomalies(df, profile)
        anomalies["numeric_anomalies"] = numeric_result.get("anomalies", [])
        if numeric_result.get("check_result"):
            check_results.append(numeric_result["check_result"])
        
        # Detect categorical anomalies using frequency analysis
        categorical_result = self._detect_categorical_anomalies(df, profile)
        anomalies["categorical_anomalies"] = categorical_result.get("anomalies", [])
        if categorical_result.get("check_result"):
            check_results.append(categorical_result["check_result"])
        
        # Detect text pattern anomalies
        text_result = self._detect_text_anomalies(df, profile)
        anomalies["text_anomalies"] = text_result.get("anomalies", [])
        if text_result.get("check_result"):
            check_results.append(text_result["check_result"])
        
        # Detect row-level anomalies (multivariate)
        row_result = self._detect_row_anomalies(df, profile)
        anomalies["row_anomalies"] = row_result.get("anomalies", [])
        if row_result.get("check_result"):
            check_results.append(row_result["check_result"])
        
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return {
            "anomalies": anomalies,
            "check_results": check_results,
            "total_anomalies": sum(len(a) for a in anomalies.values()),
            "duration_ms": duration_ms,
            "model": "IsolationForest",
            "contamination": self.contamination
        }
    
    def _detect_numeric_anomalies(self, df: pd.DataFrame, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect anomalies in numeric columns using Isolation Forest.
        """
        try:
            from sklearn.ensemble import IsolationForest
        except ImportError:
            return {"anomalies": [], "check_result": None}
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if not numeric_cols or len(df) < 10:
            return {"anomalies": [], "check_result": None}
        
        anomalies = []
        total_anomaly_count = 0
        anomaly_cols = []
        
        for col in numeric_cols:
            col_data = df[col].dropna()
            if len(col_data) < 10:
                continue
            
            # Fit Isolation Forest
            iso_forest = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100
            )
            
            try:
                predictions = iso_forest.fit_predict(col_data.values.reshape(-1, 1))
                anomaly_mask = predictions == -1
                anomaly_count = anomaly_mask.sum()
                anomaly_rate = anomaly_count / len(col_data)
                
                if anomaly_count > 0:
                    anomaly_values = col_data[anomaly_mask].head(5).tolist()
                    anomalies.append({
                        "column": col,
                        "anomaly_count": int(anomaly_count),
                        "anomaly_rate": float(anomaly_rate),
                        "sample_anomalies": anomaly_values,
                        "method": "IsolationForest"
                    })
                    total_anomaly_count += anomaly_count
                    
                    if anomaly_rate > self.contamination * 2:
                        anomaly_cols.append(col)
            except Exception:
                continue
        
        # Create check result
        overall_rate = total_anomaly_count / (len(df) * len(numeric_cols)) if numeric_cols else 0
        passed = overall_rate < 0.10  # Allow up to 10% anomalies
        
        check_result = {
            "check_id": "ml_numeric_anomalies",
            "dimension": "anomaly_detection",
            "passed": passed,
            "severity": "high" if overall_rate > 0.15 else "medium" if overall_rate > 0.05 else "low",
            "metrics": {
                "total_anomalies": total_anomaly_count,
                "anomaly_rate": float(overall_rate),
                "columns_analyzed": len(numeric_cols),
                "columns_with_anomalies": len(anomaly_cols),
                "method": "IsolationForest",
                "sample_anomalies": anomalies[:5]
            }
        }
        
        return {"anomalies": anomalies, "check_result": check_result}
    
    def _detect_categorical_anomalies(self, df: pd.DataFrame, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect rare/unusual categorical values using frequency analysis.
        """
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        if not categorical_cols:
            return {"anomalies": [], "check_result": None}
        
        anomalies = []
        total_rare_count = 0
        
        for col in categorical_cols:
            col_data = df[col].dropna()
            if len(col_data) < 10:
                continue
            
            # Calculate value frequencies
            value_counts = col_data.value_counts()
            total = len(col_data)
            
            # Find rare values (appearing in <1% of data)
            rare_threshold = max(2, int(total * 0.01))
            rare_values = value_counts[value_counts < rare_threshold]
            
            if len(rare_values) > 0:
                rare_count = rare_values.sum()
                anomalies.append({
                    "column": col,
                    "rare_value_count": int(rare_count),
                    "rare_unique_values": len(rare_values),
                    "sample_rare_values": rare_values.head(5).index.tolist(),
                    "method": "FrequencyAnalysis"
                })
                total_rare_count += rare_count
        
        if not anomalies:
            return {"anomalies": [], "check_result": None}
        
        overall_rate = total_rare_count / (len(df) * len(categorical_cols)) if categorical_cols else 0
        passed = overall_rate < 0.05
        
        check_result = {
            "check_id": "ml_categorical_anomalies",
            "dimension": "anomaly_detection",
            "passed": passed,
            "severity": "medium" if overall_rate > 0.10 else "low",
            "metrics": {
                "total_rare_values": total_rare_count,
                "rare_value_rate": float(overall_rate),
                "columns_analyzed": len(categorical_cols),
                "method": "FrequencyAnalysis"
            }
        }
        
        return {"anomalies": anomalies, "check_result": check_result}
    
    def _detect_text_anomalies(self, df: pd.DataFrame, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect unusual patterns in text fields.
        """
        text_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        if not text_cols:
            return {"anomalies": [], "check_result": None}
        
        anomalies = []
        
        for col in text_cols:
            col_data = df[col].dropna().astype(str)
            if len(col_data) < 10:
                continue
            
            # Calculate string length statistics
            lengths = col_data.str.len()
            mean_len = lengths.mean()
            std_len = lengths.std()
            
            if std_len > 0:
                # Find strings with unusual lengths (>3 std from mean)
                unusual_mask = np.abs(lengths - mean_len) > (3 * std_len)
                unusual_count = unusual_mask.sum()
                
                if unusual_count > 0:
                    anomalies.append({
                        "column": col,
                        "unusual_length_count": int(unusual_count),
                        "mean_length": float(mean_len),
                        "std_length": float(std_len),
                        "method": "LengthStatistics"
                    })
        
        if not anomalies:
            return {"anomalies": [], "check_result": None}
        
        check_result = {
            "check_id": "ml_text_anomalies",
            "dimension": "anomaly_detection",
            "passed": True,  # Text anomalies are informational
            "severity": "low",
            "metrics": {
                "columns_with_anomalies": len(anomalies),
                "method": "LengthStatistics"
            }
        }
        
        return {"anomalies": anomalies, "check_result": check_result}
    
    def _detect_row_anomalies(self, df: pd.DataFrame, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect row-level anomalies using multivariate Isolation Forest.
        """
        try:
            from sklearn.ensemble import IsolationForest
            from sklearn.preprocessing import StandardScaler
        except ImportError:
            return {"anomalies": [], "check_result": None}
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2 or len(df) < 20:
            return {"anomalies": [], "check_result": None}
        
        # Prepare data - handle missing values
        numeric_df = df[numeric_cols].copy()
        numeric_df = numeric_df.fillna(numeric_df.median())
        
        if numeric_df.empty:
            return {"anomalies": [], "check_result": None}
        
        try:
            # Standardize and fit Isolation Forest
            scaler = StandardScaler()
            scaled_data = scaler.fit_transform(numeric_df)
            
            iso_forest = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100
            )
            
            predictions = iso_forest.fit_predict(scaled_data)
            anomaly_scores = iso_forest.decision_function(scaled_data)
            
            anomaly_mask = predictions == -1
            anomaly_count = anomaly_mask.sum()
            anomaly_rate = anomaly_count / len(df)
            
            # Get indices of most anomalous rows
            anomaly_indices = np.where(anomaly_mask)[0][:10].tolist()
            
        except Exception:
            return {"anomalies": [], "check_result": None}
        
        anomalies = [{
            "type": "multivariate_outliers",
            "count": int(anomaly_count),
            "rate": float(anomaly_rate),
            "sample_indices": anomaly_indices,
            "features_used": numeric_cols,
            "method": "IsolationForest_Multivariate"
        }]
        
        passed = anomaly_rate < 0.10
        
        check_result = {
            "check_id": "ml_row_anomalies",
            "dimension": "anomaly_detection",
            "passed": passed,
            "severity": "high" if anomaly_rate > 0.15 else "medium" if anomaly_rate > 0.05 else "low",
            "metrics": {
                "anomaly_count": int(anomaly_count),
                "anomaly_rate": float(anomaly_rate),
                "features_used": len(numeric_cols),
                "method": "IsolationForest_Multivariate"
            }
        }
        
        return {"anomalies": anomalies, "check_result": check_result}

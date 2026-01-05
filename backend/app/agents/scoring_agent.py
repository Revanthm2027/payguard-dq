"""
Scoring Agent: Computes per-dimension and composite scores with explainability.
"""
from typing import Dict, Any, List
from datetime import datetime


class ScoringAgent:
    """Agent responsible for computing quality scores."""
    
    # Payments criticality model for risk-weighted scoring
    FIELD_CRITICALITY = {
        # Financial-critical fields
        "amount": 3,
        "currency": 3,
        "txn_id": 3,
        "transaction_id": 3,
        "status": 3,
        
        # Ops-critical fields
        "merchant_id": 2,
        "mcc": 2,
        "country": 2,
        "merchant": 2,
        
        # Regulatory-critical fields
        "customer_id": 3,
        "kyc": 3,
        "compliance": 3
    }
    
    def __init__(self):
        self.name = "ScoringAgent"
    
    def compute_scores(self,
                      check_results: List[Dict[str, Any]],
                      profile: Dict[str, Any],
                      selected_dimensions: List[str]) -> Dict[str, Any]:
        """
        Compute per-dimension and composite scores.
        
        Returns:
            ScoringResult with scores and explainability
        """
        start_time = datetime.now()
        
        # Group checks by dimension
        checks_by_dimension = {}
        for check in check_results:
            dim = check.get("dimension", "unknown")
            if dim not in checks_by_dimension:
                checks_by_dimension[dim] = []
            checks_by_dimension[dim].append(check)
        
        # Compute per-dimension scores
        dimension_scores = {}
        dimension_weights = {}
        
        for dimension in selected_dimensions:
            score_result = self._compute_dimension_score(
                dimension,
                checks_by_dimension.get(dimension, []),
                profile
            )
            dimension_scores[dimension] = score_result
            dimension_weights[dimension] = score_result["weight"]
        
        # Compute composite score
        composite_dqs = self._compute_composite_score(dimension_scores, dimension_weights)
        
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return {
            "dimension_scores": dimension_scores,
            "composite_dqs": composite_dqs,
            "dimension_weights": dimension_weights,
            "duration_ms": duration_ms
        }
    
    def _compute_dimension_score(self,
                                dimension: str,
                                checks: List[Dict[str, Any]],
                                profile: Dict[str, Any]) -> Dict[str, Any]:
        """Compute score for a single dimension."""
        
        if not checks:
            return {
                "score": 100.0,
                "weight": 1.0,
                "explainability": {
                    "message": "No checks executed for this dimension"
                }
            }
        
        # Calculate weighted error rate
        total_error_weight = 0
        total_weight = 0
        
        severity_weights = {
            "critical": 4.0,
            "high": 3.0,
            "medium": 2.0,
            "low": 1.0
        }
        
        failing_checks = []
        metrics_summary = {}
        impacted_columns = set()
        critical_fails = 0
        high_fails = 0
        
        for check in checks:
            severity = check.get("severity", "medium")
            weight = severity_weights.get(severity, 2.0)
            
            # Compute error rate for this check
            error_rate = self._extract_error_rate(check)
            
            total_error_weight += error_rate * weight
            total_weight += weight
            
            # Collect explainability data and count failures by severity
            if not check.get("passed", True):
                if severity == "critical":
                    critical_fails += 1
                elif severity == "high":
                    high_fails += 1
                    
                failing_checks.append({
                    "check_id": check.get("check_id"),
                    "severity": severity,
                    "error_rate": error_rate
                })
            
            # Extract impacted columns
            metrics = check.get("metrics", {})
            if "failing_columns" in metrics:
                for col_info in metrics["failing_columns"]:
                    if isinstance(col_info, dict) and "column" in col_info:
                        impacted_columns.add(col_info["column"])
            
            # Store key metrics
            check_id = check.get("check_id", "unknown")
            metrics_summary[check_id] = self._extract_key_metrics(check)
        
        # Calculate base score from error rates
        weighted_error_rate = total_error_weight / total_weight if total_weight > 0 else 0
        base_score = max(0, 100 * (1 - weighted_error_rate))
        
        # Only apply penalties if there are actual failures (more than 50% error rate)
        if len(failing_checks) > 0:
            # For critical failures with high error rates, apply caps
            max_error = max([fc['error_rate'] for fc in failing_checks], default=0)
            
            if critical_fails >= 1 and max_error > 0.3:
                # Only cap if significant error rate
                if critical_fails >= 3 and max_error > 0.5:
                    base_score = min(base_score, 30)
                elif critical_fails >= 2 and max_error > 0.3:
                    base_score = min(base_score, 50)
                elif critical_fails >= 1 and max_error > 0.2:
                    base_score = min(base_score, 65)
            
            # Penalty for many failing checks
            fail_ratio = len(failing_checks) / len(checks) if checks else 0
            if fail_ratio > 0.5:
                base_score *= 0.7
            elif fail_ratio > 0.3:
                base_score *= 0.85
        
        score = max(0, min(100, base_score))
        
        # Determine dimension weight based on criticality
        dim_weight = self._get_dimension_weight(dimension, profile)
        
        return {
            "score": round(score, 2),
            "weight": dim_weight,
            "explainability": {
                "weighted_error_rate": round(weighted_error_rate, 4),
                "formula": "score = max(0, 100 * (1 - weighted_error_rate)) with caps",
                "total_checks": len(checks),
                "critical_failures": critical_fails,
                "high_failures": high_fails,
                "failing_checks": failing_checks,
                "metrics": metrics_summary,
                "impacted_columns": list(impacted_columns),
                "severity_distribution": self._get_severity_distribution(checks)
            }
        }
    
    def _extract_error_rate(self, check: Dict[str, Any]) -> float:
        """Extract error rate from check metrics."""
        metrics = check.get("metrics", {})
        
        # Try common error rate fields
        for field in ["overall_null_rate", "overall_duplicate_rate", "overall_invalid_rate",
                     "inconsistent_rate", "violation_rate", "excessive_delay_rate"]:
            if field in metrics:
                return float(metrics[field])
        
        # Try match rate fields (invert)
        for field in ["match_rate", "overall_reconciliation_rate"]:
            if field in metrics:
                return 1.0 - float(metrics[field])
        
        # Fallback: if check failed, assume 5% error rate
        if not check.get("passed", True):
            return 0.05
        
        return 0.0
    
    def _extract_key_metrics(self, check: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key metrics from check for explainability."""
        metrics = check.get("metrics", {})
        
        # Extract most relevant metrics
        key_metrics = {}
        
        for field in ["overall_null_rate", "overall_duplicate_rate", "overall_invalid_rate",
                     "inconsistent_rate", "violation_rate", "match_rate", "overall_reconciliation_rate"]:
            if field in metrics:
                key_metrics[field] = metrics[field]
        
        # Add counts if available
        for field in ["missing_count", "duplicate_count", "invalid_count", "inconsistent_count",
                     "violation_count", "unmatched_count"]:
            if field in metrics:
                key_metrics[field] = metrics[field]
        
        return key_metrics
    
    def _get_severity_distribution(self, checks: List[Dict[str, Any]]) -> Dict[str, int]:
        """Get distribution of check severities."""
        distribution = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        for check in checks:
            severity = check.get("severity", "medium")
            if severity in distribution:
                distribution[severity] += 1
        
        return distribution
    
    def _get_dimension_weight(self, dimension: str, profile: Dict[str, Any]) -> float:
        """
        Get dimension weight based on payments criticality model.
        """
        # Base weights
        base_weights = {
            "completeness": 2.0,
            "uniqueness": 3.0,  # Critical for transactions
            "validity": 2.5,
            "consistency": 2.5,
            "timeliness": 2.0,
            "integrity": 2.5,
            "reconciliation": 3.0  # Critical for payments
        }
        
        weight = base_weights.get(dimension, 2.0)
        
        # Adjust based on column criticality
        columns = profile.get("columns", {})
        critical_count = 0
        
        for col_name in columns.keys():
            col_lower = col_name.lower()
            for critical_field, criticality in self.FIELD_CRITICALITY.items():
                if critical_field in col_lower:
                    critical_count += criticality
        
        # Boost weight if dataset has many critical fields
        if critical_count > 10:
            weight *= 1.2
        
        return round(weight, 2)
    
    def _compute_composite_score(self,
                                dimension_scores: Dict[str, Dict[str, Any]],
                                dimension_weights: Dict[str, float]) -> float:
        """
        Compute risk-weighted composite DQS with balanced caps.
        Penalizes bad data appropriately while not over-penalizing good data.
        """
        if not dimension_scores:
            return 0.0
        
        total_weighted_score = 0
        total_weight = 0
        min_score = 100
        scores_below_50 = 0
        scores_below_70 = 0
        
        # Critical dimensions
        critical_dims = {'completeness', 'validity', 'uniqueness'}
        critical_dim_failing = 0
        
        for dimension, score_data in dimension_scores.items():
            score = score_data["score"]
            weight = dimension_weights.get(dimension, 1.0)
            
            total_weighted_score += score * weight
            total_weight += weight
            
            # Track minimum
            if score < min_score:
                min_score = score
            
            # Count problematic dimensions
            if score < 50:
                scores_below_50 += 1
            if score < 70:
                scores_below_70 += 1
            
            # Track critical dimension failures
            if dimension in critical_dims and score < 60:
                critical_dim_failing += 1
        
        weighted_avg = total_weighted_score / total_weight if total_weight > 0 else 0
        composite = weighted_avg
        
        # Only apply caps if there are actually problematic dimensions
        if scores_below_50 > 0:
            # Has at least one very bad dimension
            if min_score < 20:
                composite = min(weighted_avg, 30)  # Terrible data
            elif min_score < 40:
                composite = min(weighted_avg, 45)  # Very bad data
            elif min_score < 50:
                composite = min(weighted_avg, 55)  # Bad data
        
        # Penalty for multiple critical dimension failures
        if critical_dim_failing >= 3:
            composite *= 0.5   # 50% penalty
        elif critical_dim_failing >= 2:
            composite *= 0.65  # 35% penalty
        elif critical_dim_failing >= 1:
            composite *= 0.8   # 20% penalty
        
        # For very bad data, blend towards minimum
        if min_score < 30:
            # Terrible data - heavily weight the minimum
            composite = (composite * 0.3) + (min_score * 0.7)
        elif min_score < 50 and scores_below_50 >= 2:
            # Multiple bad dimensions
            composite = (composite + min_score) / 2
        
        return round(max(0, min(100, composite)), 2)



"""
Explainer Agent: Generates human-readable narratives using GenAI.

Supports Google Gemini API for industry-standard LLM integration,
with fallback to deterministic stub mode.
"""
import os
from typing import Dict, Any, List, Optional
from datetime import datetime


class ExplainerAgent:
    """
    Agent responsible for generating explanations and narratives using GenAI.
    
    Uses Google Gemini API for generating:
    - Executive summaries
    - Issue explanations
    - Business impact analysis
    - Remediation recommendations
    """
    
    def __init__(self, use_llm: bool = None):
        self.name = "ExplainerAgent"
        
        # Auto-detect Gemini availability
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        openai_key = os.getenv("OPENAI_API_KEY", "")
        
        if use_llm is None:
            self.use_llm = bool(gemini_key.strip() or openai_key.strip())
        else:
            self.use_llm = use_llm
        
        self.client = None
        self.model = None
        self.provider = None
        
        if self.use_llm:
            # Try Gemini first
            if gemini_key.strip():
                try:
                    import google.generativeai as genai
                    genai.configure(api_key=gemini_key)
                    self.model = genai.GenerativeModel('gemini-1.5-flash')
                    self.provider = "gemini"
                except Exception as e:
                    print(f"Gemini init failed: {e}")
                    self.use_llm = False
            # Fallback to OpenAI
            elif openai_key.strip():
                try:
                    from openai import OpenAI
                    self.client = OpenAI(api_key=openai_key)
                    self.provider = "openai"
                except Exception:
                    self.use_llm = False
    
    def explain(self,
               scoring_result: Dict[str, Any],
               check_results: List[Dict[str, Any]],
               profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate explanations and issue summaries.
        
        Returns:
            ExplainerResult with narrative and issue summaries
        """
        start_time = datetime.now()
        
        if self.use_llm:
            if self.provider == "gemini":
                result = self._explain_with_gemini(scoring_result, check_results, profile)
            elif self.provider == "openai":
                result = self._explain_with_openai(scoring_result, check_results, profile)
            else:
                result = self._explain_with_stub(scoring_result, check_results, profile)
        else:
            result = self._explain_with_stub(scoring_result, check_results, profile)
        
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        result["duration_ms"] = duration_ms
        result["mode"] = self.provider if self.use_llm else "stub"
        result["llm_enabled"] = self.use_llm
        
        return result
    
    def _explain_with_gemini(self,
                            scoring_result: Dict[str, Any],
                            check_results: List[Dict[str, Any]],
                            profile: Dict[str, Any]) -> Dict[str, Any]:
        """Generate explanations using Google Gemini API."""
        try:
            # Prepare context for the LLM (only metadata, no raw data)
            failing_checks = [c for c in check_results if not c.get("passed", True)]
            
            prompt = self._build_gemini_prompt(scoring_result, failing_checks, profile)
            
            # Call Gemini API with timeout
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 1024,
                }
            )
            
            if response and response.text:
                return self._parse_gemini_response(response.text, scoring_result, failing_checks)
            else:
                return self._explain_with_stub(scoring_result, check_results, profile)
                
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._explain_with_stub(scoring_result, check_results, profile)
    
    def _build_gemini_prompt(self, 
                            scoring_result: Dict[str, Any],
                            failing_checks: List[Dict[str, Any]],
                            profile: Dict[str, Any]) -> str:
        """Build prompt for Gemini API."""
        composite_score = scoring_result.get("composite_dqs", 0)
        dimension_scores = scoring_result.get("dimension_scores", {})
        
        # Format dimension scores
        dim_summary = "\n".join([
            f"- {dim}: {data.get('score', 0):.1f}/100"
            for dim, data in dimension_scores.items()
        ])
        
        # Format failing checks
        issues_summary = "\n".join([
            f"- [{c.get('severity', 'medium').upper()}] {c.get('check_id', 'unknown')}: {c.get('dimension', 'unknown')}"
            for c in failing_checks[:10]
        ])
        
        return f"""You are a data quality expert analyzing payment transaction data. 
Generate a professional executive summary for a data quality assessment.

DATASET OVERVIEW:
- Rows: {profile.get('row_count', 0):,}
- Columns: {profile.get('column_count', 0)}

QUALITY SCORES:
- Overall Score: {composite_score:.1f}/100
{dim_summary}

ISSUES FOUND ({len(failing_checks)} total):
{issues_summary if issues_summary else "No critical issues found."}

Generate a 2-3 paragraph executive summary that:
1. States the overall data quality status (Good/Fair/Poor based on score)
2. Highlights the most critical issues affecting payment processing
3. Provides actionable recommendations for improvement

Keep it professional and concise. Focus on business impact for payment data.
"""

    def _parse_gemini_response(self,
                              response_text: str,
                              scoring_result: Dict[str, Any],
                              failing_checks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Parse Gemini response into structured output."""
        return {
            "summary": response_text.strip(),
            "issue_summaries": self._generate_issue_summaries(failing_checks),
            "recommendations": self._extract_recommendations(response_text),
            "business_impact": self._assess_business_impact(scoring_result),
            "generated_by": "gemini-1.5-flash"
        }
    
    def _explain_with_openai(self,
                            scoring_result: Dict[str, Any],
                            check_results: List[Dict[str, Any]],
                            profile: Dict[str, Any]) -> Dict[str, Any]:
        """Generate explanations using OpenAI API."""
        try:
            failing_checks = [c for c in check_results if not c.get("passed", True)]
            
            prompt = self._build_gemini_prompt(scoring_result, failing_checks, profile)
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1024
            )
            
            if response.choices:
                text = response.choices[0].message.content
                return {
                    "summary": text.strip(),
                    "issue_summaries": self._generate_issue_summaries(failing_checks),
                    "recommendations": self._extract_recommendations(text),
                    "business_impact": self._assess_business_impact(scoring_result),
                    "generated_by": "gpt-3.5-turbo"
                }
        except Exception as e:
            print(f"OpenAI API error: {e}")
        
        return self._explain_with_stub(scoring_result, check_results, profile)
    
    def _explain_with_stub(self,
                          scoring_result: Dict[str, Any],
                          check_results: List[Dict[str, Any]],
                          profile: Dict[str, Any]) -> Dict[str, Any]:
        """Generate explanations using deterministic logic (no LLM)."""
        composite_score = scoring_result.get("composite_dqs", 0)
        failing_checks = [c for c in check_results if not c.get("passed", True)]
        
        # Generate deterministic summary
        if composite_score >= 80:
            quality_status = "GOOD"
            summary = f"The dataset demonstrates good data quality with an overall score of {composite_score:.1f}/100. "
        elif composite_score >= 60:
            quality_status = "FAIR"
            summary = f"The dataset shows fair data quality with a score of {composite_score:.1f}/100. Some improvements are recommended. "
        else:
            quality_status = "POOR"
            summary = f"The dataset has significant data quality issues with a score of {composite_score:.1f}/100. Immediate attention is required. "
        
        # Add issue context
        if failing_checks:
            critical_count = sum(1 for c in failing_checks if c.get("severity") == "critical")
            high_count = sum(1 for c in failing_checks if c.get("severity") == "high")
            
            if critical_count > 0:
                summary += f"Found {critical_count} critical issues that could impact payment processing integrity. "
            if high_count > 0:
                summary += f"Identified {high_count} high-priority issues requiring review. "
            
            # List top dimensions affected
            dimensions = set(c.get("dimension", "unknown") for c in failing_checks)
            if dimensions:
                summary += f"Key areas of concern: {', '.join(dimensions)}."
        else:
            summary += "No significant data quality issues were detected in the current analysis."
        
        return {
            "summary": summary,
            "issue_summaries": self._generate_issue_summaries(failing_checks),
            "recommendations": self._generate_recommendations(failing_checks),
            "business_impact": self._assess_business_impact(scoring_result),
            "generated_by": "deterministic_stub"
        }
    
    def _generate_issue_summaries(self, failing_checks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate human-readable summaries for each failing check."""
        summaries = []
        
        for check in failing_checks[:10]:  # Limit to top 10
            check_id = check.get("check_id", "unknown")
            severity = check.get("severity", "medium")
            dimension = check.get("dimension", "unknown")
            metrics = check.get("metrics", {})
            
            # Generate description based on check type
            description = self._get_check_description(check_id, metrics)
            
            summaries.append({
                "check_id": check_id,
                "severity": severity,
                "dimension": dimension,
                "description": description,
                "impact": self._get_severity_impact(severity)
            })
        
        return summaries
    
    def _get_check_description(self, check_id: str, metrics: Dict[str, Any]) -> str:
        """Get human-readable description for a check."""
        descriptions = {
            "completeness_null": f"Missing values detected in critical fields. Null rate: {metrics.get('overall_null_rate', 0)*100:.1f}%",
            "validity_currency": f"Invalid currency codes found. Invalid rate: {metrics.get('overall_invalid_rate', 0)*100:.1f}%",
            "validity_country": f"Invalid country codes detected in the dataset.",
            "validity_amount": f"Amount validation issues including negative or extreme values.",
            "uniqueness_duplicates": f"Duplicate records found in key columns. Duplicate rate: {metrics.get('overall_duplicate_rate', 0)*100:.1f}%",
            "timeliness_event_lag": f"Data freshness issues detected. Average lag: {metrics.get('avg_lag_hours', 0):.1f} hours.",
            "ml_numeric_anomalies": f"Statistical anomalies detected in numeric columns using ML analysis.",
            "ml_row_anomalies": f"Multivariate anomalies detected across multiple fields.",
        }
        
        return descriptions.get(check_id, f"Issue detected: {check_id}")
    
    def _get_severity_impact(self, severity: str) -> str:
        """Get impact description for severity level."""
        impacts = {
            "critical": "May cause payment failures, compliance violations, or financial discrepancies.",
            "high": "Could lead to transaction delays, reporting errors, or customer impact.",
            "medium": "May affect data analytics accuracy or operational efficiency.",
            "low": "Minor issue with limited operational impact."
        }
        return impacts.get(severity, "Unknown impact level.")
    
    def _generate_recommendations(self, failing_checks: List[Dict[str, Any]]) -> List[str]:
        """Generate actionable recommendations based on failing checks."""
        recommendations = []
        dimensions_seen = set()
        
        for check in failing_checks:
            dimension = check.get("dimension", "unknown")
            severity = check.get("severity", "medium")
            
            if dimension in dimensions_seen:
                continue
            dimensions_seen.add(dimension)
            
            # Generate dimension-specific recommendations
            if dimension == "completeness":
                recommendations.append("Implement mandatory field validation at data ingestion to prevent null values in critical fields.")
            elif dimension == "validity":
                recommendations.append("Add reference data validation for currencies, countries, and MCC codes against ISO standards.")
            elif dimension == "uniqueness":
                recommendations.append("Enable duplicate detection during batch processing with transaction ID validation.")
            elif dimension == "timeliness":
                recommendations.append("Review data pipeline latency and implement real-time monitoring for stale data detection.")
            elif dimension == "anomaly_detection":
                recommendations.append("Investigate ML-detected anomalies for potential fraud patterns or data corruption.")
        
        if not recommendations:
            recommendations.append("Continue monitoring data quality metrics for early issue detection.")
        
        return recommendations[:5]  # Limit to top 5
    
    def _extract_recommendations(self, response_text: str) -> List[str]:
        """Extract recommendations from LLM response."""
        # Simple extraction - look for numbered items or bullet points
        lines = response_text.split('\n')
        recommendations = []
        
        for line in lines:
            line = line.strip()
            if line.startswith(('-', '•', '*')) or (line[:2].isdigit() and '.' in line[:3]):
                clean_line = line.lstrip('-•*0123456789. ')
                if len(clean_line) > 20:  # Meaningful recommendation
                    recommendations.append(clean_line)
        
        return recommendations[:5] if recommendations else ["Review data quality issues and implement validation controls."]
    
    def _assess_business_impact(self, scoring_result: Dict[str, Any]) -> Dict[str, Any]:
        """Assess business impact based on scoring."""
        score = scoring_result.get("composite_dqs", 0)
        
        if score >= 90:
            risk_level = "LOW"
            payment_risk = "Minimal risk to payment processing"
            compliance_risk = "Compliant with data quality standards"
        elif score >= 70:
            risk_level = "MEDIUM"
            payment_risk = "Some transactions may require manual review"
            compliance_risk = "Minor compliance gaps may exist"
        elif score >= 50:
            risk_level = "HIGH"
            payment_risk = "Elevated risk of payment failures or errors"
            compliance_risk = "Significant compliance issues likely"
        else:
            risk_level = "CRITICAL"
            payment_risk = "High likelihood of payment processing failures"
            compliance_risk = "Major compliance violations expected"
        
        return {
            "risk_level": risk_level,
            "payment_processing_risk": payment_risk,
            "compliance_risk": compliance_risk,
            "score": score
        }

"""
Orchestrator: Coordinates agent execution pipeline.
"""
import pandas as pd
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from .agents.profiler_agent import ProfilerAgent
from .agents.dimension_selector_agent import DimensionSelectorAgent
from .agents.check_executor_agent import CheckExecutorAgent
from .agents.scoring_agent import ScoringAgent
from .agents.explainer_agent import ExplainerAgent
from .agents.remediation_agent import RemediationAgent
from .agents.test_export_agent import TestExportAgent
from .agents.anomaly_detection_agent import AnomalyDetectionAgent
from .utils.hashing import compute_dataset_fingerprint
from .utils.governance import generate_governance_report
from .utils.json_utils import sanitize_for_json
from . import storage
from .models import Run, RunStatus, DimensionScore, CheckResult, AgentLog, Artifact, ArtifactType
import json


class Orchestrator:
    """Orchestrates the data quality scoring pipeline."""
    
    def __init__(self):
        # Initialize agents
        self.profiler = ProfilerAgent()
        self.dimension_selector = DimensionSelectorAgent()
        self.check_executor = CheckExecutorAgent()
        self.scorer = ScoringAgent()
        self.explainer = ExplainerAgent()
        self.remediator = RemediationAgent()
        self.test_exporter = TestExportAgent()
        self.anomaly_detector = AnomalyDetectionAgent()
    
    async def process_dataset(self,
                             df: pd.DataFrame,
                             dataset_name: Optional[str] = None,
                             reference_data: Optional[Dict[str, pd.DataFrame]] = None) -> str:
        """
        Process dataset through the full DQS pipeline.
        
        Args:
            df: Dataset DataFrame (in-memory only, not persisted)
            dataset_name: Optional dataset name
            reference_data: Optional reference datasets
        
        Returns:
            run_id
        """
        # Generate run ID
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        
        # Compute dataset fingerprint
        fingerprint = compute_dataset_fingerprint(df)
        
        # Create run record
        run = Run(
            run_id=run_id,
            dataset_name=dataset_name or "unnamed_dataset",
            dataset_fingerprint=fingerprint,
            row_count=len(df),
            column_count=len(df.columns),
            status=RunStatus.PROCESSING
        )
        storage.create_run(run)
        
        try:
            # Determine which references are available
            has_references = {}
            if reference_data:
                has_references = {
                    "bin_map": "bin_map" in reference_data,
                    "currency_rules": "currency_rules" in reference_data,
                    "mcc_codes": "mcc_codes" in reference_data,
                    "settlement_ledger": "settlement_ledger" in reference_data,
                    "merchants": "merchants" in reference_data,
                    "customers": "customers" in reference_data
                }
            
            # Step 1: Profiler Agent
            profiler_result = self.profiler.profile(df)
            profile = profiler_result["profile"]
            self._log_agent_step(run_id, 1, self.profiler.name, {}, profiler_result)
            self._save_artifact(run_id, ArtifactType.PROFILE, json.dumps(sanitize_for_json(profile), indent=2))
            
            # Step 2: Dimension Selector Agent
            dimension_result = self.dimension_selector.select_dimensions(profile, has_references)
            selected_dimensions = dimension_result["selected_dimensions"]
            self._log_agent_step(run_id, 2, self.dimension_selector.name, 
                               {"profile_summary": {"row_count": profile["row_count"]}}, 
                               dimension_result)
            self._save_artifact(run_id, ArtifactType.DIMENSIONS, json.dumps(sanitize_for_json(dimension_result), indent=2))
            
            # Step 3: Check Executor Agent
            check_result = self.check_executor.execute_checks(
                df, profile, selected_dimensions, reference_data
            )
            check_results = check_result["check_results"]
            self._log_agent_step(run_id, 3, self.check_executor.name,
                               {"dimensions": selected_dimensions},
                               {"total_checks": check_result["total_checks"]})
            self._save_artifact(run_id, ArtifactType.CHECKS, json.dumps(sanitize_for_json(check_results), indent=2))
            
            # Step 3.5: Anomaly Detection Agent (ML-based)
            anomaly_result = self.anomaly_detector.detect(df, profile)
            self._log_agent_step(run_id, "3.5", self.anomaly_detector.name,
                               {"contamination": anomaly_result.get("contamination", 0.05)},
                               {"total_anomalies": anomaly_result.get("total_anomalies", 0)})
            
            # Merge ML anomaly check results with rule-based checks
            ml_checks = anomaly_result.get("check_results", [])
            check_results.extend(ml_checks)
            
            # Save check results to database
            self._save_check_results(run_id, check_results)
            
            # Step 4: Scoring Agent
            scoring_result = self.scorer.compute_scores(check_results, profile, selected_dimensions)
            self._log_agent_step(run_id, 4, self.scorer.name,
                               {"total_checks": len(check_results)},
                               {"composite_dqs": scoring_result["composite_dqs"]})
            self._save_artifact(run_id, ArtifactType.SCORES, json.dumps(sanitize_for_json(scoring_result), indent=2))
            
            # Save dimension scores to database
            self._save_dimension_scores(run_id, scoring_result)
            
            # Step 5: Explainer Agent
            explainer_result = self.explainer.explain(scoring_result, check_results, profile)
            self._log_agent_step(run_id, 5, self.explainer.name,
                               {"mode": explainer_result["mode"]},
                               {"narrative_length": len(explainer_result.get("summary", ""))})
            self._save_artifact(run_id, ArtifactType.NARRATIVE, explainer_result.get("summary", ""))
            
            # Step 6: Remediation Agent
            remediation_result = self.remediator.generate_remediation(
                check_results, scoring_result, explainer_result["issue_summaries"]
            )
            self._log_agent_step(run_id, 6, self.remediator.name,
                               {"total_issues": len(check_results)},
                               {"top_issues_count": len(remediation_result["top_issues"])})
            self._save_artifact(run_id, ArtifactType.REMEDIATION, json.dumps(sanitize_for_json(remediation_result), indent=2))
            
            # Step 7: Test Export Agent
            test_export_result = self.test_exporter.export_tests(check_results, profile)
            self._log_agent_step(run_id, 7, self.test_exporter.name,
                               {},
                               {"artifacts_generated": 2})
            
            # Save test artifacts
            self._save_artifact(run_id, ArtifactType.DBT, test_export_result["dbt_yaml"])
            self._save_artifact(run_id, ArtifactType.GE, test_export_result["ge_suite_json"])
            
            # Generate governance report
            agent_logs = storage.get_agent_logs(run_id)
            agent_logs_dict = [
                {
                    "agent_name": log.agent_name,
                    "step_order": log.step_order,
                    "duration_ms": log.duration_ms
                }
                for log in agent_logs
            ]
            
            governance_report = generate_governance_report(
                run_id, profile, scoring_result, agent_logs_dict
            )
            self._save_artifact(run_id, ArtifactType.GOVERNANCE, governance_report)
            
            # Update run status
            storage.update_run(
                run_id,
                status=RunStatus.COMPLETED,
                composite_dqs=scoring_result["composite_dqs"]
            )
            
            return run_id
            
        except Exception as e:
            # Update run status to failed
            storage.update_run(
                run_id,
                status=RunStatus.FAILED,
                error_message=str(e)
            )
            raise
    
    def _log_agent_step(self, run_id: str, step_order: int, agent_name: str,
                       inputs: Dict[str, Any], outputs: Dict[str, Any]):
        """Log agent execution step."""
        log = AgentLog(
            run_id=run_id,
            agent_name=agent_name,
            step_order=step_order,
            inputs=inputs,
            outputs=outputs,
            duration_ms=outputs.get("duration_ms", 0)
        )
        storage.create_agent_log(log)
    
    def _save_artifact(self, run_id: str, artifact_type: ArtifactType, content: str):
        """Save artifact to database."""
        artifact = Artifact(
            run_id=run_id,
            artifact_type=artifact_type,
            content=content
        )
        storage.create_artifact(artifact)
    
    def _save_check_results(self, run_id: str, check_results: list):
        """Save check results to database."""
        results = []
        for check in check_results:
            result = CheckResult(
                run_id=run_id,
                check_id=check["check_id"],
                dimension=check["dimension"],
                passed=bool(check["passed"]),
                severity=check["severity"],
                metrics=sanitize_for_json(check.get("metrics", {}))
            )
            results.append(result)
        storage.create_check_results(results)
    
    def _save_dimension_scores(self, run_id: str, scoring_result: Dict[str, Any]):
        """Save dimension scores to database."""
        scores = []
        for dimension, score_data in scoring_result["dimension_scores"].items():
            score = DimensionScore(
                run_id=run_id,
                dimension=dimension,
                score=float(score_data["score"]),
                weight=float(score_data["weight"]),
                explainability=sanitize_for_json(score_data["explainability"])
            )
            scores.append(score)
        storage.create_dimension_scores(scores)

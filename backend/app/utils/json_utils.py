"""
JSON serialization utilities.
"""
import numpy as np
from typing import Any


def sanitize_for_json(obj: Any) -> Any:
    """
    Convert numpy types to native Python types for JSON serialization.
    Recursively handles dicts, lists, and numpy types.
    """
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(item) for item in obj]
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.str_):
        return str(obj)
    else:
        return obj

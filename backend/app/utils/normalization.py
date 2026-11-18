import re
from typing import Iterable, Optional
from urllib.parse import unquote

_WHITESPACE_RE = re.compile(r"\s+")
_INVALID_MARKERS = {"", "NA"}


def _unquote_value(value: str, max_passes: int = 2) -> str:
    current = value
    for _ in range(max_passes):
        decoded = unquote(current)
        if decoded == current:
            break
        current = decoded
    return current


def collapse_internal_whitespace(value: str) -> str:
    return _WHITESPACE_RE.sub(" ", value)


def normalize_case(value: str) -> str:
    return value.lower()


def normalize_entity_display(value: Optional[str]) -> str:
    """Decode percent-encoding, strip edges, and collapse internal whitespace."""
    if value is None:
        return ""
    decoded = _unquote_value(str(value))
    stripped = decoded.strip()
    return collapse_internal_whitespace(stripped)


def normalize_entity_identifier(value: Optional[str]) -> str:
    """
    Universal entity normalization pipeline (DEFECT-018):
    unquote -> strip -> collapse_internal_whitespace -> normalize_case.
    """
    cleaned = normalize_entity_display(value)
    return normalize_case(cleaned)


def normalize_ap_identifier(value: Optional[str]) -> Optional[str]:
    """
    Centralized AP identifier normalization utility (DEFECT-012).
    Treats NULL, '', 'NA', 'na', ' Na ', and whitespace-only strings as None.
    """
    if value is None:
        return None
    cleaned = normalize_entity_display(value)
    if cleaned.upper() in _INVALID_MARKERS:
        return None
    return cleaned


def is_valid_ap_identifier(value: Optional[str]) -> bool:
    return normalize_ap_identifier(value) is not None


def normalize_ap_list(values: Optional[Iterable[Optional[str]]]) -> list[str]:
    if not values:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for item in values:
        cleaned = normalize_ap_identifier(item)
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalized.append(cleaned)
    return normalized

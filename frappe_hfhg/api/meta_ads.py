import re
from typing import Optional


TRAILING_DIGITS_PATTERN = re.compile(r"(?:_)?\d{6,}$")


def clean_meta_ads_name(doc, method: Optional[str] = None) -> None:
    """Strip trailing 6+ digit batches (optionally prefixed with `_`) from ads_name."""
    ads_name = (doc.ads_name or "").strip()
    if not ads_name:
        return

    cleaned = TRAILING_DIGITS_PATTERN.sub("", ads_name)
    if cleaned:
        doc.ads_name = cleaned
    else:
        doc.ads_name = ads_name


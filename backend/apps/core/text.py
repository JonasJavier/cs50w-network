"""Lightweight parsing of hashtags and @mentions in user-generated text."""

import re

HASHTAG_RE = re.compile(r"(?<![\w&])#([^\W_][\w]{0,49})", re.UNICODE)
MENTION_RE = re.compile(r"(?<![\w.@])@([A-Za-z0-9_.]{1,30})(?![\w.])")

MAX_TAGS_PER_POST = 10


def extract_hashtags(text: str) -> list[str]:
    """Unique, lower-cased hashtags in order of appearance (max 10)."""
    seen: dict[str, None] = {}
    for match in HASHTAG_RE.finditer(text or ""):
        tag = match.group(1).lower()
        if not any(char.isalpha() for char in tag):  # "#2024" is not a topic
            continue
        seen.setdefault(tag, None)
        if len(seen) >= MAX_TAGS_PER_POST:
            break
    return list(seen)


def extract_mentions(text: str) -> list[str]:
    """Unique usernames mentioned with ``@`` in order of appearance."""
    seen: dict[str, None] = {}
    for match in MENTION_RE.finditer(text or ""):
        seen.setdefault(match.group(1).rstrip("."), None)
    return [name for name in seen if name]

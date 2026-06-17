#!/usr/bin/env python3
"""
format_name.py — Validate and normalise chat names.

Usage:
    python3 format_name.py "PREFIX | Topic | YYYY-MM-DD [flag]"
    python3 format_name.py --batch < names.txt
    cat names.txt | python3 format_name.py --batch

Outputs validated names on stdout; errors and warnings on stderr.
Exit code 0 if all names valid, 1 if any errors.
"""

import sys
import re
import argparse
from datetime import datetime, date

VALID_PREFIXES = {
    "EXN", "KAI", "CLIENT", "ART", "LI", "COMS", "READ", "CAR", "TOOL", "LIFE"
}

VALID_FLAGS = {"[DOC]", "[>]"}

# Client filename signal patterns. If any artifact filename matches, the
# prefix MUST be CLIENT. Pattern set deliberately conservative — false
# positives are worse than false negatives here since the operator
# (Rocky / Claude) can override with explicit reasoning.
CLIENT_REF_CODE_PATTERN = re.compile(
    r"\b\d{2}-[A-Z]{2,5}\d{3,5}[A-Z]{2,4}V?\d*\b"
)
CLIENT_KEYWORDS = {
    "quotation",
    "tender",
    "sow",
    "statement of work",
}
# Known clients with live or recent commercial engagement (May 2026).
# Update as Rocky's client roster evolves — done via manual edit, not
# config file, because the list is short and changes infrequently.
KNOWN_CLIENTS = {
    "saab",
    "wartsila",
    "wärtsilä",
    "atlas copco",
    "edwards",
    "rolls-royce",
    "rolls royce",
}


def scan_filename_for_client_signals(filename: str) -> list[str]:
    """Return list of client signals detected in a filename."""
    signals: list[str] = []
    lower = filename.lower()

    if CLIENT_REF_CODE_PATTERN.search(filename):
        match = CLIENT_REF_CODE_PATTERN.search(filename)
        signals.append(f"reference code {match.group(0)!r}")

    for kw in CLIENT_KEYWORDS:
        if kw in lower:
            signals.append(f"keyword {kw!r}")

    for client in KNOWN_CLIENTS:
        if client in lower:
            signals.append(f"named client {client!r}")

    return signals

NAME_PATTERN = re.compile(
    r"^"
    r"(?P<prefix>[A-Z]+)"
    r"\s*\|\s*"
    r"(?P<topic>[^|]+?)"
    r"\s*\|\s*"
    r"(?P<date>\d{4}-\d{2}-\d{2})"
    r"(?P<flags>(?:\s+\[[^\]]+\])*)"
    r"\s*$"
)

MAX_TOTAL_LEN = 100  # soft warning above 80, hard error above 100
SOFT_LEN_WARNING = 80
MIN_TOPIC_WORDS = 3
MAX_TOPIC_WORDS = 12  # 10 is target, 12 is hard cap


def validate_name(
    name: str,
    artifacts: list[str] | None = None,
) -> tuple[str | None, list[str], list[str]]:
    """
    Validate a single chat name.

    If `artifacts` is provided, cross-check the prefix against client
    filename signals (reference codes, keywords, named clients). When
    signals are detected and the prefix is not CLIENT, emit an error.

    Returns (normalised_name_or_None, errors, warnings).
    If errors is non-empty, normalised_name is None.
    """
    errors: list[str] = []
    warnings: list[str] = []

    raw = name.strip()
    if not raw:
        errors.append("empty name")
        return None, errors, warnings

    match = NAME_PATTERN.match(raw)
    if not match:
        errors.append(
            f"does not match format 'PREFIX | Topic | YYYY-MM-DD [flags]': {raw!r}"
        )
        return None, errors, warnings

    prefix = match.group("prefix")
    topic = match.group("topic").strip()
    date_str = match.group("date")
    flags_str = match.group("flags").strip()

    # Validate prefix
    if prefix not in VALID_PREFIXES:
        errors.append(
            f"prefix {prefix!r} not in allowed set: "
            f"{sorted(VALID_PREFIXES)}"
        )

    # Validate topic
    topic_words = topic.split()
    if len(topic_words) < MIN_TOPIC_WORDS:
        warnings.append(
            f"topic {topic!r} has only {len(topic_words)} word(s); "
            f"prefer ≥{MIN_TOPIC_WORDS} for specificity"
        )
    if len(topic_words) > MAX_TOPIC_WORDS:
        errors.append(
            f"topic {topic!r} has {len(topic_words)} words; "
            f"max is {MAX_TOPIC_WORDS} (target ≤10)"
        )
    if len(topic_words) > 10:
        warnings.append(
            f"topic {topic!r} is {len(topic_words)} words; "
            "consider trimming toward ≤10"
        )

    # Check for forbidden characters in topic
    if "/" in topic:
        errors.append(f"topic contains slash: {topic!r}")
    if "\\" in topic:
        errors.append(f"topic contains backslash: {topic!r}")
    if "—" in topic:
        warnings.append(
            f"topic contains em dash (—); Rocky's style prefers hyphens: {topic!r}"
        )

    # Validate date
    try:
        parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = date.today()
        if parsed_date > today:
            warnings.append(
                f"date {date_str} is in the future "
                f"(today: {today.isoformat()})"
            )
        # Reasonable lower bound — Rocky founded Kaipability June 2024
        if parsed_date.year < 2024:
            warnings.append(
                f"date {date_str} predates Kaipability (founded June 2024); "
                "double-check"
            )
    except ValueError:
        errors.append(
            f"date {date_str!r} is not a valid YYYY-MM-DD date"
        )

    # Validate flags
    flags_normalised: list[str] = []
    if flags_str:
        # Split on whitespace, each token should be a flag
        flag_tokens = flags_str.split()
        for tok in flag_tokens:
            if tok not in VALID_FLAGS:
                errors.append(
                    f"flag {tok!r} not in allowed set: "
                    f"{sorted(VALID_FLAGS)}"
                )
            else:
                flags_normalised.append(tok)
        # Check for duplicates
        if len(flags_normalised) != len(set(flags_normalised)):
            warnings.append(f"duplicate flags in: {flags_str}")
            flags_normalised = sorted(set(flags_normalised), key=flag_tokens.index)

    # Build normalised form
    if errors:
        return None, errors, warnings

    parts = [prefix, topic, date_str]
    normalised = " | ".join(parts)
    if flags_normalised:
        # Canonical flag order: [DOC] before [>]
        order = {"[DOC]": 0, "[>]": 1}
        flags_sorted = sorted(flags_normalised, key=lambda f: order.get(f, 99))
        normalised += " " + " ".join(flags_sorted)

    # Length checks on the normalised form
    if len(normalised) > MAX_TOTAL_LEN:
        errors.append(
            f"name is {len(normalised)} chars; hard max is {MAX_TOTAL_LEN}"
        )
        return None, errors, warnings
    if len(normalised) > SOFT_LEN_WARNING:
        warnings.append(
            f"name is {len(normalised)} chars; aim for ≤{SOFT_LEN_WARNING} "
            "(longer names get truncated in chat lists)"
        )

    # Artifact cross-check: if any artifact filename signals CLIENT,
    # the prefix must be CLIENT. This catches the failure mode where a
    # chat feels like internal strategy but produced a client deliverable.
    if artifacts:
        all_signals: list[tuple[str, list[str]]] = []
        for fname in artifacts:
            sigs = scan_filename_for_client_signals(fname)
            if sigs:
                all_signals.append((fname, sigs))

        if all_signals and prefix != "CLIENT":
            details = "; ".join(
                f"{fname!r}: {', '.join(sigs)}" for fname, sigs in all_signals
            )
            errors.append(
                f"artifact filename(s) signal CLIENT but prefix is {prefix!r}: "
                f"{details}. Reclassify as CLIENT or remove the artifact "
                "from cross-check."
            )
            return None, errors, warnings

    return normalised, errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate and normalise chat names against the convention."
    )
    parser.add_argument(
        "name",
        nargs="?",
        help="A single chat name to validate (or use --batch for stdin)",
    )
    parser.add_argument(
        "--batch",
        action="store_true",
        help="Read one name per line from stdin",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Treat warnings as errors",
    )
    parser.add_argument(
        "--artifacts",
        nargs="+",
        default=None,
        help=(
            "Optional artifact filenames to cross-check against. If any "
            "filename matches a client signal pattern (reference code, "
            "Quotation/Tender/SOW keyword, or known client name), the prefix "
            "must be CLIENT."
        ),
    )

    args = parser.parse_args()

    if args.batch:
        names = [line.rstrip("\n") for line in sys.stdin if line.strip()]
    elif args.name:
        names = [args.name]
    else:
        parser.error("provide a name or use --batch")
        return 1

    any_errors = False
    for idx, name in enumerate(names, start=1):
        normalised, errors, warnings = validate_name(name, args.artifacts)
        line_prefix = f"[{idx}] " if len(names) > 1 else ""

        for w in warnings:
            print(f"{line_prefix}WARN: {w}", file=sys.stderr)
            if args.strict:
                any_errors = True

        for e in errors:
            print(f"{line_prefix}ERROR: {e}", file=sys.stderr)
            any_errors = True

        if normalised:
            print(normalised)
        else:
            # Print original so the index alignment isn't lost in batch mode
            print(f"INVALID: {name}")

    return 1 if any_errors else 0


if __name__ == "__main__":
    sys.exit(main())

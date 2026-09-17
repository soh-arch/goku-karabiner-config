#!/usr/bin/env bash
# Read the remaining Gemini weekly quota from the Antigravity CLI.
# Prints "<remaining-percent> <reset-timestamp>". Exits 2 when it cannot be read.
#
# The /usage command is not a model call: three consecutive invocations left the
# reported figure unchanged, so calling it before and after a run costs nothing.
set -uo pipefail

command -v agy >/dev/null || { echo "agy not found on PATH" >&2; exit 2; }

raw="$(agy --print-timeout 90s -p="/usage" 2>/dev/null)" \
  || { echo "agy /usage call failed" >&2; exit 2; }

line="$(printf '%s\n' "$raw" | grep -i '^Gemini' | head -1)"
[ -n "$line" ] || { echo "no Gemini row in agy /usage output" >&2; exit 2; }

percent="$(printf '%s\n' "$line" | awk -F'\t' '{print $3}' | tr -d '% ')"
reset="$(printf '%s\n' "$line" | awk -F'\t' '{print $4}' | tr -d ' ')"

case "$percent" in
  ''|*[!0-9]*) echo "unexpected /usage format: $line" >&2; exit 2 ;;
esac

printf '%s %s\n' "$percent" "${reset:-unknown}"

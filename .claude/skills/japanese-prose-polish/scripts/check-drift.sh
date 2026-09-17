#!/usr/bin/env bash
# Verify that proofreading did not alter facts that must be preserved verbatim.
# Usage: ./check-drift.sh <original> <polished>
set -uo pipefail

orig="${1:?usage: check-drift.sh <original> <polished>}"
new="${2:?usage: check-drift.sh <original> <polished>}"
status=0

extract() {
    case "$2" in
        heading) grep -E '^#{1,6} ' -- "$1" ;;
        fence)   awk '/^(```|~~~)/{f=!f; print; next} f{print}' < "$1" ;;
        code)    grep -oE '`[^`]+`' -- "$1" ;;
        url)     grep -oE 'https?://[^ )<>"]+' -- "$1" ;;
        number)  grep -oE '[0-9]+([.,][0-9]+)*' -- "$1" ;;
        ascii)   grep -oE '[A-Za-z][A-Za-z0-9_.-]{2,}' -- "$1" | grep -vE '^https?$' ;;
    esac | sort
}

# Headings, code, URLs and numbers must survive byte-for-byte.
for kind in heading fence code url number; do
    if ! d=$(diff <(extract "$orig" "$kind") <(extract "$new" "$kind")); then
        echo "DRIFT [$kind]"
        echo "$d" | sed 's/^/  /'
        status=1
    fi
done

# Identifiers and proper nouns are judged by vocabulary, not by count: restoring an
# omitted subject legitimately repeats a name that is already in the text, while
# losing a name or inventing one is a real defect.
lost=$(comm -23 <(extract "$orig" ascii | uniq) <(extract "$new" ascii | uniq))
invented=$(comm -13 <(extract "$orig" ascii | uniq) <(extract "$new" ascii | uniq))
if [ -n "$lost" ] || [ -n "$invented" ]; then
    echo "DRIFT [ascii]"
    [ -n "$lost" ] && echo "$lost" | sed 's/^/  lost: /'
    [ -n "$invented" ] && echo "$invented" | sed 's/^/  invented: /'
    status=1
elif ! diff -q <(extract "$orig" ascii) <(extract "$new" ascii) >/dev/null; then
    echo "WARN [ascii] a name already in the text changed count; expected when an omitted subject was restored"
fi

[ "$status" -eq 0 ] && echo "OK: headings, fences, code spans, URLs, numbers and identifiers all check out."
exit "$status"

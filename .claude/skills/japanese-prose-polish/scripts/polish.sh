#!/usr/bin/env bash
# Polish Japanese prose with Gemini 3.8 Flash via the Antigravity CLI, then verify
# that nothing factual drifted. Fenced code blocks are hidden from the model and
# restored afterwards, so they cannot be rewritten and cost no tokens.
#
# Usage: polish.sh <file> [low|medium|high]
# Writes <file>.polished.<ext>. Exit 1 drift check failed, 2 environment problem,
# 3 not enough weekly quota left to finish the document.
set -uo pipefail

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
file="${1:?usage: polish.sh <file> [low|medium|high]}"
effort="${2:-high}"

command -v agy >/dev/null || { echo "agy not found on PATH" >&2; exit 2; }
command -v python3 >/dev/null || { echo "python3 not found on PATH" >&2; exit 2; }
[ -f "$file" ] || { echo "no such file: $file" >&2; exit 2; }

# Pinned on purpose. The proofreading quality this skill relies on was measured on
# Gemini 3.8 Flash specifically, not on the Gemini line as a whole, so a newer
# generation must never be picked up automatically.
model="gemini-3.8-flash-${effort}"
out="${file%.*}.polished.${file##*.}"

# The payload below stays in Japanese: it instructs a Japanese proofreader, and every
# measurement backing this skill was made with this exact wording.
read -r -d '' INSTRUCTIONS <<'EOF' || true
あなたは日本語のテクニカルライティング校正者です。
以下の文章は英語話者的な発想で書かれており、日本語として不自然な箇所があります。
求めているのは「AIが書いた上手な文章」ではなく「この文章の読みやすい版」です。

【変えてはならないもの】
- 意図・内容・事実。情報を削らない。要約しない。段落を統合しない。
- 数値、金額、固有名詞、URL、コードスパンの中身。一字も触らない。
- 見出し。原文のまま残す。
- 文体と語尾の温度感。言い切りや体言止めは意図的なものなので丁寧語に直さない。
- 書き手の判断や態度を表す述語(「強める」「勧める」等)。別の語に置き換えない。
- 主張の断定の強さ。推量を断定に、断定を推量に変えない。
- 敬体と常体の混在。原文が「です・ます」の文はそのまま、「だ・である」の文もそのまま。
  どちらかに統一しない。
- 体言止め。文末の名詞止めは意図的なので、述語を補って文にしない。
- 英語で書かれた部分。翻訳しない。原文のまま残す。
- @@BLOCK_000@@ のような行。コードブロックの代替なので、順序も表記も変えずに
  そのまま1行で出力する。内容を推測して展開しない。

【直すべきもの】
1. 翻訳調・擬人化。非人間を主語にした文は、人間の動作主を立てるか構文を組み替える。
   判定基準は「その動詞が示す動きを、文字どおりに読む読者が想像できるか」。
2. 接続と照応の省略。名詞句を並べて因果や主題の受け渡しを省いている箇所を補う。
3. 内容を持たない空語。「重要なのは」「不可欠」「多角的」「掘り下げる」
   「〜において」「非常に」などは削るか具体化する。
4. 冗長。同じ主張の言い換え反復、詳述後の要約、無意味な転換文を削る。

【出力】
校正後の本文のみを出力する。前置き、解説、変更点の説明は一切書かない。

対象の文章:
---
EOF

# --- preflight -------------------------------------------------------------
# Every call carries the agent system prompt whether the document is long or short,
# so a run is refused rather than started and abandoned half way.

fixed_tokens=13000      # system prompt, charged on every call regardless of payload
bytes_per_token=3       # Japanese UTF-8 runs at roughly one token per character
tokens_per_point=11000  # 1% of the weekly limit, derived from a measured 4 KB run
measured_bytes=4096     # nothing longer than this has been evaluated
safety_factor=3         # see below

# The figure computed here counts the prompt only. The reply and the reasoning the
# model does at high effort are charged too and cannot be predicted from the input,
# so the arithmetic below is a floor, not a forecast. A 7,924 byte run whose floor
# was 1.4 points actually cost 5. The gate therefore reserves the floor multiplied
# by safety_factor, and every run prints floor against measured so the factor can be
# corrected with real numbers.

bytes=$(wc -c < "$file" | tr -d ' ')
body_tokens=$((bytes / bytes_per_token))
est_tenths=$(((fixed_tokens + body_tokens) * 10 / tokens_per_point))
[ "$est_tenths" -gt 0 ] || est_tenths=1
need=$((est_tenths * safety_factor / 10 + 1))  # reserve, rounded up to whole points

quota="$("$here/usage.sh")" || exit 2
before="${quota%% *}"
reset="${quota##* }"

printf -- '--- Preflight\n'
printf '    file       %s (%s bytes)\n' "$file" "$bytes"
printf '    floor      %d.%d%% of the weekly limit (%d fixed + ~%d body tokens, reply excluded)\n' \
    $((est_tenths / 10)) $((est_tenths % 10)) "$fixed_tokens" "$body_tokens"
printf '    reserved   %d%% (floor x%d)\n' "$need" "$safety_factor"
printf '    available  %d%%, resets %s\n' "$before" "$reset"

if [ "$before" -lt "$need" ]; then
    printf '    verdict    ABORT: %d%% left, at least %d%% needed to finish this document\n' \
        "$before" "$need" >&2
    exit 3
fi
[ "$bytes" -gt "$measured_bytes" ] \
    && printf '    note       longer than the %d bytes measured; quality at this length is unknown\n' "$measured_bytes"
[ "$before" -lt 10 ] \
    && printf '    note       the weekly limit is nearly exhausted\n'
printf '    verdict    ok\n\n'

work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT

blocks=$(python3 "$here/mask.py" mask "$file" "$work/masked" "$work/store") || exit 2
agy --model "$model" --print-timeout 300s \
    -p="$(printf '%s\n%s' "$INSTRUCTIONS" "$(cat -- "$work/masked")")" > "$work/raw" \
    || { echo "agy call failed" >&2; exit 2; }
python3 "$here/mask.py" unmask "$work/raw" "$work/store" "$out" || exit 2

echo "--- $model, $blocks fenced block(s) withheld -> $out"

# --- quota report ----------------------------------------------------------
# Reported in whole points, so a run costing less than one point can read as 0.
if quota_after="$("$here/usage.sh" 2>/dev/null)"; then
    after="${quota_after%% *}"
    printf -- '--- Quota      %d%% -> %d%%, consumed %d point(s), floor was %d.%d\n' \
        "$before" "$after" $((before - after)) $((est_tenths / 10)) $((est_tenths % 10))
    used=$((before - after))
    [ "$used" -gt 0 ] || used=1
    printf '    remaining  %d%% until %s, about %d more document(s) this size\n\n' \
        "$after" "$reset" $((after / used))
else
    printf -- '--- Quota      could not be read after the run\n\n'
fi
if "$here/check-drift.sh" "$file" "$out"; then
    echo "--- Mechanical check passed. Review the diff below for nuance drift."
    diff -- "$file" "$out"
    exit 0
else
    echo "--- Check failed. Restore the drifted fragments from the original." >&2
    exit 1
fi

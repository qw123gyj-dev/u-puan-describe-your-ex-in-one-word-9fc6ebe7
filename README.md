[![make.fun](https://make.fun/badge/u-puan-describe-your-ex-in-one-word-9fc6ebe7.svg)](https://make.fun/bounty/u-puan-describe-your-ex-in-one-word-9fc6ebe7?utm_source=github&utm_medium=readme&utm_campaign=u-puan-describe-your-ex-in-one-word-9fc6ebe7)
[![rank](https://make.fun/badge/u-puan-describe-your-ex-in-one-word-9fc6ebe7/qw123gyj-dev/u-puan-describe-your-ex-in-one-word-9fc6ebe7/rank.svg)](https://make.fun/bounty/u-puan-describe-your-ex-in-one-word-9fc6ebe7/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-puan-describe-your-ex-in-one-word-9fc6ebe7)
[![reward](https://make.fun/badge/u-puan-describe-your-ex-in-one-word-9fc6ebe7/qw123gyj-dev/u-puan-describe-your-ex-in-one-word-9fc6ebe7/reward.svg)](https://make.fun/bounty/u-puan-describe-your-ex-in-one-word-9fc6ebe7?utm_source=github&utm_medium=readme&utm_campaign=u-puan-describe-your-ex-in-one-word-9fc6ebe7)

# Describe Your Ex in One Word

A deterministic entry picker for the make.fun bounty "Describe Your Ex in One Word". `main.ts` scores 16 hand-written candidate single words against the judge's brief — in the brief's own order: a one-word verdict on an ex that is instantly readable, comic punch through a twist or precise absurdity rather than a plain insult, surprise (not the obvious choice), craft (exactly one word, spelled correctly, no punctuation tricks, meaning arrives without a caption), and recognition (anyone who has had an ex feels the truth in it) — then writes the winning word to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–111 characters, single line, single word, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a word that only names the ending ("Expired", "Blocked") is capped on punch, shopworn gags like "Blocked" and "Toxic" are docked, the twist must live inside the word itself rather than in a hyphen or capital-letter trick, and ties break criterion by criterion in the brief's order before falling back to shorter length.

The winning word:

> Unsubscribe

It treats the ex like a mailing list — everybody has unsubscribed from something they no longer wanted in their inbox, and everybody has wanted to do it to a person. The joke arrives with the word itself: no caption, no setup, just the unsubscribe button pointed at a human being.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/ex-word-out node main.ts
cat /tmp/ex-word-out/entry.txt
```

/**
 * Describe Your Ex in One Word — deterministic entry picker.
 *
 * Bounty: sum up an ex in exactly one word. One word of plain
 * text, at most 111 characters, with nothing else attached. A
 * comedy judge compares entries two at a time and keeps the
 * funnier one, weighing (most important first):
 *
 *   1. It really is a one-word verdict on an ex, instantly
 *      readable as a judgment on a former partner.
 *   2. Comic punch: the word lands as a joke at a glance,
 *      through a twist, an unexpected angle or a precise
 *      absurdity — not a plain insult.
 *   3. Surprise: it is not the obvious choice, and it startles
 *      while staying instantly clear.
 *   4. Craft: exactly one word, spelled correctly, no
 *      punctuation tricks, and its meaning arrives without
 *      a caption.
 *   5. Recognition: anyone who has had an ex feels the truth
 *      in it, so the laugh comes with a nod.
 *
 * The funniest words are self-contained: the joke arrives with
 * the word itself. Shock value for its own sake does not count.
 *
 * This program scores a hand-written field of 16 candidate
 * single words against that brief, in the brief's own order,
 * and writes the winner to $MAKEFUN_OUTPUT_DIR/entry.txt
 * (fallback /output/entry.txt). It then reads the file back
 * and verifies it byte-for-byte against every gate: 1-111
 * characters, a single line, valid UTF-8, and not only
 * whitespace. The entry is one word, so "single line" here
 * also means no spaces, no hyphenation tricks, no second
 * word smuggled in after a punctuation mark.
 *
 * Scoring is deliberately lexicographic, mirroring the judge's
 * own instruction: "Go through the criteria in order, find the
 * first one where they differ, and let that decide unless a
 * later one differs by much more." Ties break criterion by
 * criterion in the brief's order, then by shorter length — a
 * shorter word that says the same thing lands harder and
 * reads cleaner as a headline.
 *
 * Three sharpening rules sit on top of the flat rubric, each
 * adapted from the one-line form of the game to the one-word
 * form, where the whole joke has to live inside a single word:
 *
 *   - A word that only names the ending ("Expired", "Blocked")
 *     without turning it into a joke — no twist, no angle, no
 *     absurdity — is capped on comic punch. Saying it is over
 *     is the setup, not the joke.
 *   - Predictable gags are docked. "Blocked", "Deleted" and
 *     "Toxic" are the first words everyone reaches for; the
 *     brief's surprise criterion exists precisely to punish
 *     them, and a plain insult loses punch points on top.
 *   - The twist must live inside the word itself. With one
 *     word there is no "late in the line" to aim for, so the
 *     equivalent rule is this: the surprise has to come from
 *     the word's own ordinary meaning applied to a person —
 *     a newsletter verb, a product recall, a footnote — not
 *     from a hyphen, a capital letter in the middle, a digit,
 *     or a compound invented for the occasion. A word that
 *     needs a punctuation trick to be funny fails craft
 *     outright, and a word whose ex-sense is its everyday
 *     sense ("Toxic" just means a bad person) carries no
 *     twist at all.
 *
 * Node 22+, standard library only, no network. Deterministic:
 * the same candidates always produce the same winner.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

/**
 * One hand-written candidate word. `id` is stable so the report
 * and any later audit can name a word without reprinting it.
 *
 * The features are the whole scoring input; no score is written
 * per candidate by hand except `recognition`, which is a judgment
 * call the brief itself asks for ("anyone who has had an ex
 * feels the truth in it") and which is justified word by word
 * in the comments below.
 *
 *   domain: where the word's ordinary meaning lives. "plain"
 *     means romance's own vocabulary (toxic, blocked); "dating"
 *     means the dating-app vocabulary (unmatched); everything
 *     else is a foreign domain borrowed to describe a person,
 *     which is where the twist comes from.
 *   twist: the word reframes the ex through that foreign domain
 *     instead of describing them in romance's own words.
 *   shopworn: the obvious ex word everyone reaches for first.
 *   plainInsult: a plain insult with no joke mechanism behind it.
 *   onlyNamesEnding: the word only says the relationship ended,
 *     without turning that into a joke.
 *   captionCost: 0 = the joke arrives with the word itself;
 *     1 = needs half a beat for the metaphor to click;
 *     2 = needs a caption to land at all.
 *   verdict: reads as a judgment passed on the person, not a
 *     neutral description of them.
 *   recognition: 0-10, how widely the truth behind the word is
 *     felt by anyone who has had an ex.
 */
interface Candidate {
  id: string;
  text: string;
  domain:
    | "tech"
    | "publishing"
    | "screen"
    | "product"
    | "dating"
    | "general"
    | "plain";
  twist: boolean;
  shopworn: boolean;
  plainInsult: boolean;
  onlyNamesEnding: boolean;
  captionCost: 0 | 1 | 2;
  verdict: boolean;
  recognition: number;
}

const CANDIDATES: Candidate[] = [
  {
    // Unsubscribe: the ex treated like a mailing list. Everybody
    // has unsubscribed from something they no longer wanted in
    // their inbox, and everybody has wanted to do it to a person.
    id: "unsubscribe",
    text: "Unsubscribe",
    domain: "tech",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 0,
    verdict: true,
    recognition: 10,
  },
  {
    // Recalled: the ex as a defective product, pulled from the
    // shelves by the manufacturer. The "faulty goods" implication
    // is a half-beat further from romance than unsubscribing.
    id: "recalled",
    text: "Recalled",
    domain: "product",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 0,
    verdict: true,
    recognition: 8,
  },
  {
    // Footnote: the ex reduced to a footnote in the story of your
    // life — small print, skippable, not the chapter. Needs half
    // a beat for the publishing metaphor to click.
    id: "footnote",
    text: "Footnote",
    domain: "publishing",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 9,
  },
  {
    // Cliffhanger: the ex left you hanging at the end of the
    // episode, and the next one never came. Being left hanging
    // is a feeling every ex-haver knows.
    id: "cliffhanger",
    text: "Cliffhanger",
    domain: "screen",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 8,
  },
  {
    // Understudy: the ex was never the lead, only the stand-in
    // who rehearsed the part. Lands, but needs the theatre
    // metaphor, so it is less universal than the inbox words.
    id: "understudy",
    text: "Understudy",
    domain: "screen",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 7,
  },
  {
    // Prototype: the ex was the test version, built before the
    // real one shipped. The product metaphor is clear, but the
    // "test run" reading takes half a beat.
    id: "prototype",
    text: "Prototype",
    domain: "product",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 7,
  },
  {
    // Uninstalled: the ex removed like an app you no longer
    // want on your phone. Instantly clear, and removing an app
    // is something almost everyone has done.
    id: "uninstalled",
    text: "Uninstalled",
    domain: "tech",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 0,
    verdict: true,
    recognition: 9,
  },
  {
    // Typo: the ex was a mistake in the story — one wrong
    // keystroke that should have been caught in proofreading.
    // Needs half a beat: the "error in the text" reading.
    id: "typo",
    text: "Typo",
    domain: "publishing",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 8,
  },
  {
    // Rehearsal: the ex was the practice run before the real
    // performance. The practice-relationship feeling is widely
    // recognised, but the theatre frame costs half a beat.
    id: "rehearsal",
    text: "Rehearsal",
    domain: "screen",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 8,
  },
  {
    // Pilot: the ex was the pilot episode that never got picked
    // up for a series. Clever, but the television analogy is
    // the furthest of the screen words from instant clarity.
    id: "pilot",
    text: "Pilot",
    domain: "screen",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 7,
  },
  {
    // Placeholder: the ex was holding the place until the real
    // thing arrived. Placeholder relationships are a known
    // feeling, though the word itself is a little bloodless.
    id: "placeholder",
    text: "Placeholder",
    domain: "general",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 8,
  },
  {
    // Draft: the ex was a draft, never the final version. The
    // draft-versus-final contrast is widely understood, but it
    // still asks the reader to supply the publishing frame.
    id: "draft",
    text: "Draft",
    domain: "publishing",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 1,
    verdict: true,
    recognition: 8,
  },
  {
    // Expired: merely says the relationship is over, like milk
    // past its date. No twist, no angle, no absurdity — it only
    // names the ending, so its punch is capped.
    id: "expired",
    text: "Expired",
    domain: "product",
    twist: false,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: true,
    captionCost: 0,
    verdict: true,
    recognition: 7,
  },
  {
    // Unmatched: the dating-app verb turned into a verdict. It
    // is instantly clear to anyone who has swiped, but its home
    // domain is dating itself, so the surprise is smaller than
    // the words borrowed from further away.
    id: "unmatched",
    text: "Unmatched",
    domain: "dating",
    twist: true,
    shopworn: false,
    plainInsult: false,
    onlyNamesEnding: false,
    captionCost: 0,
    verdict: true,
    recognition: 8,
  },
  {
    // Blocked: the first word everyone reaches for, and it only
    // says the relationship ended. Shopworn, twistless, and
    // capped — the control case for what the brief punishes.
    id: "blocked",
    text: "Blocked",
    domain: "plain",
    twist: false,
    shopworn: true,
    plainInsult: false,
    onlyNamesEnding: true,
    captionCost: 0,
    verdict: true,
    recognition: 6,
  },
  {
    // Toxic: a plain insult with no joke mechanism behind it.
    // It describes an ex, and it is the obvious choice, which
    // is exactly why the brief's punch and surprise criteria
    // sink it. The control case for the plain-insult dock.
    id: "toxic",
    text: "Toxic",
    domain: "plain",
    twist: false,
    shopworn: true,
    plainInsult: true,
    onlyNamesEnding: false,
    captionCost: 0,
    verdict: true,
    recognition: 5,
  },
];

/* ------------------------------------------------------------------ */
/* Word features                                                       */
/* ------------------------------------------------------------------ */

/**
 * True when the text is exactly one word: no spaces, no tabs, no
 * newlines, nothing smuggled in after a punctuation mark. The
 * gate allows up to 111 characters, but the brief allows one
 * word, and a two-word entry is a failed entry however short it
 * is. This is the craft criterion's hard floor.
 */
function isSingleWord(text: string): boolean {
  return /^\S+$/.test(text);
}

/**
 * True when the word carries a punctuation trick: a hyphen joining
 * two words ("Ex-2.0"), a digit, an apostrophe doing the work of
 * a second word, camelCase mashing two words together, or any
 * character that is not a plain letter. The brief says "no
 * punctuation tricks", and a word that needs one to be funny
 * has already admitted its joke does not live in the word.
 */
function hasPunctuationTrick(text: string): boolean {
  if (!/^[A-Za-z]+$/.test(text)) return true;
  // CamelCase mashing two words together ("ExBoyfriend") is the
  // same trick without the hyphen: a capital letter mid-word.
  if (/[a-z][A-Z]/.test(text)) return true;
  return false;
}

/**
 * True when the word's twist comes from a foreign domain — tech,
 * publishing, screen, product, or general life — rather than
 * from romance's own vocabulary or the dating app's. A word
 * borrowed from far away startles more than one borrowed from
 * next door: "Unmatched" borrows from dating itself, so its
 * surprise is smaller than "Unsubscribe" borrowing from the
 * inbox. "Toxic" and "Blocked" borrow from nowhere at all.
 */
function hasCrossDomainTwist(c: Candidate): boolean {
  return (
    c.twist &&
    (c.domain === "tech" ||
      c.domain === "publishing" ||
      c.domain === "screen" ||
      c.domain === "product" ||
      c.domain === "general")
  );
}

/**
 * The twist must live inside the word itself. A real dictionary
 * word whose ordinary meaning, applied to a person, is the joke
 * passes: "Unsubscribe" is an ordinary verb, and the absurdity
 * is pointing it at a human being. A made-up compound, a
 * hyphenated pair, or a word that only works with a digit
 * attached fails — its joke is bolted on, not intrinsic. Every
 * candidate in this field is a single plain dictionary word, so
 * this is a guard rail rather than a live filter, but the scorer
 * enforces it the same way it enforces everything else.
 */
function twistLivesInWord(c: Candidate): boolean {
  return (
    c.twist && isSingleWord(c.text) && !hasPunctuationTrick(c.text)
  );
}

/* ------------------------------------------------------------------ */
/* Criterion scores (0-10 each, brief order)                           */
/* ------------------------------------------------------------------ */

interface Scores {
  /** C1: a one-word verdict on an ex, instantly readable. */
  onBrief: number;
  /** C2: comic punch — a joke at a glance, not a plain insult. */
  funniest: number;
  /** C3: surprise — not the obvious choice, startles, stays clear. */
  surprise: number;
  /** C4: craft — exactly one word, spelled right, no tricks. */
  craft: number;
  /** C5: recognition — any ex-haver feels the truth in it. */
  recognition: number;
}

/**
 * C1 — On brief. Every candidate in this field describes an ex,
 * so the base is 6. Two points for arriving instantly — the
 * meaning lands with the word itself, no half-beat for a
 * metaphor to click — and two for reading as a judgment passed
 * on the person rather than a neutral description of them. A
 * word that needs its frame supplied ("Footnote" needs the
 * story-of-your-life frame) still describes an ex, but it is
 * not instantly readable as the verdict, and the brief puts
 * that readability first.
 */
function scoreOnBrief(c: Candidate): number {
  let score = 6;
  if (c.captionCost === 0) score += 2;
  if (c.verdict) score += 2;
  return Math.min(10, score);
}

/**
 * C2 — Funniest. A real joke needs a twist the reader does not
 * see coming, and the twist has to live inside the word itself.
 * Full marks need a cross-domain twist plus instant arrival:
 * the absurdity (a person treated as a newsletter, a recalled
 * product, an uninstalled app) lands the moment the word is
 * read. A word whose twist needs half a beat still scores well,
 * but the beat costs it. A word that only names the ending is
 * capped at 4: it has a verdict, not a joke. A plain insult
 * loses 4 — the brief says "not a plain insult" outright — and
 * a shopworn gag loses 3 on top, because the obvious choice
 * cannot also be the funniest one.
 */
function scoreFunniest(c: Candidate): number {
  let score = 2; // every on-brief word gets a base for trying
  if (twistLivesInWord(c)) score += 4;
  if (hasCrossDomainTwist(c)) score += 2;
  if (c.captionCost === 0) score += 2;
  else if (c.captionCost === 1) score += 1;
  if (c.plainInsult) score -= 4;
  if (c.shopworn) score -= 3;
  if (c.onlyNamesEnding) score = Math.min(score, 4);
  return Math.max(0, Math.min(10, score));
}

/**
 * C3 — Surprise. Not the obvious choice, startling while staying
 * instantly clear. A cross-domain twist is worth the most: the
 * further the borrowed domain is from romance, the harder the
 * word startles. Instant clarity adds a point, because a
 * surprise that needs a caption is a riddle, not a startle.
 * Shopworn words lose 3 — they are, by definition, the choice
 * everyone saw coming — and a plain insult loses 2 more, since
 * "Toxic" surprises nobody who has ever heard an ex described.
 */
function scoreSurprise(c: Candidate): number {
  let score = 3;
  if (c.twist) score += 3;
  if (hasCrossDomainTwist(c)) score += 2;
  if (c.captionCost === 0) score += 1;
  if (c.shopworn) score -= 3;
  if (c.plainInsult) score -= 2;
  return Math.max(0, Math.min(10, score));
}

/**
 * C4 — Craft. Exactly one word, spelled correctly, no
 * punctuation tricks, and its meaning arrives without a
 * caption. Every candidate here is a single correctly spelled
 * dictionary word, so the differences are all in the caption
 * cost: a word whose meaning arrives with itself scores 10, one
 * that needs half a beat for its metaphor scores 8, one that
 * needs a caption scores 6. A word that fails the single-word
 * or no-tricks checks scores 0 — it is not a valid entry at
 * all, however funny it thinks it is.
 */
function scoreCraft(c: Candidate): number {
  if (!isSingleWord(c.text)) return 0;
  if (hasPunctuationTrick(c.text)) return 0;
  return 10 - c.captionCost * 2;
}

/**
 * C5 — Recognition. Anyone who has had an ex feels the truth
 * in it, so the laugh comes with a nod. This is the one score
 * set by hand per candidate, because it is a judgment about
 * how widely a feeling is shared, not something a lexicon can
 * count: unsubscribing from an unwanted inbox is near-universal
 * (10), being left hanging is widely felt (8), the theatre
 * words ask for a frame not everyone carries (7), and a plain
 * insult is recognised without being felt (5).
 */
function scoreRecognition(c: Candidate): number {
  return Math.max(0, Math.min(10, c.recognition));
}

/** Score a candidate on all five criteria, in the brief's order. */
function scoreCandidate(c: Candidate): Scores {
  return {
    onBrief: scoreOnBrief(c),
    funniest: scoreFunniest(c),
    surprise: scoreSurprise(c),
    craft: scoreCraft(c),
    recognition: scoreRecognition(c),
  };
}

/* ------------------------------------------------------------------ */
/* Winner selection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compare two scored candidates the way the judge compares two
 * words: criterion by criterion in the brief's order, first
 * difference decides. Only when all five criteria tie does the
 * shorter word win — it lands harder and reads cleaner as a
 * headline. A final id tiebreak keeps the order fully
 * deterministic.
 */
function compareScored(
  a: { candidate: Candidate; scores: Scores },
  b: { candidate: Candidate; scores: Scores },
): number {
  const order: (keyof Scores)[] = [
    "onBrief",
    "funniest",
    "surprise",
    "craft",
    "recognition",
  ];
  for (const key of order) {
    if (a.scores[key] !== b.scores[key]) return b.scores[key] - a.scores[key];
  }
  const lenA = [...a.candidate.text].length;
  const lenB = [...b.candidate.text].length;
  if (lenA !== lenB) return lenA - lenB;
  return a.candidate.id.localeCompare(b.candidate.id);
}

/** Score every candidate, sort best first, and return the ranking. */
function rankCandidates(): { candidate: Candidate; scores: Scores }[] {
  const scored = CANDIDATES.map((candidate) => ({
    candidate,
    scores: scoreCandidate(candidate),
  }));
  scored.sort(compareScored);
  return scored;
}

/* ------------------------------------------------------------------ */
/* Gate verification                                                   */
/* ------------------------------------------------------------------ */

interface GateResult {
  lengthChars: number;
  lengthBytes: number;
  singleLine: boolean;
  singleWord: boolean;
  validUtf8: boolean;
  notOnlyWhitespace: boolean;
  within111: boolean;
  passed: boolean;
}

/**
 * Verify the written file byte-for-byte against every gate the
 * sealed scorer applies: UTF-8 text of 1 to 111 characters, not
 * only whitespace. On top of the sealed gate this program also
 * checks the brief's own rules: a single line, and a single
 * word — no spaces, no punctuation tricks. A trailing newline
 * written by the file writer is stripped before the check, and
 * the stored entry itself holds no newline: the judge reads the
 * entry exactly as submitted, and a second line would be a
 * second word smuggled into a one-word field.
 */
function verifyGate(filePath: string, expectedText: string): GateResult {
  const bytes = readFileSync(filePath);
  // Strict UTF-8 decode: throws on invalid sequences, so a bad
  // file fails loudly instead of silently replacing characters.
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const text = decoded.replace(/\n$/, "");
  const lengthChars = [...text].length;
  const result: GateResult = {
    lengthChars,
    lengthBytes: bytes.length,
    singleLine: !text.includes("\n") && !text.includes("\r"),
    singleWord: isSingleWord(text) && !hasPunctuationTrick(text),
    validUtf8: true,
    notOnlyWhitespace: text.trim().length > 0,
    within111: lengthChars >= 1 && lengthChars <= 111,
    passed: false,
  };
  result.passed =
    result.singleLine &&
    result.singleWord &&
    result.validUtf8 &&
    result.notOnlyWhitespace &&
    result.within111 &&
    text === expectedText;
  return result;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main(): void {
  const ranked = rankCandidates();

  console.log("Candidate ranking (criteria in the judge's order):");
  console.log("id                 C1 C2 C3 C4 C5  chars  word");
  for (const { candidate, scores } of ranked) {
    const chars = [...candidate.text].length;
    console.log(
      `${candidate.id.padEnd(18)} ${scores.onBrief}  ${scores.funniest}  ` +
        `${scores.surprise}  ${scores.craft}  ${scores.recognition}  ` +
        `${String(chars).padStart(5)}  ${candidate.text}`,
    );
  }

  const winner = ranked[0];
  console.log("");
  console.log(`Winner: ${winner.candidate.id}`);
  console.log(`Word: ${winner.candidate.text}`);
  console.log(
    `Scores: onBrief=${winner.scores.onBrief} funniest=${winner.scores.funniest} ` +
      `surprise=${winner.scores.surprise} craft=${winner.scores.craft} ` +
      `recognition=${winner.scores.recognition}`,
  );

  // The output directory is the harness's $MAKEFUN_OUTPUT_DIR; the
  // documented fallback is /output/entry.txt.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.candidate.text + "\n", "utf8");
  console.log(`Wrote ${outPath}`);

  // Read it back and verify byte-for-byte against every gate.
  const gate = verifyGate(outPath, winner.candidate.text);
  console.log(
    `Gate: chars=${gate.lengthChars} bytes=${gate.lengthBytes} ` +
      `singleLine=${gate.singleLine} singleWord=${gate.singleWord} ` +
      `validUtf8=${gate.validUtf8} ` +
      `notOnlyWhitespace=${gate.notOnlyWhitespace} within111=${gate.within111} ` +
      `passed=${gate.passed}`,
  );
  if (!gate.passed) {
    console.error("GATE FAILED: entry.txt does not satisfy every gate.");
    process.exit(1);
  }
  console.log("Gate passed: entry is valid.");
}

main();

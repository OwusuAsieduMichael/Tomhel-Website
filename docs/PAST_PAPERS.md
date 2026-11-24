# Adding past papers to BECE Prep

Students only see a paper once its questions are in the question bank **and approved**. There are three ways in, from quickest to most manual. They all end in the same place: one JSON file per paper, checked by the same rules, imported as drafts.

> **Licensed content stays out of git.** PASCO books and WAEC papers are copyrighted, and this repository is public. Keep source PDFs and converted papers in `private/` (git-ignored), never in `public/`: anything in `public/` is downloadable from the live website. Make sure the school's licence covers putting the questions on the portal.

## 1. PASCO books: objective papers (automatic)

PASCO's *BECE Past Questions & Answers* books share one layout. The converter reads the PDF directly, including password-protected copies, and writes one draft per year:

```bash
npm run pasco:objectives -- private/pasco/<book>.pdf --subject SCI --password <pdf password>
# -> private/papers/SCI-2021-P1.json + SCI-2021-P1.review.txt, and the same for every year in the book
```

It finds each `"<year>: <SUBJECT> 1 / OBJECTIVE TEST"` section and its `ANSWERS` page, rebuilds the two-column pages in reading order, and keeps reaction arrows, subscripts and superscripts (2Na + Cl₂ → 2NaCl, m s⁻²). Questions that share a stem ("Use the information to answer questions 27 and 28") each get the stem.

**Then read the `.review.txt` file.** It lists everything a person should decide on. For the Science 2019–2021 book it flagged:

| Flag | What we did |
|---|---|
| 2021 Q23: key says ₁₇Cl, option reads ₁₇Ca | Printing error in the option. Corrected the option to ₁₇Cl. |
| 2021 Q24: key says C. Mars, "Note: the body at the centre is the sun" | Marked D. Sun as correct, and explained the slip in the question's explanation. |
| 2019 Q34: key gives two answers (C and D) | Left the question out: a multiple-choice question needs exactly one answer. |
| Mentions a diagram | Add an image link to the question, or leave it out. |

Fix these in the JSON file, or import first and fix them in the question editor (Admin → Questions → paper → Edit).

Codes follow `SUBJECT-YEAR-P1-<number>`, so re-converting a corrected book updates questions in place: unchanged ones keep their approval, and changed ones go back to draft.

If a new book doesn't convert cleanly, `--dump <page>` prints the text exactly as the converter sees it.

### Other layouts the converter handles

- **WordPub single-column books** (e.g. *Computing & ICT 2020–2025*): headings like "June 2025" then "COMPUTING 1". The column layout is detected per book; `--columns 1|2` forces it.
- **Word `.doc` books** (e.g. *Science 1990–2021*): open each password-protected book once in Word and **Save As → Web Page, Filtered (.htm)** into `private/pasco/html/`, then pass the `.htm` file instead of a PDF. HTML keeps what plain text loses: underlining, superscripts and subscripts, tab-separated tables, and pictures (as `[image: …]`).
- **Underlined words** ("the word underlined") become `<u>word</u>` in the question text, and the portal shows them underlined. In PDFs they are found from the thin lines drawn under the text.
- **Section instructions** ("SECTION B: choose the one nearest in meaning…") and cloze passages are copied onto every question they apply to, since students may open any question on its own.
- **Options A to E** (older papers), options in a table row ("31. seek ⇥ request ⇥ search ⇥ look"), and keys written "34. B – certified" or "36. E-mail address" (no letter).
- **Answer-key misprints**: when the key's letter and its text disagree and the text is exactly another option, the text wins and the review list says so (e.g. English 2024 Q24 "paid back in his own coins" → C. swindled).
- **Two sittings in one year** (Science 2015): the first sitting is kept; the portal holds one paper per year.

### Choosing what to import

`npx tsx scripts/pasco/select-papers.ts` collects the converted papers into `private/papers/ready/`. It prefers the newer edition where two books overlap, applies the hand-checked corrections listed in the script, leaves out questions without exactly one correct answer, holds back questions that need a picture, and validates every paper with the importer's rules. Then import `private/papers/ready/*.json`.

## 2. Theory papers (written by hand from the marking scheme)

Theory questions can't be converted automatically. They depend on diagrams, sub-parts and "[ANY TWO]" style schemes that need judgement. Write them as JSON using the same format. `private/papers/SCI-2021-P2.json` (Science 2021 Paper 2, Section B) is the worked example. Each sub-part such as 3(b)(ii) is its own question, with marking points taken from the scheme:

```json
{
  "code": "SCI-2021-P2-5c2",
  "numberLabel": "5(c)(ii)",
  "type": "theory",
  "text": "State two ways of preventing rusting.",
  "marks": 2,
  "markingPoints": [
    { "description": "One way of preventing rusting", "marks": 1, "strictness": "meaning",
      "acceptedAlternatives": ["oiling", "greasing", "painting", "galvanising", "alloying", "electroplating"] },
    { "description": "A second way of preventing rusting", "marks": 1, "strictness": "meaning",
      "acceptedAlternatives": ["oiling", "greasing", "painting", "galvanising", "alloying", "electroplating"] }
  ],
  "modelAnswer": "Any two of: oiling or greasing, painting, galvanising, alloying, electroplating."
}
```

How the automatic marker reads a marking point:

| Field | Use it for |
|---|---|
| `acceptedAlternatives` | Short answers that earn the point, in any wording or order. For "[ANY TWO]", give each point the same list; the same answer never earns two marks. |
| `keyTerms` | Words that must appear **spelt correctly** (e.g. `"ammonia"`). A near miss ("amonia") is shown as misspelt and earns no mark. |
| `strictness` | `meaning`: spelling of ordinary words doesn't matter. `key_term`: key terms must be spelt right. `exact`: every matched word must be spelt right (use for numbers and units). `rubric`: a teacher marks it. |

French and Twi theory answers always go to a teacher, whatever the marking points say.

What the marker can't do yet: catch wrong statements ("food is stored as protein"). That needs the AI marking phase. Until then, write accepted answers tightly, and keep long-explanation questions as `rubric`.

## 3. Importing

From a file, either way:

- **Admin → Questions → Import a paper**: upload the JSON. Nothing is saved if any question has a problem, and every problem is listed.
- **Command line:** `npm run prep:import -- private/papers/*.json`. Add `--approve` to approve every draft straight away (for demos; normally an admin reviews first).

Both go to the Google Sheet when `PREP_GAS_URL` is set, otherwise to the local demo file.

## The Science demo (2019–2021)

```bash
npm run pasco:objectives -- private/pasco/Science_2019_2021_BECE_QnA-*.pdf --subject SCI --password <password>
# apply the review fixes above, then:
npm run prep:import -- private/papers/SCI-2021-P1.json private/papers/SCI-2020-P1.json private/papers/SCI-2019-P1.json private/papers/SCI-2021-P2.json --approve
```

This gives 119 objective questions (2019, 2020, 2021) and 19 theory questions (2021 Paper 2, Section B).

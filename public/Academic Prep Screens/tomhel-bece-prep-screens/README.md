# Tomhel BECE Prep · UI screens

Static HTML mockups of the BECE practice platform, exported from the design canvas.

## Open
Open `index.html` in a browser, or in VS Code use the Live Server extension (right-click `index.html` > Open with Live Server). Screens link to each other where the flow continues (e.g. Start > Objectives > Results).

## Files
| File | Screen |
| --- | --- |
| `01-login.html` | Login |
| `02-academic-preparation.html` | Academic Preparation (BECE / Quiz / Exams) |
| `03-start-paper.html` | Start a paper and pick a timer |
| `04-objectives.html` | Objectives, timed |
| `05-theory.html` | Theory answer |
| `06-results.html` | Results with flagged words |
| `07-teacher-new-assignment.html` | Teacher: new assignment |
| `08-teacher-submission-tracker.html` | Teacher: submission tracker |
| `09-teacher-review-queue.html` | Teacher: French/Twi review queue |

## Design tokens used
| Token | Value |
| --- | --- |
| Font | Plus Jakarta Sans (Google Fonts), 400/500/600/700 |
| Ground | `#F6F5F1` |
| Surface | `#FFFFFF` |
| Text | `#17201B` |
| Muted text | `#56605A` |
| Border | `#E2E0D8` / input `#CFCCC2` |
| Primary (green) | `#17603F`, soft `#E3EFE8` |
| Awarded | `#157347` solid underline |
| Misspelt / incomplete | `#9A5B00` dotted underline, bg `#FBF1DE` |
| Incorrect | `#B42318` wavy underline, bg `#FCE8E6` |
| Radius | 12px controls, 16px cards |
| Touch targets | 44px minimum |

## Notes for development
- All styles are inline so each screen is self-contained; move them into components/CSS (e.g. Tailwind or CSS modules) when you build the real app.
- Names, scores, dates and the sample questions are placeholder content.
- Buttons are visual only; no JavaScript is wired up.

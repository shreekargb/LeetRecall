# Quiz draft recovery

Unfinished quizzes now save selected answers in browser local storage, separately for each signed-in account and review. Refreshing or reopening the same review in that browser restores valid selections. The question signature includes IDs, text and option ordering, so changed question sets cannot inherit incompatible answers.

The UI reads drafts after hydration through an external store. Writes happen on each selection. Invalid JSON, unknown question IDs and out-of-range options do not populate answers. If storage is blocked or full, choices stay in memory and the page warns the user to keep it open. A later successful write restores persistence. Cross-tab storage events refresh the draft in other open quiz tabs.

Submission failures leave drafts intact. A confirmed saved result takes precedence over drafts and clears that review's local entry. Reopening a saved result also attempts cleanup, including when a prior submission succeeded but its response was lost. If storage removal is blocked, the stale entry may remain on disk, but the saved result still wins. Nothing in local storage determines the score; existing authenticated database grading remains authoritative.

Drafts do not sync across devices. Browser storage is not encrypted by this feature and clearing browser data removes drafts. The UI separates accounts by key; this is not a privacy boundary against someone with access to that browser's developer tools.

## Test locally

No SQL migration or environment changes are required.

1. Open a due quiz, choose two answers and refresh. Confirm both choices return.
2. Navigate away and reopen it. Confirm the draft remains and unanswered questions stay empty.
3. Open another review or switch accounts. Confirm choices do not carry over.
4. Disconnect before submitting, then reconnect. Confirm selections survive and the existing safe retry works.
5. Submit successfully and refresh. Confirm the saved result appears, not an editable draft.
6. If practical, block site storage and try selecting answers. Confirm the warning appears and selections still work until navigation/refresh.

Automated tests: `npm run test:quiz-drafts`. They cover recovery, account/review separation, changed questions, malformed values, storage failures, cleanup and external updates. Browser checks remain pending. Production build remains unverified due to the earlier font-download restriction.

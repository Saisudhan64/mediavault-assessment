# Submission

Keep this tight. Bullet points are fine. We read this before we read your code,
and a clear account of your reasoning carries real weight — including where you
chose not to do something.

## Video walkthrough

Paste your Loom (or equivalent) link here. 5–10 minutes.

**Link:**

---

## How to run it

Anything we need to know beyond `npm install && npm run dev`.

## Time spent

Roughly, and how you split it.

---

## Baseline defects found

| # | Defect | Where | Fixed / left / out of scope |
| --- | --- | --- | --- |
| 1 | Bulk update sends >50 ids in one call | `App.tsx` | |
| 2 | .card div in the assetGrid is been given with overflow:hidden option which stops the previewing of the details in full view - Fixed
| 3 | usage of px in css files throught. should have considered the usage of rem so that all the sizing stays relevant to the root HTML node. - left 
| 4 | even if the asset does not have a thumbnail we are fetching the image so i have added made API call only when it has a thumbnail else it is not fetched and alt text not given (used hasThumbnail key) - fixed
| 5 | introduced css variables for different status and used the in the css file because status clor should be the same across entire app and preferably an app must use only css varables to maintain the theme of the app - FIXED
| 6 | The constant STATUSES can be defined inside the types.ts file and used in both app.tsx and assetDetails.tsx because it has to be the single source of truth in the entire app - fixed
| 7 | English Strings like Loading, Status and many other Strings are directly hardcoded in the HTML. this doesn't support other languages. instead if use use locale_en files for such cases and use a function to convert them then we can support many languages with only introducing files like locale_french or locale_german - left
| 8 | When asset Detail is been updated from the component it is not updated because the handler is left empty - fixed
| 9 | Search fields should inherently contain the concept of deboucing so that is wait fr a cerain ms and then executes the function so that it is not calling the API for every key press - fixed
| 10 | could have created classes like text-alig-center, flex--row, flex--row-acall,  flex--column so that we can just use them in the HTML and stop rewriting the css everytime. many such classes like z-indieces, flex--wrap can be introduced and used. can you tailwind.css in real time cases
| 11 | abort controlled API's, dedupping in fetching the results , race conditions, setting the rght response for the user query needs to be handled - fixed
| 12 | to improvee UX all the loading states could display a lottie like a spinner  so that user is made to  cleanly understand  that the content is loading. similarly stencils for the grid button hover handling and on click spinners on button lets the user now what is happening instead of making him cluelesslyclick the button again and again. - left

| 13 | both the error state and loading state handling should have been passsed down to assetGrid as it is the prominent screen that user will look into when something's up

| 14 | string literal for asset details popup image. fixed
---

## Key decisions

For each significant choice: what you did, what you rejected, and why. Three to
six of these is about right.

**Data fetching and caching**

**Stale response handling**

**Virtualization approach**

**Optimistic updates and rollback**

**Retry and backoff policy**

**State placement and URL sync**

---

## Performance

Fill in real measurements, not estimates. Say which machine and browser.

| Metric | Before | After | How measured |
| --- | --- | --- | --- |
| Rendered DOM nodes at 5,000 rows loaded | | | |
| Cards re-rendered when toggling one selection | | | |
| Longest task during sustained scroll | | | |
| Requests fired while typing a 6-character query | | | |
| Production bundle, gzipped | | | |

What was the actual bottleneck, and how did you find it?

---

## Accessibility

- Keyboard model you implemented, in one paragraph.
- How you tested it, including any screen reader.
- Known gaps.

---

## Interface decisions

Three or four sentences: what you were optimising for, and the decisions that
follow from it. Then briefly:

- **Visual system.** Your colour, spacing and type decisions, and where they live.
- **Status treatment.** How the four statuses read as a progression, and how they
  stay distinguishable without relying on colour.
- **States.** What you did with loading, empty, error, offline and partial
  failure.
- **Contrast.** What you checked against, and with what.
- **Copy.** Any user-facing message you rewrote and why.

Screenshots in the repo are welcome — link them here.

---

## Trade-offs and cuts

What you deliberately did not do, and what you would do with another day.

## Critique of the API

What you would change about the backend contract, and what it forced you to do in
the client that you would rather not have.

## Anything you would like us to look at

Code you are proud of, or a decision you are unsure about and want to discuss.

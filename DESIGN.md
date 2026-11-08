# DESIGN.md — Trắc nghiệm Đối ngoại

## Product direction

A host-led, projector-friendly multiple-select quiz about **Đường lối đối ngoại của Việt Nam thời kỳ đổi mới**. The game contains 10 questions in the exact order provided by `minigame_trac_nghiem_nang_cao_10_cau.md`.

Use the existing visual direction: dark navy stage, warm off-white typography, emerald feedback for correct choices, coral feedback for incorrect choices, and warm yellow for progress and host actions. Keep the question prominent, use spacious rounded cards, and make the layout responsive for desktop, tablet, and mobile.

## Runtime and structure

Use only HTML, CSS, and vanilla JavaScript. The website must run by opening `index.html` directly in a modern browser. No framework, bundler, backend, or API.

- `index.html`: semantic screen structure and host controls.
- `css/style.css`: theme, responsive layouts, feedback states, and reduced-motion support.
- `js/questions.js`: all 10 questions, options, correct option IDs, explanations, and illustration source links.
- `js/app.js`: session state, multiple selection, scoring, navigation, review, and keyboard controls.

## Game flow

### Start

Introduce the topic and tell groups to select all correct options. Show that the round contains 10 questions and start with **BẮT ĐẦU**.

### Question

Show one question and its four options A–D. The player may select one or more options, then explicitly choose **CHỐT ĐÁP ÁN**. Do not reveal the answer before submission. Display the supplied illustration caption as a link to its source article.

Question cards below the host controls allow jumping to any question. Preserve selections and submitted answers when navigating between cards.

### Reveal and results

After submission, lock the selected options, display whether the exact selected set matches the correct set, show the answer key and supplied explanation, and provide the next question action. Award one point per exactly correct question; maximum score is 10. At the end, provide replay and answer review.

Review mode shows all four choices, highlights the correct choices, and includes each supplied explanation and illustration source.

## Interaction and accessibility

- `1`–`4`: toggle options A–D for the current question.
- `Enter`: submit selected options; after reveal, advance.
- `ArrowRight` / `ArrowLeft`: move between questions.
- `R`: open restart confirmation.
- `Escape`: close the restart dialog.
- Ignore shortcuts in text-entry controls and allow native buttons to handle Enter/Space.
- Use semantic buttons, visible focus styles, text labels in addition to color, `aria-live` for reveal feedback, and touch targets suitable for mobile.
- Respect `prefers-reduced-motion`.

## Content rules

Keep question wording, all four choices, answer sets, explanations, illustration captions, and their source URLs aligned with `minigame_trac_nghiem_nang_cao_10_cau.md`. Do not add, remove, reorder, or rewrite quiz content without an updated source.

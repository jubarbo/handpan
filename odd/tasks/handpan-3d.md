# Handpan 3D

Objective: realistic, playable 3D handpan in the browser (Three.js + Web Audio synthesis), touch and mouse.
Branch: `feat/handpan-3d` · Delivery: ask-on-risk · Test runner: Vitest (`npm test`), visual checks via Playwright screenshots.

## Specs

- S1 — Stack: JavaScript, "vamos a trabajar con js". Vite + Three.js + Web Audio API, no UI framework.
- S2 — "El modelo debe ser realista y basado en la guía visual" / "debe ser sumamente realista". Reference: technical guide (Ø 56 cm, 24 cm height, two shells joined by a rim, central ding with concentric rings, tone fields with dimples, gu on the bottom, steel with bronze/gray/bluish/golden tones, slightly irregular hammered surface, natural wear) and the user's top-view photo.
- S3 — Layout from the photo: ding + outer ring of 10 large oval-dimple fields + inner ring of 7 small round-dimple fields (18 top notes). Bottom fields are visual only in v1 (assumption accepted by the user).
- S4 — Sound: synthesis ("respecto al sonido elejimos sintesis"). Scale D Kurd extended: ding D3; outer A3 Bb3 C4 D4 E4 F4 G4 A4 Bb4 C5; inner D5 E5 F5 G5 A5 Bb5 C6; zigzag assignment from the player side.
- S5 — "debe tener interacción sonora con touch en celular y mouse en desktop": Pointer Events, multitouch, raycast to the note, visual feedback, mobile audio unlock.
- S6 — Performance acceptable on mobile (adaptive quality).

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1 | inline | done | 62107b0 |
| T2 | S3, S4 | inline | done | 21c6326 · RED→GREEN scale/layout tests |
| T3 | S2, S3 | inline | done | 03284ac · heightField tests + screenshots |
| T4 | S2 | inline | done | e85ce35 · screenshots v1–v4 |
| T5 | S4 | inline | done | 946fbc4 · voice spec tests |
| T6 | S5 | inline | done | 65c403c · hit tests, e2e 18/18 mouse |
| T7 | S6 | inline | done | e2e 18/18 touch (iPhone 13 emulation), build ok |

Route evidence: no Writer trigger (units are sequential and share the layout module), so the parent works inline.

## Log

- L1 (2026-10-30, user): "Empecemos un proyecto de 0. Te adjunto una guía para generar un modelo 3D de un handpan, vamos a trabajar con js. El modelo debe ser realista y basado en la guía visual. Además debe tener interacción sonara con touch en celular y mouse en desktop. Necesito que generes un plan para realizarlo, pregunta lo que sea necesario."
- L2 (2026-10-30, user): "respecto a las observaciones sobre la guia adjunto otra foto con vista del handpan desde arriba para conciliar esto, debe ser sumamente realista, respecto al sonido elejimos sintesis"
- L3 (2026-10-30, user): "me parece correcto" (accepted D Kurd extended and the plan) → "si" (start implementation).
- L4 (2026-10-30): visual iterations v1→v4 against the photo: hammer marks toned down, roughness lowered for crisp reflections, softer field borders and dimple walls, rounded darker rim.
- L5 (2026-10-30, user): "puedes continuar?" → continued T6–T7. Pending: listening test on a real phone/desktop (synthesis not verifiable headless), RDD slice under budget.

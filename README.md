# 99Tech Code Challenge — Frontend

Solutions to the **Frontend** track: problems 1–3. Problems 4–6 belong to the Backend track and are not
attempted here (`src/problem4–6` are the untouched template folders).

| #   | Problem                                  | Stack                    | Highlights                                                                                                                                                                                |
| --- | ---------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [Three ways to sum to n](./src/problem1) | JavaScript (JSDoc-typed) | O(1) closed form, O(n) loop, **O(log n) recursive halving** instead of the stack-overflowing naive recursion; exact up to the largest valid `n`, checked against a BigInt oracle          |
| 2   | [Fancy Form](./src/problem2)             | **Vite** + React 19 + TS | Two-way quoting, keyboard-first token picker, rounding that never over-promises, a11y (combobox/listbox, live regions), light/dark, mocked backend with pending/success/failure, 84 tests |
| 3   | [Messy React](./src/problem3)            | React + TS               | 19 issues, 8 of them real bugs (it throws as soon as balances load), backed by `tsc --strict` output; refactor with the logic extracted into a 100%-covered pure module                   |

Each problem folder has its own README with the reasoning, assumptions and trade-offs.

## Run it

Requires Node ≥ 22.12 (see `.nvmrc`). The repo is an npm workspace, so one install covers everything.

```bash
npm install
npm run dev        # Problem 2 at http://localhost:5173
npm run check      # format → lint → typecheck → test (all problems) → build
```

Per problem:

```bash
npm test -w src/problem1      # node:test, no dependencies
npm test -w src/problem2      # Vitest + Testing Library
npm test -w src/problem3
```

## Repo conventions

- **Strict TypeScript everywhere**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
  Problem 1 stays plain JS as the task asks, but it is type-checked through JSDoc (`// @ts-check`).
- **One shared ESLint config**: `typescript-eslint` strict-type-checked plus the React Hooks rules.
  Prettier and `.editorconfig` handle formatting.
- **CI** ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs `npm run check` on every push
  and PR.

---

<sub>Built from the [99techteam/code-challenge](https://github.com/99techteam/code-challenge) template.</sub>

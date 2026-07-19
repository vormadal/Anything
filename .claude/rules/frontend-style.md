---
paths: 
    - "**/*.ts"
    - "**/*.tsx"
---
## Do USE
- Prefer `Number.IsNaN` over `isNaN`
- Prefer using an optional chain expression. e.g. `list?.length === 0` over `list && list.length === 0` as it is more concise and easier to read.
- Prefer structured error handling over `console.error` in production code.
- Use `err` (not `error`) in catch blocks when a component already has an `error` variable in scope.

## Do NOT
- cast to `any` (including casting API response types — use the generated model types from `@/lib/api-client/models/index`).
- leave unused variables or imports.
- shadow variables from an outer scope — use distinct names.
- duplicate string literals — extract repeated strings into constants.
- duplicate logic — extract shared code into helper functions.
- write high-cognitive-complexity functions — keep them focused.
- leave dead code or commented-out blocks.

_These are the SonarCloud (`vormadal_Anything-frontend`) rules; violations are flagged in static analysis._


---
paths: 
    - "**/*.cs"
---
## Do USE
- `private const` fields for repeated string literals in handler classes.
- `private static` helper methods for shared validation, rather than duplicating logic across handlers.
- `_` to discard an intentionally-unused return value (or remove the assignment entirely).

## Do NOT
- use `Async` postfix on method names.
- leave unused variables or imports.
- shadow variables from an outer scope — use distinct names (e.g. `err` in a catch block when `error` is already in scope).
- duplicate string literals — extract repeated strings into constants.
- duplicate logic — extract shared code into helper methods.
- write high-cognitive-complexity methods — keep functions focused.
- leave dead code or commented-out blocks.

_These are the SonarCloud (`vormadal_Anything`) rules; violations are flagged in static analysis._

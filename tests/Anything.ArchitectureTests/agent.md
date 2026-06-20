# Anything.ArchitectureTests

Automated enforcement of architectural rules using NetArchTest. Tests fail CI if the rules are broken.

## Structure

- `LayerDependencyTests.cs` — verifies layer dependency direction (Core ← Application ← API; Database not referenced from Application)
- `CqrsPatternTests.cs` — checks every `IRequestHandler` implementation lives under a `Commands/` or `Queries/` folder
- `NamingConventionTests.cs` — enforces file/class naming rules (e.g., handlers end in `Handler`, endpoints end in `Endpoints`)
- `PlacementTests.cs` — validates that entities are only in Core, DTOs only in Contracts, etc.
- `Assemblies.cs` — central place to resolve assembly references used across all test classes
- `TestResultExtensions.cs` — helper to produce readable assertion failure messages from NetArchTest results

## Key Patterns

- When adding a new feature, run these tests first — a failing arch test is a signal you've placed code in the wrong layer.
- `Assemblies.cs` must be updated if a new project is added to the solution.
- Tests use `NetArchTest.Rules`; failures list the violating types so fixing them is straightforward.

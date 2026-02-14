# Contributing to Anything

Thank you for your interest in contributing to Anything! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [CI/CD Pipeline](#cicd-pipeline)

## Code of Conduct

By participating in this project, you are expected to uphold our standards of respectful and professional conduct. Please be kind and courteous to other contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Anything.git
   cd Anything
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/vormadal/Anything.git
   ```
4. **Set up your development environment** (see [DEVELOPMENT.md](DEVELOPMENT.md))

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/vormadal/Anything/issues)
2. If not, create a new issue using the **Bug Report** template
3. Provide as much detail as possible:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details
   - Screenshots (if applicable)

### Suggesting Features

1. Check if the feature has already been requested in [Issues](https://github.com/vormadal/Anything/issues)
2. If not, create a new issue using the **Feature Request** template
3. Describe:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative approaches you've considered

### Submitting Code

1. **Create a new branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our [coding standards](#coding-standards)

3. **Write or update tests** for your changes

4. **Run tests locally** to ensure everything works:
   ```bash
   # Backend tests
   dotnet test
   
   # Frontend lint and build
   cd anything-frontend
   npm run lint
   npm run build
   ```

5. **Commit your changes** with clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add new feature X"
   # or
   git commit -m "fix: resolve issue with Y"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/modifications
- `chore/description` - Maintenance tasks

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples:**
```
feat(api): add endpoint for retrieving somethings by category
fix(frontend): resolve infinite loop in useEffect hook
docs(readme): update setup instructions for Windows
```

## Pull Request Process

1. **Ensure your PR**:
   - Has a clear, descriptive title
   - References any related issues (e.g., "Closes #123")
   - Includes a description of changes made
   - Updates documentation if needed
   - Adds/updates tests as appropriate

2. **PR Checklist**:
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings introduced
   - [ ] Tests added/updated
   - [ ] All tests pass locally
   - [ ] CI/CD checks pass

3. **Review Process**:
   - A maintainer will review your PR
   - Address any feedback or requested changes
   - Once approved, a maintainer will merge your PR

4. **After Merge**:
   - Delete your feature branch
   - Update your local repository:
     ```bash
     git checkout main
     git pull upstream main
     ```

## Coding Standards

### Backend (.NET)

- Follow [C# Coding Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- Use meaningful variable and method names
- Keep methods focused and single-purpose
- Add XML documentation comments for public APIs
- Handle exceptions appropriately
- Use async/await for I/O operations
- Follow SOLID principles

**Example:**
```csharp
/// <summary>
/// Retrieves a something by its unique identifier.
/// </summary>
/// <param name="id">The unique identifier of the something.</param>
/// <returns>The something if found, otherwise null.</returns>
public async Task<Something?> GetByIdAsync(Guid id)
{
    return await _context.Somethings
        .Where(s => s.DeletedOn == null)
        .FirstOrDefaultAsync(s => s.Id == id);
}
```

### Frontend (TypeScript/React)

- Follow [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- Use functional components with hooks
- Keep components small and focused
- Use TypeScript types (avoid `any`)
- Follow React best practices
- Use meaningful component and variable names
- Extract reusable logic into custom hooks

**Example:**
```typescript
interface SomethingListProps {
  filter?: string;
  onSelect?: (id: string) => void;
}

export function SomethingList({ filter, onSelect }: SomethingListProps) {
  const { data, isLoading, error } = useSomethings();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const filteredData = filter 
    ? data?.filter(item => item.name.includes(filter))
    : data;
    
  return (
    <ul>
      {filteredData?.map(item => (
        <li key={item.id} onClick={() => onSelect?.(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

## Testing Guidelines

### Backend Tests

- Write integration tests for API endpoints
- Use meaningful test names that describe the scenario
- Follow the Arrange-Act-Assert pattern
- Test both success and failure cases
- Use Testcontainers for database tests

**Example:**
```csharp
[Fact]
public async Task GetSomethingById_ReturnsOk_WhenSomethingExists()
{
    // Arrange
    var something = new Something { Name = "Test Item" };
    await _context.Somethings.AddAsync(something);
    await _context.SaveChangesAsync();

    // Act
    var response = await _client.GetAsync($"/api/somethings/{something.Id}");

    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<Something>();
    result.Should().NotBeNull();
    result!.Name.Should().Be("Test Item");
}
```

### Frontend Tests

- Write tests for components, hooks, and utilities
- Test user interactions and edge cases
- Mock external dependencies
- Use React Testing Library best practices

(Note: Add when frontend tests are implemented)

## CI/CD Pipeline

All pull requests must pass the CI/CD pipeline before merging:

1. **Backend CI**:
   - Builds the .NET solution
   - Runs all tests
   - Generates code coverage
   - Performs SonarCloud analysis

2. **Frontend CI**:
   - Runs ESLint
   - Builds the Next.js application
   - Performs SonarCloud analysis

3. **Quality Gates**:
   - All tests must pass
   - Code coverage must meet thresholds
   - No new critical issues in SonarCloud

For more details, see [CI-CD.md](CI-CD.md).

## Project Structure

```
Anything/
├── src/                              # Backend (.NET)
│   ├── Anything.API/                 # Main API project
│   ├── Anything.AppHost/            # Aspire orchestrator
│   └── Anything.ServiceDefaults/    # Shared configurations
├── tests/                            # Backend tests
│   └── Anything.API.IntegrationTests/
├── anything-frontend/               # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                     # Next.js pages
│   │   ├── components/              # React components
│   │   ├── hooks/                   # Custom hooks
│   │   └── lib/                     # Utilities
│   └── public/                      # Static assets
├── .github/                         # GitHub configuration
│   ├── workflows/                   # CI/CD workflows
│   └── ISSUE_TEMPLATE/             # Issue templates
└── docs/                            # Documentation
```

## Getting Help

- **Questions?** Open a [Discussion](https://github.com/vormadal/Anything/discussions)
- **Bugs?** Open an [Issue](https://github.com/vormadal/Anything/issues)
- **Want to contribute but don't know where to start?** Look for issues labeled `good first issue` or `help wanted`

## License

By contributing to Anything, you agree that your contributions will be licensed under the project's MIT License.

## Recognition

Contributors will be recognized in our [Contributors](https://github.com/vormadal/Anything/graphs/contributors) page.

---

Thank you for contributing to Anything! 🎉

# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the Anything project.

## Overview

The project uses **GitHub Actions** for CI/CD with the following workflows:

1. **Backend CI** (`backend-ci.yml`) - Builds, tests, and scans the .NET backend
2. **Frontend CI** (`frontend-ci.yml`) - Lints, builds, and scans the Next.js frontend

## Workflows

### Backend CI Workflow

**Trigger:** Pushes and pull requests to `main` or `develop` branches that affect backend code

**Jobs:**

1. **Build and Test**
   - Sets up .NET 10 SDK
   - Caches NuGet packages for faster builds
   - Restores dependencies
   - Builds the solution in Release configuration
   - Runs all tests with code coverage collection
   - Uploads test results and coverage reports as artifacts

2. **SonarCloud Analysis**
   - Performs static code analysis
   - Checks code quality and security vulnerabilities
   - Uploads results to SonarCloud
   - Requires `SONAR_TOKEN` secret to be configured

**Key Features:**
- ✅ Dependency caching for faster builds
- ✅ Code coverage collection using XPlat Code Coverage
- ✅ Test result reports in TRX format
- ✅ SonarCloud integration for quality gates
- ✅ Artifact uploads for test results and coverage

### Frontend CI Workflow

**Trigger:** Pushes and pull requests to `main` or `develop` branches that affect frontend code

**Jobs:**

1. **Lint and Build**
   - Sets up Node.js 20
   - Caches npm dependencies
   - Installs dependencies using `npm ci`
   - Runs ESLint for code quality
   - Builds the Next.js application
   - Uploads build artifacts

2. **SonarCloud Analysis**
   - Performs static code analysis on TypeScript/JavaScript code
   - Checks code quality and best practices
   - Requires `SONAR_TOKEN` secret to be configured

**Key Features:**
- ✅ npm dependency caching
- ✅ ESLint integration
- ✅ Production build validation
- ✅ SonarCloud integration

## SonarCloud Setup

### Prerequisites

1. **Create SonarCloud Account**
   - Go to [SonarCloud](https://sonarcloud.io)
   - Sign in with your GitHub account
   - Create an organization (e.g., `vormadal`)

2. **Create Projects**
   - Create a project for the backend: `vormadal_Anything`
   - Create a project for the frontend: `vormadal_Anything-frontend`

3. **Generate Token**
   - Go to Account > Security
   - Generate a new token
   - Add it as a GitHub secret: `SONAR_TOKEN`

### Configuration Files

- **Backend:** Configuration is in `.github/workflows/backend-ci.yml` (SonarScanner for .NET uses command-line parameters, not properties files)
- **Frontend:** `anything-frontend/sonar-project.properties`

These configurations define:
- Project keys and organization
- Source and test directories
- Exclusions (migrations, generated code, etc.)
- Coverage report paths

## GitHub Secrets

Add the following secrets in your GitHub repository settings:

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `SONAR_TOKEN` | SonarCloud authentication token | Both workflows |

**How to add secrets:**
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add the secret name and value

## Code Coverage

### Backend
- Uses **coverlet.collector** for .NET code coverage
- Generates OpenCover XML format for SonarCloud
- Generates Cobertura XML for other tools
- Creates HTML reports using ReportGenerator

### Frontend
- Ready for Jest/Vitest integration
- Configured to use LCOV format for SonarCloud
- Coverage configuration in `anything-frontend/sonar-project.properties`

**Backend Configuration Note:** The backend uses SonarScanner for .NET, which does not support `sonar-project.properties` files. All configuration is done via command-line parameters in the `.github/workflows/backend-ci.yml` workflow file.

## Best Practices and Considerations

### 1. Branch Protection Rules

Consider enabling the following branch protection rules for `main`:

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
  - Backend CI (build-and-test)
  - Frontend CI (lint-and-build)
- ✅ Require branches to be up to date before merging
- ✅ Include administrators in restrictions

### 2. Performance Optimizations

**Caching Strategy:**
- NuGet packages are cached using a hash of `packages.lock.json`
- npm packages are cached using `package-lock.json`

**Parallelization:**
- Backend and frontend workflows run independently
- Build and SonarCloud jobs run sequentially (SonarCloud needs build results)

### 3. Security Considerations

**Secrets Management:**
- Never commit secrets to the repository
- Use GitHub Secrets for sensitive data
- Rotate tokens periodically

**Dependency Security:**
- Consider adding Dependabot for automated dependency updates
- Enable GitHub security scanning
- Review SonarCloud security hotspots regularly

### 4. Cost Optimization

**Runner Minutes:**
- Workflows only run when relevant files change (path filters)
- Caching reduces build times significantly
- SonarCloud analysis runs only after successful builds

**Artifact Retention:**
- GitHub default: 90 days
- Consider reducing for test results if needed

### 5. Quality Gates

Configure quality gates in SonarCloud:
- Minimum code coverage threshold (e.g., 80%)
- No new bugs or vulnerabilities
- Code maintainability rating (A or B)
- Security rating (A)

### 6. Additional Workflow Enhancements

Consider adding these workflows in the future:

**Deployment Workflows:**
```yaml
- Deploy to staging on merge to develop
- Deploy to production on merge to main
- Blue-green deployments for zero downtime
```

**Additional Quality Checks:**
```yaml
- Dependency vulnerability scanning (Snyk, OWASP)
- Docker image scanning
- Performance testing
- E2E testing with Playwright
```

**Release Management:**
```yaml
- Automated semantic versioning
- Changelog generation
- GitHub Releases creation
- Container image publishing
```

### 7. Monitoring and Notifications

**Workflow Status:**
- Add status badges to README.md
- Configure Slack/Discord notifications for failures

**SonarCloud Integration:**
- Enable PR decorations in SonarCloud
- Get inline comments on code quality issues

### 8. Database Migrations in CI

The integration tests use Testcontainers to spin up PostgreSQL automatically. For production deployments, consider:

- Automated migration scripts
- Rollback strategies
- Migration testing in CI
- Schema validation

### 9. Environment-Specific Configurations

**Development:**
- Run all tests
- Generate detailed coverage reports
- Enable debug symbols

**Staging/Production:**
- Run smoke tests
- Generate optimized builds
- Enable application insights

## Viewing Results

### Test Results
- Test results are uploaded as artifacts in each workflow run
- Download from the Actions tab → Workflow run → Artifacts

### Code Coverage
- Coverage reports are uploaded as HTML artifacts
- View detailed coverage in SonarCloud dashboard

### Build Artifacts
- Next.js build output is available as an artifact
- Can be used for deployment workflows

## Troubleshooting

### Common Issues

**Build Failures:**
1. Check .NET SDK version compatibility
2. Ensure all dependencies are restored
3. Review build logs for specific errors

**Test Failures:**
4. Verify PostgreSQL container starts correctly
5. Check for environment-specific issues
6. Review test logs in artifacts

**SonarCloud Issues:**
7. Verify `SONAR_TOKEN` is set correctly
8. Ensure project keys match SonarCloud configuration
9. Check coverage report paths are correct

### Getting Help

- GitHub Actions logs: Check the Actions tab
- SonarCloud issues: Check the SonarCloud dashboard
- Project issues: Open a GitHub issue

## Local Testing

### Test Backend Build
```bash
dotnet restore
dotnet build --configuration Release
dotnet test --configuration Release --collect:"XPlat Code Coverage"
```

### Test Frontend Build
```bash
cd anything-frontend
npm ci
npm run lint
npm run build
```

### Run SonarCloud Locally (Optional)
```bash
# Backend
dotnet sonarscanner begin /k:"vormadal_Anything" /o:"vormadal" /d:sonar.token="YOUR_TOKEN"
dotnet build
dotnet sonarscanner end /d:sonar.token="YOUR_TOKEN"

# Frontend
cd anything-frontend
sonar-scanner
```

## Maintenance

### Regular Tasks

- Review and update GitHub Actions versions quarterly
- Update .NET SDK version when new releases are available
- Review and optimize caching strategies
- Monitor SonarCloud quality gate trends
- Review and update exclusion patterns

### Dependency Updates

**Backend:**
```bash
dotnet list package --outdated
dotnet add package [PackageName] --version [Version]
```

**Frontend:**
```bash
npm outdated
npm update
```

Consider enabling Dependabot for automated updates.

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [.NET Testing Best Practices](https://docs.microsoft.com/en-us/dotnet/core/testing/)
- [Next.js CI/CD](https://nextjs.org/docs/deployment)

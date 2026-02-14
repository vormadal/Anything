# GitHub Actions & SonarCloud Setup Guide

This guide walks you through setting up the CI/CD pipeline for the Anything project.

## Step 1: SonarCloud Setup

### 1.1 Create SonarCloud Account

1. Go to [SonarCloud.io](https://sonarcloud.io)
2. Click **"Log in"** and authenticate with your GitHub account
3. Authorize SonarCloud to access your GitHub repositories

### 1.2 Create an Organization

1. Click on **"+"** in the top menu → **"Analyze new project"**
2. If you don't have an organization yet, create one:
   - Click **"Create an organization manually"**
   - Choose a key (e.g., `vormadal`)
   - Choose a plan (Free for open source)

### 1.3 Import the Repository

1. In SonarCloud, click **"+"** → **"Analyze new project"**
2. Select your GitHub organization
3. Choose the **"vormadal/Anything"** repository
4. Click **"Set Up"**

### 1.4 Create Backend Project

1. Choose **"With GitHub Actions"** as the analysis method
2. Project key: `vormadal_Anything` (should be auto-generated)
3. Click **"Continue"**
4. SonarCloud will show you a token - **copy this token**

### 1.5 Create Frontend Project

1. Click **"+"** → **"Analyze new project"** again
2. Since SonarCloud doesn't allow multiple projects per repo easily, you can either:
   - **Option A**: Create a separate organization/project for the frontend
   - **Option B**: Use the same project with different analysis parameters
   - **Recommended**: Keep them in the same project with different paths configured

For this setup, we've configured separate project keys in the workflow files:
- Backend: `vormadal_Anything`
- Frontend: `vormadal_Anything-frontend`

If you want separate projects, repeat the import process but configure it differently.

## Step 2: Configure GitHub Secrets

### 2.1 Add SonarCloud Token

1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add the following secret:
   - **Name**: `SONAR_TOKEN`
   - **Value**: [Paste the token from SonarCloud]
4. Click **"Add secret"**

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions, no need to add it manually.

## Step 3: Configure SonarCloud Projects

### 3.1 Backend Project Configuration

1. In SonarCloud, go to your backend project
2. Go to **Administration** → **General Settings**
3. Verify the project key is: `vormadal_Anything`
4. Organization should be: `vormadal` (or your org name)

### 3.2 Frontend Project Configuration (if separate)

1. Create a new project in SonarCloud
2. Set project key to: `vormadal_Anything-frontend`
3. Configure organization

### 3.3 Quality Gate

1. In SonarCloud, go to **Quality Gates**
2. You can use the default "Sonar way" quality gate or create a custom one
3. Recommended settings:
   - Coverage on new code: > 80%
   - Duplicated lines on new code: < 3%
   - Maintainability rating on new code: A
   - Reliability rating on new code: A
   - Security rating on new code: A

## Step 4: Configure GitHub Branch Protection

### 4.1 Protect Main Branch

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Click **"Add rule"**
3. Branch name pattern: `main`
4. Enable the following:
   - ☑️ Require a pull request before merging
   - ☑️ Require approvals: 1
   - ☑️ Require status checks to pass before merging
   - ☑️ Require branches to be up to date before merging
   - Search and add status checks:
     - `Build and Test (.NET)`
     - `Lint and Build (Next.js)`
     - `SonarCloud Analysis` (if you want to enforce it)
   - ☑️ Do not allow bypassing the above settings
5. Click **"Create"**

### 4.2 Protect Develop Branch (Optional)

Repeat the same process for the `develop` branch if you use a develop → main branching strategy.

## Step 5: Verify Workflows

### 5.1 Trigger First Build

1. Make a small change to trigger the workflow:
   ```bash
   git checkout -b test-ci-setup
   echo "# CI Test" >> README.md
   git add README.md
   git commit -m "Test CI pipeline"
   git push origin test-ci-setup
   ```

2. Create a pull request on GitHub

3. Watch the Actions tab to see workflows running

### 5.2 Check Workflow Status

1. Go to **Actions** tab in your GitHub repository
2. You should see both workflows running:
   - Backend CI
   - Frontend CI
3. Click on each to see detailed logs

### 5.3 Verify SonarCloud

1. After workflows complete, go to SonarCloud
2. Check that analysis results appear
3. Verify code coverage and quality metrics

## Step 6: Optional Enhancements

### 6.1 Enable Dependabot

1. Go to **Settings** → **Security** → **Code security and analysis**
2. Enable **Dependabot alerts**
3. Enable **Dependabot security updates**
4. Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # .NET dependencies
  - package-ecosystem: "nuget"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
  
  # Frontend dependencies
  - package-ecosystem: "npm"
    directory: "/anything-frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
  
  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 6.2 Enable GitHub Advanced Security (if available)

1. **Settings** → **Security** → **Code security and analysis**
2. Enable:
   - Code scanning (CodeQL)
   - Secret scanning
   - Dependency review

### 6.3 Add Slack/Discord Notifications

Add this to your workflow file (after the job):

```yaml
- name: Notify Slack
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Step 7: Update SonarCloud Project Settings

### 7.1 Configure Pull Request Decoration

1. In SonarCloud project → **Administration** → **General Settings** → **Pull Requests**
2. Ensure it's enabled for GitHub
3. Verify that PR comments will appear automatically

### 7.2 Set New Code Period

1. Go to **Administration** → **New Code**
2. Set to "Previous version" or "Number of days" (e.g., 30 days)
3. This determines what SonarCloud considers "new code"

### 7.3 Configure Exclusions (if needed)

For the **frontend**, exclusions are configured in `anything-frontend/sonar-project.properties`.

For the **backend**, exclusions are configured directly in `.github/workflows/backend-ci.yml` via command-line parameters. The backend uses SonarScanner for .NET which does not support `sonar-project.properties` files.

You can also set exclusions in the SonarCloud UI:

1. **Administration** → **Analysis Scope** → **Files**
2. Add any additional exclusions

## Troubleshooting

### Workflow Failures

**Issue**: Workflow fails with "Resource not accessible by integration"
- **Solution**: Check that GitHub Actions have permission to create status checks
- Go to **Settings** → **Actions** → **General** → **Workflow permissions**
- Select "Read and write permissions"

**Issue**: SonarCloud analysis fails with authentication error
- **Solution**: Verify `SONAR_TOKEN` is set correctly in GitHub secrets
- Regenerate token in SonarCloud if needed

**Issue**: Tests fail in CI but pass locally
- **Solution**: Check for environment-specific issues
- Verify PostgreSQL container starts correctly
- Review test logs in the Actions tab

### SonarCloud Issues

**Issue**: Coverage not showing up
- **Solution**: 
  - For backend: Verify coverage report paths in `.github/workflows/backend-ci.yml`
  - For frontend: Verify coverage report paths in `anything-frontend/sonar-project.properties`
  - Ensure `coverlet.collector` is installed in test projects
  - Check that tests actually run before SonarCloud analysis

**Issue**: Quality gate fails
- **Solution**: 
  - Review the quality gate settings
  - Check specific metrics that are failing
  - Fix code issues or adjust quality gate thresholds

## Maintenance Checklist

Regular maintenance tasks:

- [ ] Review Dependabot PRs weekly
- [ ] Update GitHub Actions versions quarterly
- [ ] Review SonarCloud quality gate trends monthly
- [ ] Update .NET SDK version when new releases available
- [ ] Review and optimize caching strategies quarterly
- [ ] Rotate SonarCloud token annually

## Next Steps

After setup is complete:

1. ✅ All workflows are passing
2. ✅ SonarCloud is reporting metrics
3. ✅ Branch protection is enabled
4. ✅ Badges are showing in README

Consider adding:
- Deployment workflows (staging, production)
- Performance testing
- E2E testing with Playwright
- Container image building and scanning
- Automated release management

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review workflow logs in the Actions tab
3. Check SonarCloud project settings
4. Open an issue on GitHub with:
   - Error message
   - Workflow run link
   - Steps to reproduce

# Assigning US 2.x Issues to Iteration 2

This guide explains how to assign all User Story 2.x issues (#11, #12, #13, #15, #17, #20) to Iteration 2 in GitHub Projects.

## Issues to be Assigned

The following issues will be assigned to Iteration 2:
- #11 - [US 2.1] Select a Start and Destination
- #12 - [US 2.2] Use Current Building Location as Start
- #13 - [US 2.3] Show Directions on Map Using Google API
- #15 - [US 2.4] Support Directions Between Campuses
- #17 - [US 2.5] Transportation Modes
- #20 - [US 2.6] Concordia Shuttle Service

## Method 1: Using GitHub Actions (Easiest)

1. Go to the **Actions** tab in the GitHub repository
2. Select **"Assign US 2.x Issues to Iteration 2"** workflow
3. Click **"Run workflow"** button
4. Select the branch (usually `main` or `copilot/move-issues-to-iteration-2`)
5. Click **"Run workflow"** to execute

The workflow will automatically:
- Install required dependencies
- Run the Python script
- Assign all US 2.x issues to Iteration 2

## Method 2: Using Python Script (Recommended for local execution)

### Prerequisites
- Python 3.6 or higher
- GitHub CLI (`gh`) installed
- GitHub authentication configured

### Steps

1. Install GitHub CLI if not already installed:
   ```bash
   # macOS
   brew install gh
   
   # Ubuntu/Debian
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
   sudo apt update
   sudo apt install gh
   
   # Windows
   winget install --id GitHub.cli
   ```

2. Authenticate with GitHub:
   ```bash
   gh auth login
   ```

3. Set the GitHub token (if not already authenticated):
   ```bash
   export GH_TOKEN="your_github_personal_access_token"
   ```

4. Run the Python script:
   ```bash
   cd /path/to/soen390-only-raw-data
   python3 scripts/assign-to-iteration.py
   ```

## Method 3: Using Bash Script

### Prerequisites
- Bash shell
- GitHub CLI (`gh`) installed
- `jq` (JSON processor) installed
- GitHub authentication configured

### Steps

1. Install prerequisites:
   ```bash
   # Install jq
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   ```

2. Authenticate with GitHub (same as Method 2)

3. Run the bash script:
   ```bash
   cd /path/to/soen390-only-raw-data
   ./scripts/assign-to-iteration.sh
   ```

## Troubleshooting

### "No GitHub Project found"
- Ensure a GitHub Project (Projects V2) exists for this repository or organization
- Check that your token has access to read/write projects

### "Iteration 2 not found"
- Verify that an iteration named "Iteration 2", "Sprint 2", or containing "2" exists in the project
- Check the project board settings to see available iterations

### "Permission denied"
- Ensure your GitHub token has the following scopes:
  - `repo` (for repository access)
  - `project` (for GitHub Projects access)
  - `write:org` (if using organization-level projects)

### "gh: command not found"
- Install GitHub CLI following the instructions in Method 2

## What the Scripts Do

1. **Find the GitHub Project**: Locates the project board associated with the repository
2. **Identify Iteration Field**: Finds the "Iteration" or "Sprint" field in the project
3. **Find Iteration 2**: Searches for an iteration with "2" in the title
4. **Add Issues to Project**: Ensures all 6 issues are in the project
5. **Update Iteration**: Sets the iteration field to Iteration 2 for each issue

## Manual Alternative

If automated scripts don't work, you can manually assign issues:

1. Go to the GitHub Projects board
2. For each issue (#11, #12, #13, #15, #17, #20):
   - Add the issue to the project (if not already added)
   - Click on the issue card
   - Find the "Iteration" or "Sprint" field
   - Select "Iteration 2"

## Getting Help

If you encounter issues:
1. Check the GitHub Actions logs for detailed error messages
2. Verify that GitHub Projects V2 is set up correctly
3. Ensure all prerequisites are installed
4. Contact the repository maintainers for assistance

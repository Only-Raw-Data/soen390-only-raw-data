# Scripts

## assign-to-iteration Scripts

These scripts assign all issues starting with "US 2" (issues #11, #12, #13, #15, #17, #20) to Iteration 2 in GitHub Projects.

Two versions are provided:
- **assign-to-iteration.sh** - Bash script
- **assign-to-iteration.py** - Python script (recommended for better error handling)

### Prerequisites

- GitHub CLI (`gh`) installed
- For bash script: `jq` installed for JSON parsing
- For python script: Python 3.6+
- GitHub Personal Access Token with appropriate permissions

### Usage

#### Option 1: Python Script (Recommended)

1. Set the `GH_TOKEN` environment variable:
   ```bash
   export GH_TOKEN="your_github_token"
   ```

2. Run the script:
   ```bash
   python3 scripts/assign-to-iteration.py
   ```

#### Option 2: Bash Script

1. Set the `GH_TOKEN` environment variable:
   ```bash
   export GH_TOKEN="your_github_token"
   ```

2. Run the script:
   ```bash
   ./scripts/assign-to-iteration.sh
   ```

### What it does

1. Finds the GitHub Project associated with the repository
2. Identifies the Iteration/Sprint field in the project
3. Finds Iteration 2 in the available iterations
4. Adds each US 2.x issue to the project (if not already added)
5. Updates the iteration field to Iteration 2 for all these issues

### Issues Assigned

The following issues are assigned to Iteration 2:
- #11 - [US 2.1] Select a Start and Destination
- #12 - [US 2.2] Use Current Building Location as Start
- #13 - [US 2.3] Show Directions on Map Using Google API
- #15 - [US 2.4] Support Directions Between Campuses
- #17 - [US 2.5] Transportation Modes
- #20 - [US 2.6] Concordia Shuttle Service

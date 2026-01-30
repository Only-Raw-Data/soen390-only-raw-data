# Quick Start: Assigning US 2.x Issues to Iteration 2

## Easiest Method: Use GitHub Actions

1. Navigate to: https://github.com/Only-Raw-Data/soen390-only-raw-data/actions
2. Click on **"Assign US 2.x Issues to Iteration 2"** in the workflows list
3. Click the **"Run workflow"** dropdown button
4. Click the green **"Run workflow"** button to confirm

Done! The workflow will automatically assign issues #11, #12, #13, #15, #17, and #20 to Iteration 2.

---

## Alternative: Run Locally

If the GitHub Actions method doesn't work or you prefer to run locally:

### Quick Commands (if you have gh CLI installed)

```bash
cd soen390-only-raw-data
gh auth login  # Follow prompts to authenticate
python3 scripts/assign-to-iteration.py
```

### If GitHub CLI is not installed:

**On macOS:**
```bash
brew install gh
```

**On Ubuntu/Debian:**
```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install gh
```

**On Windows:**
```powershell
winget install --id GitHub.cli
```

---

## What Gets Assigned

These 6 issues will be moved to Iteration 2:
- #11: [US 2.1] Select a Start and Destination
- #12: [US 2.2] Use Current Building Location as Start
- #13: [US 2.3] Show Directions on Map Using Google API
- #15: [US 2.4] Support Directions Between Campuses
- #17: [US 2.5] Transportation Modes
- #20: [US 2.6] Concordia Shuttle Service

---

For more detailed information, see [USAGE.md](USAGE.md)

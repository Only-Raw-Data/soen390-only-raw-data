#!/usr/bin/env python3
"""
Script to assign US 2.x issues to Iteration 2 in GitHub Projects.
This script requires a GitHub Personal Access Token with appropriate permissions.
"""

import os
import sys
import json
import subprocess

OWNER = "Only-Raw-Data"
REPO = "soen390-only-raw-data"
ISSUES = [11, 12, 13, 15, 17, 20]  # US 2.1 through US 2.6

def run_gh_query(query, variables=None):
    """Run a GraphQL query using GitHub CLI."""
    cmd = ["gh", "api", "graphql", "-f", f"query={query}"]
    
    if variables:
        for key, value in variables.items():
            if isinstance(value, int):
                cmd.extend(["-F", f"{key}={value}"])
            else:
                cmd.extend(["-f", f"{key}={value}"])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error running query: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    
    return json.loads(result.stdout)

def get_project_id():
    """Get the project ID for the repository."""
    query = """
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        projectsV2(first: 20) {
          nodes {
            id
            title
            number
          }
        }
      }
    }
    """
    
    result = run_gh_query(query, {"owner": OWNER, "repo": REPO})
    projects = result.get("data", {}).get("repository", {}).get("projectsV2", {}).get("nodes", [])
    
    if not projects:
        print("No GitHub Project found for this repository.")
        print("Checking for organization-level projects...")
        
        # Try organization level
        query = """
        query($owner: String!) {
          organization(login: $owner) {
            projectsV2(first: 20) {
              nodes {
                id
                title
                number
              }
            }
          }
        }
        """
        result = run_gh_query(query, {"owner": OWNER})
        projects = result.get("data", {}).get("organization", {}).get("projectsV2", {}).get("nodes", [])
        
        if not projects:
            print("No GitHub Project found at organization level either.")
            sys.exit(1)
    
    print(f"Found project: {projects[0]['title']}")
    return projects[0]["id"]

def get_iteration_info(project_id):
    """Get the iteration field ID and iteration 2 ID."""
    query = """
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations {
                    id
                    title
                    startDate
                  }
                }
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
    """
    
    result = run_gh_query(query, {"projectId": project_id})
    fields = result.get("data", {}).get("node", {}).get("fields", {}).get("nodes", [])
    
    iteration_field = None
    iteration_2_id = None
    
    for field in fields:
        if field.get("name") in ["Iteration", "Sprint"]:
            iteration_field = field
            iterations = field.get("configuration", {}).get("iterations", [])
            for iteration in iterations:
                title = iteration.get("title", "")
                # Match "Iteration 2", "Sprint 2", or just "2" as a complete word
                if title in ["Iteration 2", "Sprint 2", "2"] or title.lower() == "iteration 2" or title.lower() == "sprint 2":
                    iteration_2_id = iteration["id"]
                    print(f"Found iteration: {title}")
                    break
            break
    
    if not iteration_field:
        print("No Iteration/Sprint field found in the project.")
        sys.exit(1)
    
    if not iteration_2_id:
        print("Iteration 2 not found in the project.")
        print("Available iterations:")
        for iteration in iteration_field.get("configuration", {}).get("iterations", []):
            print(f"  - {iteration.get('title')}")
        sys.exit(1)
    
    return iteration_field["id"], iteration_2_id

def get_issue_id(issue_num):
    """Get the node ID for an issue."""
    query = """
    query($owner: String!, $repo: String!, $issueNum: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNum) {
          id
        }
      }
    }
    """
    
    result = run_gh_query(query, {"owner": OWNER, "repo": REPO, "issueNum": issue_num})
    return result.get("data", {}).get("repository", {}).get("issue", {}).get("id")

def add_issue_to_project(project_id, issue_id):
    """Add an issue to the project."""
    query = """
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
        }
      }
    }
    """
    
    result = run_gh_query(query, {"projectId": project_id, "contentId": issue_id})
    item = result.get("data", {}).get("addProjectV2ItemById", {}).get("item")
    return item.get("id") if item else None

def get_existing_item_id(project_id, issue_num):
    """Get the item ID if the issue is already in the project."""
    # Note: This query has a limit of 100 items. If your project has more than 100 items,
    # consider implementing pagination or the script may not find existing items.
    query = """
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                }
              }
            }
          }
        }
      }
    }
    """
    
    result = run_gh_query(query, {"projectId": project_id})
    items = result.get("data", {}).get("node", {}).get("items", {}).get("nodes", [])
    
    for item in items:
        content = item.get("content", {})
        if content.get("number") == issue_num:
            return item["id"]
    
    return None

def update_iteration(project_id, item_id, field_id, iteration_id):
    """Update the iteration field for an item."""
    query = """
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $iterationId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: {iterationId: $iterationId}
      }) {
        projectV2Item {
          id
        }
      }
    }
    """
    
    run_gh_query(query, {
        "projectId": project_id,
        "itemId": item_id,
        "fieldId": field_id,
        "iterationId": iteration_id
    })

def main():
    """Main function."""
    print("Finding GitHub Project...")
    project_id = get_project_id()
    
    print("\nFinding Iteration 2...")
    iteration_field_id, iteration_2_id = get_iteration_info(project_id)
    
    print(f"\nProcessing {len(ISSUES)} issues...")
    for issue_num in ISSUES:
        print(f"\nProcessing issue #{issue_num}...")
        
        # Get issue ID
        issue_id = get_issue_id(issue_num)
        
        if not issue_id:
            print(f"  ✗ Issue #{issue_num} not found in repository")
            continue
            
        print(f"  Issue ID: {issue_id}")
        
        # Add to project or get existing item ID
        item_id = add_issue_to_project(project_id, issue_id)
        
        if not item_id:
            print("  Issue may already be in project, finding existing item...")
            item_id = get_existing_item_id(project_id, issue_num)
        
        if not item_id:
            print(f"  ✗ Could not add or find issue #{issue_num} in project")
            continue
        
        print(f"  Item ID: {item_id}")
        
        # Update iteration
        update_iteration(project_id, item_id, iteration_field_id, iteration_2_id)
        print(f"  ✓ Issue #{issue_num} assigned to Iteration 2")
    
    print("\n✓ All US 2.x issues have been assigned to Iteration 2!")

if __name__ == "__main__":
    main()

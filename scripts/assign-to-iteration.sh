#!/bin/bash

# Script to assign US 2.x issues to Iteration 2 in GitHub Projects
# This script requires GH_TOKEN to be set in the environment

set -e

OWNER="Only-Raw-Data"
REPO="soen390-only-raw-data"

# Issues to assign (US 2.1 through US 2.6)
ISSUES=(11 12 13 15 17 20)

echo "Finding GitHub Project..."

# Get the project ID for the repository's project board
PROJECT_DATA=$(gh api graphql -f query='
query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    projectsV2(first: 10) {
      nodes {
        id
        title
        number
      }
    }
  }
}' -f owner="$OWNER" -f repo="$REPO")

echo "Project data: $PROJECT_DATA"

# Extract project ID (get the first project)
PROJECT_ID=$(echo "$PROJECT_DATA" | jq -r '.data.repository.projectsV2.nodes[0].id')

if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
    echo "No GitHub Project found for this repository."
    echo "Please create a GitHub Project first or use organization-level projects."
    exit 1
fi

echo "Found Project ID: $PROJECT_ID"

# Get the project fields to find the iteration field
FIELDS_DATA=$(gh api graphql -f query='
query($projectId: ID!) {
  node(id: $projectId) {
    ... on ProjectV2 {
      fields(first: 20) {
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
}' -f projectId="$PROJECT_ID")

echo "Fields data: $FIELDS_DATA"

# Find the iteration field ID and iteration 2 ID
ITERATION_FIELD_ID=$(echo "$FIELDS_DATA" | jq -r '.data.node.fields.nodes[] | select(.name == "Iteration" or .name == "Sprint") | .id')
ITERATION_2_ID=$(echo "$FIELDS_DATA" | jq -r '.data.node.fields.nodes[] | select(.name == "Iteration" or .name == "Sprint") | .configuration.iterations[] | select(.title | test("2|Iteration 2|Sprint 2")) | .id')

if [ "$ITERATION_FIELD_ID" == "null" ] || [ -z "$ITERATION_FIELD_ID" ]; then
    echo "No Iteration/Sprint field found in the project."
    exit 1
fi

if [ "$ITERATION_2_ID" == "null" ] || [ -z "$ITERATION_2_ID" ]; then
    echo "Iteration 2 not found in the project."
    exit 1
fi

echo "Iteration Field ID: $ITERATION_FIELD_ID"
echo "Iteration 2 ID: $ITERATION_2_ID"

# For each issue, add it to the project and set its iteration
for ISSUE_NUM in "${ISSUES[@]}"; do
    echo "Processing issue #$ISSUE_NUM..."
    
    # Get the issue node ID
    ISSUE_ID=$(gh api graphql -f query='
    query($owner: String!, $repo: String!, $issueNum: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNum) {
          id
        }
      }
    }' -f owner="$OWNER" -f repo="$REPO" -F issueNum="$ISSUE_NUM" | jq -r '.data.repository.issue.id')
    
    echo "  Issue ID: $ISSUE_ID"
    
    # Add issue to project
    ITEM_ID=$(gh api graphql -f query='
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
        }
      }
    }' -f projectId="$PROJECT_ID" -f contentId="$ISSUE_ID" | jq -r '.data.addProjectV2ItemById.item.id')
    
    if [ "$ITEM_ID" == "null" ] || [ -z "$ITEM_ID" ]; then
        echo "  Issue #$ISSUE_NUM may already be in the project, trying to update..."
        
        # Get existing item ID
        ITEM_ID=$(gh api graphql -f query='
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
        }' -f projectId="$PROJECT_ID" | jq -r ".data.node.items.nodes[] | select(.content.number == $ISSUE_NUM) | .id")
    fi
    
    echo "  Item ID: $ITEM_ID"
    
    # Update the iteration field
    gh api graphql -f query='
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
    }' -f projectId="$PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="$ITERATION_FIELD_ID" -f iterationId="$ITERATION_2_ID"
    
    echo "  ✓ Issue #$ISSUE_NUM assigned to Iteration 2"
done

echo ""
echo "All US 2.x issues have been assigned to Iteration 2!"

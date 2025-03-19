# Github Stats Dashboard
This dashboard uses the Github API and JIRA API (both based on PAT) to fetch user information and render charts to show progress or output over a period of time.

The intention of this dashboard is not to count the number of JIRA tickets or number of PRs per engineer, but to track trends across engineers in a team, and to identify potential performance concerns.

## Setup
1. run `yarn` to install dependencies
2. create an .env file in the root of the project (see .env.sample) and update all the env values
3. in one terminal run `yarn dev` to run the frontend
4. in a separate terminal run `yarn backend` to run the jira server

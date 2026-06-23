# Tally Prime local bridge agent

This bridge agent must run **locally** on the machine where Tally Prime is installed and running.

## Setup Instructions

1. Copy this `tally_bridge_agent` folder to your local machine (where Tally Prime is running).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the agent:
   ```bash
   node index.js
   ```
4. The agent will run on `http://localhost:7000` and communicate with Tally Prime's HTTP server (default: `http://localhost:9000`).

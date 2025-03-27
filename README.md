# ChatBot Genie

An interactive iPad-focused chat application that connects to Databricks and provides intelligent data visualization capabilities.

## Features

- Connect to Databricks for data analysis
- Natural language query interface
- SQL query execution
- Interactive data visualization with:
  - Tabular data view
  - Bar charts
  - Line charts
- Responsive design optimized for iPad
- Secure API key authentication (Microsoft Entra ID coming soon)

## Setup

1. Clone the repository
```bash
git clone https://github.com/aboufama/ChatBotGenie.git
cd ChatBotGenie
```

2. Install dependencies
```bash
npm install
```

3. Create a .env file based on .env.example
```bash
cp .env.example .env
```

4. Configure your Databricks connection in the .env file:
- SPACE_ID: Your Databricks workspace ID
- INSTANCE_URL: Your Databricks instance URL
- WAREHOUSE_ID: Your Databricks warehouse ID

5. Start the development server
```bash
npm start
```

## Authentication

The app currently uses API key authentication:

- Users must enter their Databricks API token on the login screen
- The API key is securely stored on the device using AsyncStorage
- No demo or default keys are provided

Microsoft Entra ID authentication will be implemented in a future version, providing:
- Enterprise-grade authentication using Microsoft Entra ID (Azure AD)
- Single sign-on capabilities
- Enhanced security features

## Usage

- Log in with your personal Databricks API token
- Type natural language queries in the chat interface
- Toggle between table, bar chart, and line chart views for data visualization
- Scroll through data when there are many rows
- Use the "Logout" button to clear your API key

## License

MIT 
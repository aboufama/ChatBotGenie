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

4. Add your Databricks credentials to the .env file:
- API_TOKEN: Your Databricks API token
- SPACE_ID: Your Databricks workspace ID
- INSTANCE_URL: Your Databricks instance URL
- WAREHOUSE_ID: Your Databricks warehouse ID

5. Start the development server
```bash
npm start
```

## Usage

- Type natural language queries in the chat interface
- Toggle between table, bar chart, and line chart views for data visualization
- Scroll through data when there are many rows

## License

MIT 
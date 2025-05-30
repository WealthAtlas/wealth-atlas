# Dynamic Asset Value Strategy

## Overview

The Dynamic Asset Value Strategy allows users to define custom JavaScript code to fetch and calculate the value of an asset. This is useful for assets that don't have a fixed growth rate or a manual entry, but instead derive their value from external data sources like APIs.

## How It Works

1. Users can create or edit an asset and choose the "Dynamic" value strategy.
2. They can then write JavaScript code that will be executed in the browser to fetch the current value of the asset.
3. The code is stored in the database and executed whenever the asset value needs to be displayed.
4. Users can test their code directly in the UI before saving.

## Creating a Dynamic Script

The script must export an async function called `getValue()` that returns a number. Here's a basic example:

```javascript
/**
 * @returns {Promise<number>} The current value of the asset
 */
export async function getValue() {
  try {
    // Make an API call to get the value
    const response = await fetch('https://api.example.com/price/AAPL');
    const data = await response.json();
    return data.price;
  } catch (error) {
    console.error('Error fetching asset value:', error);
    throw error;
  }
}
```

## Script Capabilities

Your script can:

- Make HTTP requests using `fetch`
- Process and transform data
- Perform calculations
- Aggregate data from multiple sources

For security reasons, the script runs in a sandboxed environment with limited access to browser APIs.

## Template Examples

The system includes several templates to help users get started:

1. **Stock Price (AlphaVantage)**: Fetches the current price of a stock using AlphaVantage API.
2. **Cryptocurrency (CoinGecko)**: Fetches the current price of a cryptocurrency using CoinGecko API.
3. **Currency Exchange Rate**: Fetches the current exchange rate between two currencies.
4. **Multi-Asset Portfolio**: Calculates the value of a portfolio containing multiple assets.
5. **Mock Value**: Generates a random value for testing purposes.

## Security Considerations

The script code is executed in the browser with limited access to browser APIs for security reasons. The sandbox environment prevents access to sensitive browser APIs and limits the potential damage that could be caused by malicious code.

## Components

This feature consists of the following components:

1. **Asset Entity**: The backend schema for storing assets with value strategies.
2. **AssetDialogForm**: The form for creating/editing assets, including the script editor.
3. **DynamicAssetValue**: A reusable component for executing and displaying the value from a script.
4. **scriptExecutor.ts**: Utility for safely executing script code in a sandbox.
5. **scriptTemplates.ts**: Pre-defined script templates to help users get started.

## API Usage Guidelines

When using external APIs in your scripts, consider the following:

1. **Rate Limits**: Many APIs have rate limits. Be mindful of how often you're making requests.
2. **API Keys**: Never hardcode sensitive API keys in your scripts. Consider using environment variables or a backend proxy.
3. **Error Handling**: Always include robust error handling to gracefully handle API failures.

## Troubleshooting

If your script isn't working correctly, try the following:

1. **Test the script** using the "Test Script" button before saving.
2. **Check the console** for any error messages.
3. **Verify your API endpoints** are correct and accessible from the browser.
4. **Ensure your script returns a number** and not a string or other data type.

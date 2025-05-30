// This file contains example script code templates that users can adapt for their assets

// Example 1: Fetching stock price from AlphaVantage API
export const alphaVantageStockTemplate = `
/**
 * Fetches the current price of a stock from AlphaVantage API
 * @returns {Promise<number>} The current stock price
 */
async function fetchStockPrice() {
  // Replace with your actual API key and stock symbol
  const API_KEY = 'YOUR_ALPHA_VANTAGE_API_KEY';
  const SYMBOL = 'AAPL'; // Example: Apple Inc.
  
  const url = \`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=\${SYMBOL}&apikey=\${API_KEY}\`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Check if we got a valid response
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      return parseFloat(data['Global Quote']['05. price']);
    } else {
      throw new Error('Invalid response from AlphaVantage API');
    }
  } catch (error) {
    console.error('Error fetching stock price:', error);
    throw error;
  }
}

// Export the getValue function that will be called by the application
export async function getValue() {
  return fetchStockPrice();
}
`;

// Example 2: Fetching cryptocurrency price from CoinGecko API
export const coinGeckoCryptoTemplate = `
/**
 * Fetches the current price of a cryptocurrency from CoinGecko API
 * @returns {Promise<number>} The current crypto price in USD
 */
async function fetchCryptoPrice() {
  // CoinGecko API endpoint - no API key required for basic usage
  const COIN_ID = 'bitcoin'; // Change to the coin you want to track
  const url = \`https://api.coingecko.com/api/v3/simple/price?ids=\${COIN_ID}&vs_currencies=usd\`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Check if we got a valid response
    if (data[COIN_ID] && data[COIN_ID].usd) {
      return data[COIN_ID].usd;
    } else {
      throw new Error('Invalid response from CoinGecko API');
    }
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    throw error;
  }
}

// Export the getValue function that will be called by the application
export async function getValue() {
  return fetchCryptoPrice();
}
`;

// Example 3: Fetching currency exchange rates from ExchangeRate API
export const exchangeRateTemplate = `
/**
 * Fetches the current exchange rate between two currencies
 * @returns {Promise<number>} The current exchange rate
 */
async function fetchExchangeRate() {
  // Replace with your actual API key
  const API_KEY = 'YOUR_EXCHANGE_RATE_API_KEY';
  const BASE_CURRENCY = 'USD';
  const TARGET_CURRENCY = 'EUR';
  
  const url = \`https://api.exchangeratesapi.io/latest?base=\${BASE_CURRENCY}&symbols=\${TARGET_CURRENCY}&access_key=\${API_KEY}\`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Check if we got a valid response
    if (data.rates && data.rates[TARGET_CURRENCY]) {
      return data.rates[TARGET_CURRENCY];
    } else {
      throw new Error('Invalid response from Exchange Rate API');
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    throw error;
  }
}

// Export the getValue function that will be called by the application
export async function getValue() {
  return fetchExchangeRate();
}
`;

// Example 4: Multiple API calls and data aggregation
export const multipleApiCallsTemplate = `
/**
 * Fetches data from multiple sources and aggregates the results
 * @returns {Promise<number>} The aggregated value
 */
async function fetchAggregatedData() {
  // Example: Calculate the value of a portfolio containing multiple assets
  
  // Define your portfolio
  const portfolio = [
    { type: 'stock', symbol: 'AAPL', quantity: 10 },
    { type: 'stock', symbol: 'MSFT', quantity: 5 },
    { type: 'crypto', id: 'bitcoin', quantity: 0.5 }
  ];
  
  // Function to fetch stock price from AlphaVantage
  async function fetchStockPrice(symbol) {
    const API_KEY = 'YOUR_ALPHA_VANTAGE_API_KEY';
    const url = \`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=\${symbol}&apikey=\${API_KEY}\`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      return parseFloat(data['Global Quote']['05. price']);
    }
    throw new Error(\`Could not fetch price for \${symbol}\`);
  }
  
  // Function to fetch crypto price from CoinGecko
  async function fetchCryptoPrice(coinId) {
    const url = \`https://api.coingecko.com/api/v3/simple/price?ids=\${coinId}&vs_currencies=usd\`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data[coinId] && data[coinId].usd) {
      return data[coinId].usd;
    }
    throw new Error(\`Could not fetch price for \${coinId}\`);
  }
  
  try {
    // Calculate the total portfolio value
    let totalValue = 0;
    
    // Using Promise.all to fetch all prices in parallel
    const results = await Promise.all(portfolio.map(async (asset) => {
      if (asset.type === 'stock') {
        const price = await fetchStockPrice(asset.symbol);
        return price * asset.quantity;
      } else if (asset.type === 'crypto') {
        const price = await fetchCryptoPrice(asset.id);
        return price * asset.quantity;
      }
      return 0;
    }));
    
    // Sum up all the values
    totalValue = results.reduce((sum, value) => sum + value, 0);
    return totalValue;
    
  } catch (error) {
    console.error('Error calculating portfolio value:', error);
    throw error;
  }
}

// Export the getValue function that will be called by the application
export async function getValue() {
  return fetchAggregatedData();
}
`;

// Example 5: Simple mock template for testing
export const mockTemplate = `
/**
 * Returns a mock value for testing purposes
 * @returns {Promise<number>} A mock asset value
 */
async function getMockValue() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate a random value between 900 and 1100
  const baseValue = 1000;
  const randomFactor = Math.random() * 0.2 - 0.1; // -10% to +10%
  return baseValue * (1 + randomFactor);
}

// Export the getValue function that will be called by the application
export async function getValue() {
  return getMockValue();
}
`;

// Import our new asset info template

// Export all templates in a more accessible format
export const scriptTemplates = {
  stock: {
    name: "Stock Price (AlphaVantage)",
    description: "Fetch current stock price using AlphaVantage API",
    template: alphaVantageStockTemplate
  },
  crypto: {
    name: "Cryptocurrency (CoinGecko)",
    description: "Fetch current cryptocurrency price using CoinGecko API",
    template: coinGeckoCryptoTemplate
  },
  forex: {
    name: "Currency Exchange Rate",
    description: "Fetch current exchange rate between two currencies",
    template: exchangeRateTemplate
  },
  portfolio: {
    name: "Multi-Asset Portfolio",
    description: "Calculate the value of a portfolio containing multiple assets",
    template: multipleApiCallsTemplate
  },
  mock: {
    name: "Mock Value (Testing)",
    description: "Generate a random value for testing purposes",
    template: mockTemplate
  }
};

# Node.js SDK Usage

## Installation

```bash
npm install axios
```

## Usage

```javascript
const axios = require('axios');

const API_KEY = 'your_api_key_here';
const HOST = 'http://127.0.0.1:8000';
const client = axios.create({ baseURL: HOST });

async function getQuote(symbol, exchange) {
  const { data } = await client.post('/api/v1/quote', {
    apikey: API_KEY,
    symbol,
    exchange,
  });
  return data;
}

async function placeOrder(symbol, exchange, action, quantity) {
  const { data } = await client.post('/api/v1/placeorder', {
    apikey: API_KEY,
    symbol,
    exchange,
    action,
    quantity,
    pricetype: 'MARKET',
  });
  return data;
}

// Example
getQuote('BTC/USDT', 'binance').then(console.log);
```

## Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getQuote` | `POST /api/v1/quote` | Get LTP for a symbol |
| `placeOrder` | `POST /api/v1/placeorder` | Place an order |
| `getOrders` | `POST /api/v1/orders` | Get open orders |
| `getPositions` | `POST /api/v1/positions` | Get current positions |
| `getHolding` | `POST /api/v1/holding` | Get holdings |
| `getFunds` | `POST /api/v1/funds` | Get funds/balance |
| `cancelOrder` | `POST /api/v1/cancelorder` | Cancel an order |
| `modifyOrder` | `POST /api/v1/modifyorder` | Modify an order |
| `getOrderBook` | `POST /api/v1/orderbook` | Get order book |
| `getTradeBook` | `POST /api/v1/tradebook` | Get trade book |

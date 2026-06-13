# Go SDK Usage

## Installation

```bash
go get github.com/go-resty/resty/v2
```

## Usage

```go
package main

import (
    "fmt"
    "github.com/go-resty/resty/v2"
)

const (
    APIKey = "your_api_key_here"
    Host   = "http://127.0.0.1:8000"
)

type QuoteResponse struct {
    Status string `json:"status"`
    Data   struct {
        Symbol   string  `json:"symbol"`
        Exchange string  `json:"exchange"`
        LTP      float64 `json:"ltp"`
    } `json:"data"`
}

func GetQuote(symbol, exchange string) (*QuoteResponse, error) {
    client := resty.New()
    var result QuoteResponse
    _, err := client.R().
        SetHeader("Content-Type", "application/json").
        SetBody(map[string]string{
            "apikey":   APIKey,
            "symbol":   symbol,
            "exchange": exchange,
        }).
        SetResult(&result).
        Post(Host + "/api/v1/quote")
    return &result, err
}

func main() {
    quote, err := GetQuote("BTC/USDT", "binance")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    fmt.Printf("LTP: %.2f\n", quote.Data.LTP)
}
```

## Methods

| Function | Endpoint | Description |
|----------|----------|-------------|
| `GetQuote` | `POST /api/v1/quote` | Get LTP for a symbol |
| `PlaceOrder` | `POST /api/v1/placeorder` | Place an order |
| `GetOrders` | `POST /api/v1/orders` | Get open orders |
| `GetPositions` | `POST /api/v1/positions` | Get current positions |
| `GetFunds` | `POST /api/v1/funds` | Get funds/balance |

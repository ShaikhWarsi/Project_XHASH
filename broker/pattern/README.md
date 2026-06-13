# Broker Integration Pattern

## Directory Structure

```
broker/{name}/
  __init__.py
  plugin.json          -- broker metadata
  api/                 -- broker API client
    __init__.py
    auth_api.py        -- authenticate_broker()
    order_api.py       -- place/modify/cancel order
    data.py            -- get_quotes(), get_multiquotes()
    funds.py           -- get_funds(), get_positions()
    baseurl.py         -- ROOT_URL constant
  database/            -- broker-specific DB
    __init__.py
    master_contract_db.py  -- download/store instrument master
  mapping/             -- symbol format conversion
    __init__.py
    transform_data.py  -- OpenAlgo format <-> broker format
  streaming/           -- WebSocket market data
    __init__.py
    ws.py              -- broker WebSocket adapter
```

## Integration Steps

1. Copy `broker/pattern/` to `broker/{name}/`
2. Implement each module following the templates
3. Register in the broker loader

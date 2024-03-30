# AI Guard Assistant API

## How to use

```bash
# call assistant api
curl --location 'http://localhost:3000/message' \
--header 'Content-Type: application/json' \
--data '{
  "chainId": "1261120",
  "data": {
    "method": "eth_sendTransaction",
    "params": [
      {
        "from": "0xb0b9c5F027A59409579A6a9139c4E9BB29De5A4b",
        "to": "0xdC0e4E9C1BF3Aa88Cd9BE32186a741cd893C78cA",
        "value": 1000000000000,
        "gasLimit": "0x5028",
        "maxPriorityFeePerGas": "0x3b9aca00",
        "maxFeePerGas": "0x2540be400"
      }
    ]
  }
}'
```

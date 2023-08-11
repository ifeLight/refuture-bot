# Refuture Bot

An automated and configurable cryptocurrency trading bot that supports the Binance Future Exchange for futures trading. This bot is built with Node.js and uses the Binanace API to interact with the exchange.

Note: This bot is still in development and is not yet ready for production use. Use at your own risk.

## Getting Started

### Prerequisites

- Node.js
- NPM
- Binance Account
- Binance API Key
- Binance API Secret
- Binance Future Account

### Installation

1. Clone the repo

```sh
git clone https://github.com/ifeLight/refuture-bot.git && cd refuture-bot
```

2. Install NPM packages

```sh
npm install
```

3. Create a configuration file

```sh
cp hyperparameter-config-sample.json hyperparameter-config.json
```

4. Edit the configuration file

```sh
nano hyperparameter-config.json
```

The sample of the configuration file looks like this:

```json
{
    "optimize": "balance",
    "exchange": "binance_futures",
    "symbol": "ETH/USDT",
    "orderType": "market",
    "indicator": "trendline-reversal",
    "leverage": 5,
    "toLog": false,
    "fee": 0.06,
    "amount": 1000,
    "maximumIteration": 5,
    "safeties": "",
    "useDefaultSafety": true,
    "noInterruption": true,
    "period": "5m",
    "takeProfit": 1.5,
    "stopLoss": 0.7,
    "useMemory": true,
    "backfillPeriods": "5m,15m,30m",
    "backFillSpace": 220,
    "space": {
        "period": "h.choice(['5m','15m', '30m'])",
        "stopLoss": "h.choice([0.7, 1.2, 2])"
    }
}
```

The configuration file is used to set the hyperparameters for the bot. The hyperparameters are the variables that are used to control the bot. The hyperparameters are:

- optimize: selct the hyperparameter to optimize. The options are: balance, period, stopLoss, takeProfit, leverage, fee, amount, maximumIteration, safeties, useDefaultSafety, noInterruption, backfillPeriods, backFillSpace, space
- exchange: select the exchange to trade on. The options are: binance_futures
- symbol: the trade pair of the exchange
- orderType: the type of order to place. The options are: market, limit
- indicator: the indicator to use for the bot. The options are: trendline-reversal
- leverage: the leverage to use for the trade
- toLog: whether to log the trades or not
- fee: the fee to use for the trade
- amount: the amount to use for the trade
- maximumIteration: the maximum number of iterations to use for the trade
- safeties: the safeties to use for the trade
- useDefaultSafety: whether to use the default safety or not
- noInterruption: whether to use the no interruption safety or not
- period: the period to use for the trade
- takeProfit: the take profit to use for the trade
- stopLoss: the stop loss to use for the trade
- useMemory: whether to use the memory or not
- backfillPeriods: the backfill periods to use for the trade
- backFillSpace: the backfill space to use for the trade
- space: the space to use for the trade
- space.period: the space period to use for the trade
- space.stopLoss: the space stop loss to use for the trade
- space.takeProfit: the space take profit to use for the trade

## Usage

To run the bot, run the following command:

```sh
npm start
```

## License

Distributed under the MIT License. See `LICENSE` for more information.

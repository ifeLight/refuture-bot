class OrderExecutor {
    constructor({logger, eventEmitter, notifier, delayTime = 5}) {
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.notifier = notifier;
        let delayTimeInMs = delayTime * 1000; // This is orders delay Time
        this.delay = async (time = delayTimeInMs) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, time);
            });
        }
    }

    counter(interval=50) {
        if (!this._counts) {
            this._counts = 0
        }
        if (this._counts % interval === 0) {
            console.log(`Order Executing: ${this._counts } - Interval (${interval})`)
        }
        this._counts++;
    }

    async execute(signalResult, exchangePair, options) {
        try {
            const tradeOptions = options.trade;
            const lastPrice = await exchangePair.getLastPrice();
            let amount;
    
            if (tradeOptions.amount) {
                amount = parseFloat(tradeOptions.amount)
            } else if (tradeOptions['currency_amount']) {
                const capitalAmount = parseFloat(tradeOptions['currency_amount']);
                amount = capitalAmount / parseFloat(lastPrice)
            } else {
                throw new Error('Amount not configured');
            }

            const { taker: takerFee, maker: makerFee } = exchangePair.info.fees;
            const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision
            const { min: minimumAmountLimit, max: maximumAmountLimit } = exchangePair.info.limits.amount;
            const { min: minimumPriceLimit, max: maximumPriceLimit } = exchangePair.info.limits.price;

            //Return when no advice and signal
            if (!signalResult) return;
            if (!signalResult.getSignal() && !signalResult.getOrderAdvice()) return;

            //Create info for Notifier
            this.notifierInfo = {
                symbol: exchangePair.symbol,
                exchange: exchangePair.exchangeName,
                tag: signalResult.getTag(),
                ...signalResult.getDebug(),
                order_type: tradeOptions["order_type"]
            }
            
            // If it is Futures, run Futures Order Execution
            const isFutures = exchangePair.exchange.isFutures;
            if (isFutures) {
                return (await this.executeFutures(signalResult, exchangePair, options));
            }  

            // Return when the amount is bad or low
            const exchangeAmountFigure = parseFloat((amount - (parseFloat(takerFee) * amount)).toFixed(amountPrecision));
            if (exchangeAmountFigure < minimumAmountLimit || exchangeAmountFigure > maximumAmountLimit) {
                throw new Error('Insufficient or bad amount');
            }

            const { base, quote} = exchangePair.info;
            const baseBalance = await exchangePair.getBalance(base);
            const quoteBalance = await exchangePair.getBalance(quote);

            if (signalResult.getSignal()) {
                const signal = signalResult.getSignal()
                // Set last signal
                exchangePair.setLastSignal(signal);
                if (signal == 'long') {
                    await this.runLong(exchangePair, amount, options);
                }

                if (signal == 'close' || signal == 'short') {
                    await this.runShort(exchangePair, options);
                }
            } else if (signalResult.getOrderAdvice()) {
                await this.runAdvice(signalResult.getOrderAdvice(), exchangePair, amount, options);
            }
        } catch (error) {
            console.error(error);
            this.logger.warn(`Execute Order: Failed to execute Order [${exchangePair.symbol} (${error.message})]`)
        }
    }

    notifyCreatedOrder(data) {
        const message = {
            level: 'order',
            message: 'An order has been created',
            date: (new Date()).toString(),
            ...this.notifierInfo,
            ...data,
        }

        if (this.notifier) {
            this.notifier.send(message)
        }
    }

    async executeFutures(signalResult, exchangePair, options) {
        try {
            const tradeOptions = options.trade;
            let positions = await exchangePair.getPositions();
            if (positions === undefined) throw new Error('Cannot fetch positions for execution');

            let position;
            if (positions.length > 1) {
                const mostProfitablePosition = await this.resetPositionsToOne(positions, exchangePair);
                position = mostProfitablePosition;
            } else if (positions.length == 1) {
                position = positions[0];
            }

             // Leverage set check
             const lev = await exchangePair.getLeverage();
            if (!lev) {
                const optionsLeverage = tradeOptions.leverage;
                if (!optionsLeverage) throw new Error('Leverage not set in options')
                const leverage = parseInt(optionsLeverage);
                await exchangePair.setLeverage(leverage)
            }

            const leverage = parseInt(await exchangePair.getLeverage());
            const ticker = await exchangePair.getTicker()
            const { bidPrice, askPrice, lastPrice} = ticker;
            let amount, amountToTrade;
            if (tradeOptions.amount) {
                amountTotrade = parseFloat(tradeOptions.amount);
                amount = amountTotrade * leverage;
            } else if (tradeOptions['currency_amount']) {
                const capitalAmount = parseFloat(tradeOptions['currency_amount']);
                amountToTrade = (capitalAmount / parseFloat(lastPrice));
                amount = amountToTrade * leverage;
            } else {
                throw new Error('Amount not configured');
            }

            // Clear up Stop Loss & Take Profit When No Trade (position) is Going On
            if (!position) {
                const orderTypesToClose = ['stop', 'stop_market', 'take_profit', 'take_profit_market'];
                let openOrders = await exchangePair.getActiveOrders();
                if (openOrders && Array.isArray(openOrders) && openOrders.length > 0) {
                    for (const order of openOrders) {
                        const {id, type} = order;
                        if (orderTypesToClose.includes(type)) {
                            await exchangePair.cancelActiveOrders(id);
                        }
                    }
                }
            }

            // Check if there is available money to trade
            // Stop new trade unless there is available money to trade --Fixed
            const quoteCurrency = exchangePair.info.quote;
            const quoteAvailableBalance = (await exchangePair.getBalance(quoteCurrency)).free;
            const isThereAvailbleFunds = quoteAvailableBalance >= amountToTrade;

            if (signalResult.getSignal()) {
                const signal = signalResult.getSignal();
                if (signal == 'long') {
                    await this.runFuturesLong(position, exchangePair, amount, isThereAvailbleFunds, options);
                }

                if (signal == 'short') {
                    await this.runFuturesShort(position, exchangePair, amount, isThereAvailbleFunds, options);
                }

                if (signal == 'close' ) {
                    await this.futuresClose(position, exchangePair, options);
                }
            } else if (signalResult.getOrderAdvice()) {
                await this.runFuturesAdvice(signalResult.getOrderAdvice(), position, exchangePair, amount, options);
            }
            
        } catch (error) {
            console.error(error);
            this.logger.warn(`Execute Futures Order: Failed to execute Order [${exchangePair.symbol} (${error.message})]`)
        }
    }
    

    async futuresStoplossAdviceHandler(exchangePair, positionSide, tradingPrice, tradingAmount, ticker, orderType, orderList) {
        let {openOrders} = orderList;
        const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision;
        const { bidPrice, askPrice, lastPrice} = ticker;
        const stoplossOrderType =  orderType == 'market' ? 'STOP_MARKET': 'STOP';
        const self = this;

        // Prevent Any Action to Stop an Ongoing Unfilled Limit Order
        if (openOrders && openOrders[0]) {
            for (const order of openOrders) {
                const orderType = order.type
                const orderSide = order.side;
                const cond1 = orderType == 'limit';
                const cond2 = orderSide == 'buy' && positionSide == 'LONG';
                const cond3 = orderSide == 'sell' && positionSide == 'SHORT';
                if (cond1 && (cond2 || cond3)) {
                    return;
                }
            }
        }

        const stopPrice = tradingPrice;
        const futuresCreateStopLossOrder = async (side) => {
            await exchangePair.createOrder(stoplossOrderType, side, tradingAmount, tradingPrice, {
                'stopPrice': stopPrice
            });
            // Delay need to b done here
            await self.delay();
        }

        let openStopOrders = openOrders.filter((order) => order.type == stoplossOrderType.toLocaleLowerCase() )
        if (openStopOrders.length > 1) {
            for (const order of openStopOrders)  {
                await exchangePair.cancelActiveOrders(order.id);
            }
            await self.delay();
            openStopOrders = [];
        }

        if (positionSide == 'LONG') {
            if (tradingPrice > bidPrice) return;
            if (openStopOrders.length === 1 ) {
                const order = openStopOrders[0];
                if (tradingPrice == parseFloat(order.stopPrice)) return;
                await exchangePair.cancelActiveOrders(order.id);
                await futuresCreateStopLossOrder('sell');
            } 
            if (openStopOrders.length === 0) {
                await futuresCreateStopLossOrder('sell');
            }
        }
        if (positionSide == 'SHORT') {
            if (tradingPrice < askPrice) return;
            if (openStopOrders.length === 1 ) {
                const order = openStopOrders[0];
                if (tradingPrice == parseFloat(order.price)) return;
                await exchangePair.cancelActiveOrders(order.id);
                await futuresCreateStopLossOrder('buy');
            } 
            if (openStopOrders.length === 0) {
                await futuresCreateStopLossOrder('buy');
            }
        }
    }

    async futuresTakeProfitAdviceHandler(exchangePair, positionSide, tradingPrice, tradingAmount, ticker, orderType, orderList) {
        const {openOrders, openBuyOrders, openSellOrders} = orderList;
        const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision;
        const { bidPrice, askPrice, lastPrice} = ticker;
        const takeProfitOrderType =  orderType == 'market' ? 'TAKE_PROFIT_MARKET': 'TAKE_PROFIT';
        const self = this;

        const stopPrice = tradingPrice;
        const futuresCreateTakeProfitOrder = async (side) => {
            await exchangePair.createOrder(takeProfitOrderType, side, tradingAmount, tradingPrice, {
                'stopPrice': stopPrice
            });
            await self.delay();
        }

        let openTakeProfitOrders = openOrders.filter((order) => order.type == takeProfitOrderType.toLocaleLowerCase() )
        if (openTakeProfitOrders.length > 1) {
            for (const order of takeProfitOrders)  {
                await exchangePair.cancelActiveOrders(order.id);
            }
            await self.delay();
            takeProfitOrders = [];
        }

        if (positionSide == 'LONG') {
            if (tradingPrice < askPrice) return;
            if (openTakeProfitOrders.length === 1 ) {
                const order = openTakeProfitOrders[0];
                if (tradingPrice == parseFloat(order.stopPrice)) return;
                await exchangePair.cancelActiveOrders(order.id);
                await futuresCreateTakeProfitOrder('sell');
            } 
            if (openTakeProfitOrders.length === 0) {
                await futuresCreateTakeProfitOrder('sell');
            }
        }

        if (positionSide == 'SHORT') {
            if (tradingPrice > bidPrice) return;
            if (openTakeProfitOrders.length === 1 ) {
                const order = openTakeProfitOrders[0];
                if (tradingPrice == parseFloat(order.stopPrice)) return;
                await exchangePair.cancelActiveOrders(order.id);
                await futuresCreateTakeProfitOrder('buy');
            } 
            if (openOrders.length === 0) {
                await futuresCreateTakeProfitOrder('buy');
            }
        }
    }
    async runFuturesAdvice(advice, position, exchangePair, amount, options) {
        const {signal, price} = advice;
        const advicePrice = parseFloat(price);
        if (!['long', 'short', 'close', 'stoploss', 'take_profit'].includes(signal)) {
            throw `Invalid signal:${signal}`;
        }
        const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision;
        let openOrders = await exchangePair.getActiveOrders();
        let openBuyOrders = openOrders.filter((order) => order.side == 'buy');
        let openSellOrders = openOrders.filter((order) => order.side == 'sell');
        const orderType = options.trade["order_type"] || 'market';
        
        const ticker = await exchangePair.getTicker();
        const { bidPrice, askPrice, lastPrice} = ticker;
        const tradingAmount = parseFloat((amount).toFixed(amountPrecision));
        const tradingPrice = parseFloat((advicePrice).toFixed(pricePrecision));
        
        if (!position) {
            // Cancel all active orders if greater than 1
            if (openOrders.length > 1) {
                await exchangePair.cancelActiveOrders();
                await this.delay();
                const refetchedOrders = await exchangePair.getActiveOrders();
                openOrders = refetchedOrders
                openBuyOrders = openOrders.filter((order) => order.side == 'buy');
                openSellOrders = openOrders.filter((order) => order.side == 'sell');
            }
            if (openOrders.length > 1) return;
            if (signal === 'close') return;
            if (signal === 'long') {
                if (openOrders.length === 1 && (openBuyOrders.length === 1 || openSellOrders.length === 1)) {
                    const order = openOrders[0];
                    if (openBuyOrders.length === 1) {
                        if (tradingPrice > bidPrice) return;
                        if (tradingPrice == parseFloat(order.price)) return;
                    } 
                    await exchangePair.cancelActiveOrders(order.id);
                    await exchangePair.createLimitOrder('buy', tradingAmount, tradingPrice);
                    await this.delay();
                    
                } 
                if (openOrders.length === 0) {
                    await exchangePair.createLimitOrder('buy', tradingAmount, tradingPrice);
                    await this.delay();
                }
            }
            if (signal === 'short') {
                if (openOrders.length === 1 && (openBuyOrders.length === 1 || openSellOrders.length === 1)) {
                    const order = openOrders[0];
                    if (openSellOrders.length === 1) {
                        if (tradingPrice < askPrice) return;
                        if (tradingPrice == parseFloat(order.price)) return;
                    } 
                    await exchangePair.cancelActiveOrders(order.id);
                    await exchangePair.createLimitOrder('sell', tradingAmount, tradingPrice);
                    await this.delay();
                } 
                if (openOrders.length === 0) {
                    await exchangePair.createLimitOrder('sell', tradingAmount, tradingPrice);
                    await this.delay();
                }
            }
        }

        if (position) {
            // Cancel all active orders if greater than 2
            if (openOrders.length > 2) {
                await exchangePair.cancelActiveOrders();
                await this.delay();
                const refetchedOrders = await exchangePair.getActiveOrders();
                openOrders = refetchedOrders
                openBuyOrders = openOrders.filter((order) => order.side == 'buy');
                openSellOrders = openOrders.filter((order) => order.side == 'sell');
            }
            const { positionSide, positionAmount, leverage } = position;
            const orderList = {
                openOrders, openBuyOrders, openSellOrders
            }
            const handleStoploss = async () => {
                await this.futuresStoplossAdviceHandler(exchangePair, 
                    positionSide, tradingPrice, tradingAmount, 
                    ticker, orderType, orderList
                );
            }
            const handleTakeProfit = async () => {
                await this.futuresTakeProfitAdviceHandler(exchangePair, 
                    positionSide, tradingPrice, tradingAmount, ticker, 
                    orderType, orderList
                    );
            }

            // Stoploss advice
            if (signal === 'stoploss') {
               await handleStoploss();
            }

            // Take Profit Advice
            if (signal === 'take_profit') {
                await handleTakeProfit();
            }

            if (signal === 'close') {
                if (positionSide == 'SHORT') {
                    if (tradingPrice > askPrice) {
                        await handleStoploss();
                    }
                    if (tradingPrice < bidPrice) {
                        await handleTakeProfit();
                    }
                }
                // Closing Long Position with Safeties
                if (positionSide == 'LONG') {
                    if (tradingPrice > askPrice) {
                        await handleTakeProfit();
                    }
                    if (tradingPrice < bidPrice) {
                        await handleStoploss();
                    }
                }
            }

            if (signal === 'long') {
                if (positionSide == 'SHORT') {
                    if (tradingPrice > bidPrice) return;
                    if(openOrders.length === 0) {
                        const tradingAmount = parseFloat((parseFloat(positionAmount) * 2).toFixed(amountPrecision));
                        await exchangePair.createLimitOrder('buy', tradingAmount, tradingPrice);
                        await this.delay();
                    }
                }

                if (positionSide == 'LONG') {}
            }
            
            if (signal === 'short') {
                if (positionSide == 'SHORT') {}

                if (positionSide == 'LONG') {
                    if (tradingPrice < askPrice) return;
                    if(openOrders.length === 0) {
                        const tradingAmount = parseFloat((parseFloat(positionAmount) * 2).toFixed(amountPrecision));
                        await exchangePair.createLimitOrder('sell', tradingAmount, tradingPrice);
                        await this.delay();
                    }
                }
            }
        }
        
    }

    async runFuturesLong(position, exchangePair, amount, fundsAvailable, options) {
        const openOrders = await exchangePair.getActiveOrders();
        const openBuyOrders = openOrders.filter((order) => order.side == 'buy');
        const openSellOrders = openOrders.filter((order) => order.side == 'sell');
        const ticker = await exchangePair.getTicker()
        const { bidPrice, askPrice, lastPrice} = ticker;
        if (!position || (position && position.positionAmount == 0)) {
            if (openOrders.length > 1 || (openBuyOrders.length === 0 && openOrders.length == 1)) {
                await exchangePair.cancelActiveOrders();
                await this.futuresCreateOrder(exchangePair, amount, 'buy', options);
                return;
            }

            if (openBuyOrders.length === 1 && openOrders.length == 1) {
                const order = openOrders[0];
                const orderPrice = parseFloat(order.price)
                //{checkSomeStopBuyLimitConfluence}
                // it helped to fix when an already stop buy limit order is placed
                const checkSomeStopBuyLimitConfluence = orderPrice > askPrice && (order.type == 'stop'|| order.type == 'stop_market');
                if (orderPrice < bidPrice || checkSomeStopBuyLimitConfluence) {
                    await exchangePair.cancelActiveOrders();
                    await this.futuresCreateOrder(exchangePair, amount, 'buy', options);
                    return;
                }
            }
            // Return if no funds available
            if (!position && !fundsAvailable) return;
            if (openOrders.length < 1) {
                await this.futuresCreateOrder(exchangePair, amount, 'buy', options)
                return;
            }
        }

        if (position) {
            const { positionSide, positionAmount, leverage } = position;
            const remainingAmount = parseFloat(amount) - parseFloat(positionAmount);
            const { min: minimumAmountLimit, max: maximumAmountLimit } = exchangePair.info.limits.amount;
            const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision;
            const rePrecisedAmount =  parseFloat(remainingAmount.toFixed(amountPrecision));

            if (positionSide === 'LONG') {
                if (rePrecisedAmount < minimumAmountLimit ) return;
                if (rePrecisedAmount > minimumAmountLimit ) {
                    const { base, quote} = exchangePair.info;
                    if (openBuyOrders.length > 0) {
                        for (const order of openBuyOrders) {
                            await exchangePair.cancelActiveOrders(order.id);
                        }
                    }
                    const quoteBalance = await exchangePair.getBalance(quote);
                    if (parseFloat(quoteBalance.free) > ((rePrecisedAmount * lastPrice) / parseInt(leverage)) ) {
                        await this.futuresCreateOrder(exchangePair, rePrecisedAmount, 'buy', options);
                        return;
                    }
                }
            }

            const self = this;
            async function recreateOrder() {
                const remAmount = amount - parseFloat(positionAmount);
                if (remAmount > 0) {
                    const remAmountToQuote = (remAmount * lastPrice) / parseInt(leverage);
                    const { quote } = exchangePair.info;
                    const quoteBalance = await exchangePair.getBalance(quote);
                    let newAmount;
                    if (remAmountToQuote < quoteBalance.free) {
                        newAmount = parseFloat((parseFloat(amount) * 2).toFixed(amountPrecision))
                    } else {
                        newAmount = parseFloat((parseFloat(positionAmount) * 2).toFixed(amountPrecision))
                    }
                    await self.futuresCreateOrder(exchangePair, newAmount, 'buy', options);
                    return;
                }

                const newAmount = parseFloat((parseFloat(positionAmount) * 2).toFixed(amountPrecision))
                await self.futuresCreateOrder(exchangePair, newAmount, 'buy', options);
                return;
            }
            
            if (positionSide === 'SHORT') {
                if (openOrders.length > 1 || (openBuyOrders.length === 0 && openOrders.length == 1)) {
                    await exchangePair.cancelActiveOrders();
                    await recreateOrder();
                }
                if (openBuyOrders.length == 1) {
                    const order = openBuyOrders[0];
                    const orderPrice = parseFloat(order.price)
                    //{checkSomeStopBuyLimitConfluence}
                    // it helped to fix when an already stop buy limit order is placed
                    const checkSomeStopBuyLimitConfluence = orderPrice > askPrice && (order.type == 'stop'|| order.type == 'stop_market');
                    if ((orderPrice < bidPrice) ||  checkSomeStopBuyLimitConfluence) {
                        await exchangePair.cancelActiveOrders();
                        await recreateOrder()
                        return;
                    }
                }

                if (openOrders.length < 1) {
                    await recreateOrder()
                    return;
                }
            }
        }
    }

    async runFuturesShort(position, exchangePair, amount, fundsAvailable, options) {
        const openOrders = await exchangePair.getActiveOrders();
        const openBuyOrders = openOrders.filter((order) => order.side == 'buy');
        const openSellOrders = openOrders.filter((order) => order.side == 'sell');
        const ticker = exchangePair.getTicker()
        const { bidPrice, askPrice, lastPrice} = ticker;
        if (!position || (position && position.positionAmount == 0)) {
            if (openOrders.length > 1 || (openSellOrders.length === 0 && openOrders.length == 1)) {
                await exchangePair.cancelActiveOrders();
                await this.futuresCreateOrder(exchangePair, amount, 'sell', options);
                return;
            }

            if (openSellOrders.length === 1 && openOrders.length == 1) {
                const order = openOrders[0];
                const orderPrice = parseFloat(order.price)
                //{checkSomeStopSellLimitConfluence}
                // it helped to fix when an already stop buy limit order is placed
                const checkSomeStopSellLimitConfluence = orderPrice < bidPrice && (order.type == 'stop'|| order.type == 'stop_market');
                if (orderPrice > askPrice || checkSomeStopSellLimitConfluence) {
                    await exchangePair.cancelActiveOrders();
                    await this.futuresCreateOrder(exchangePair, amount, 'sell', options);
                    return;
                }
            }
            // Return if no funds available
            if (!position && !fundsAvailable) return;
            if (openOrders.length < 1) {
                await this.futuresCreateOrder(exchangePair, amount, 'sell', options)
                return;
            }
        }

        if (position) {
            const { positionSide, positionAmount, leverage } = position;
            const remainingAmount = parseFloat(amount) - parseFloat(positionAmount);
            const { min: minimumAmountLimit, max: maximumAmountLimit } = exchangePair.info.limits.amount;
            const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision;
            const rePrecisedAmount =  parseFloat(remainingAmount.toFixed(amountPrecision))

            if (positionSide === 'SHORT') {
                if (rePrecisedAmount < minimumAmountLimit ) return;
                if (rePrecisedAmount > minimumAmountLimit ) {
                    const { base, quote} = exchangePair.info;
                    if (openSellOrders.length > 0) {
                        for (const order of openSellOrders) {
                            await exchangePair.cancelActiveOrders(order.id);
                        }
                    }
                    const quoteBalance = await exchangePair.getBalance(quote);
                    if (parseFloat(quoteBalance.free) > ((rePrecisedAmount * lastPrice) / parseInt(leverage)) ) {
                        await this.futuresCreateOrder(exchangePair, rePrecisedAmount, 'sell', options);
                        return;
                    }
                }
            }

            const self = this;
            async function recreateOrder() {
                const remAmount = amount - parseFloat(positionAmount);
                if (remAmount > 0) {
                    const remAmountToQuote = (remAmount * lastPrice) / parseInt(leverage);
                    const { quote } = exchangePair.info;
                    const quoteBalance = await exchangePair.getBalance(quote);
                    let newAmount;
                    if (remAmountToQuote < quoteBalance.free) {
                        newAmount = parseFloat((parseFloat(amount) * 2).toFixed(amountPrecision))
                    } else {
                        newAmount = parseFloat((parseFloat(positionAmount) * 2).toFixed(amountPrecision))
                    }
                    await self.futuresCreateOrder(exchangePair, newAmount, 'sell', options);
                    return;
                }

                const newAmount = parseFloat((parseFloat(positionAmount) * 2).toFixed(amountPrecision))
                await self.futuresCreateOrder(exchangePair, newAmount, 'sell', options);
                return;
            }
            
            if (positionSide === 'LONG') {
                if (openOrders.length > 1 || (openSellOrders.length === 0 && openOrders.length == 1)) {
                    await exchangePair.cancelActiveOrders();
                    await recreateOrder();
                }
                if (openSellOrders.length == 1) {
                    const order = openSellOrders[0];
                    const orderPrice = parseFloat(order.price);
                    //{checkSomeStopSellLimitConfluence}
                    // it helped to fix when an already stop buy limit order is placed
                    const checkSomeStopSellLimitConfluence = orderPrice < bidPrice && (order.type == 'stop'|| order.type == 'stop_market');
                    if (orderPrice < bidPrice || checkSomeStopSellLimitConfluence) {
                        await exchangePair.cancelActiveOrders();
                        await recreateOrder()
                        return;
                    }
                }

                if (openOrders.length < 1) {
                    await recreateOrder()
                    return;
                }
            }
        }
    }
    

    async resetPositionsToOne (positions, exchangePair) {
        const mostProfitablePosition = positions.reduce((prev, next) => {
            if (prev.unRealizedProfit >= next.unRealizedProfit) {
                return prev;
            }
            return next;
        })

        for (const position of positions) {
            const check1 = mostProfitablePosition.unRealizedProfit == position.unRealizedProfit;
            const check2 = mostProfitablePosition.liquidationPrice == position.liquidationPrice;
            if (!check1 || !check2) {
                await this.futuresForceClose(position, exchangePair);
            }
        }
        return mostProfitablePosition;
    }

    async futuresForceClose(position, exchangePair) {
        await exchangePair.cancelActiveOrders();
        await this.delay(2500);
        const { positionAmount, positionSide } = position;
        if (positionAmount == 0) return;
        const amount = Math.abs(positionAmount);
        if (positionSide == 'LONG') {
            await exchangePair.createMarketOrder('sell', amount);
        } else {
            await exchangePair.createMarketOrder('buy', amount);
        }
        await this.delay();
        return;
    }

    async futuresClose(position, exchangePair, options) {
        if (!position || (position && position.positionAmount == 0)) return;
        await exchangePair.cancelActiveOrders();
        await this.delay(3000);
        // Refetching Positions to Check for Already Filled Orders
        // To prevent creating a new Position --Fixing that bug
        const refetchedPositions = await exchangePair.getPositions();
        let newRefetchedPosition = refetchedPositions[0];
        if (newRefetchedPosition) {
            const { positionAmount, positionSide } = newRefetchedPosition;
            const amount = Math.abs(positionAmount);
            if (positionSide == 'LONG') {
                await this.futuresCreateOrder(exchangePair, amount, 'sell', options);
            } else {
                await this.futuresCreateOrder(exchangePair, amount, 'buy', options);
            }
            await this.delay();
            return;
        }
    }

    async futuresCreateOrder(exchangePair, amount, side, options) { //side: 'sell' or 'buy'
        const orderType = options.trade["order_type"];
        if (orderType == 'market') {
            const sellDetails = await exchangePair.createMarketOrder(side, amount);
            await this.delay();
            if (sellDetails) {
                this.notifyCreatedOrder({side, amount})
            }
        }

        if (orderType == 'limit') {
            const ticker = await exchangePair.getTicker()
            const { bidPrice, askPrice, lastPrice} = ticker;
            const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision
            let price;
            if (side == 'buy') {
                price = parseFloat((lastPrice < askPrice && lastPrice > bidPrice ? lastPrice : bidPrice).toFixed(pricePrecision))
            } else {
                price = parseFloat((lastPrice < askPrice && lastPrice > bidPrice ? lastPrice : askPrice).toFixed(pricePrecision))
            }
            const orderDetails = await exchangePair.createLimitOrder(side, amount, price);
            await this.delay();
            if (orderDetails) {
                this.notifyCreatedOrder({side, amount, price})
            }
        }
        return;
    }

    async runAdvice(advice, exchangePair, amount, options) {
        const {signal, price} = advice;
        const advicePrice = parseFloat(price);
        if (!['long', 'short', 'close', 'stoploss', 'take_profit'].includes(signal)) {
            throw `Invalid signal:${signal}`;
        }
        const ticker = await exchangePair.getTicker()
        const { bidPrice, askPrice, lastPrice} = ticker;
        const { base, quote} = exchangePair.info;
        const { min: minimumAmountLimit, max: maximumAmountLimit } = exchangePair.info.limits.amount;
        const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision
        const baseBalance = await exchangePair.getBalance(base);
        if (!baseBalance) throw new Error('Error fetching base balance');
        const remainingBal = amount - baseBalance.total;
        const openOrders = await exchangePair.getActiveOrders();
        if (!openOrders) throw new Error('Error fetching open orders');
        const openSellOrders = openOrders.filter((order) => order.side == 'sell');
        const openBuyOrders = openOrders.filter((order) => order.side == 'buy');
        const tradingPrice = parseFloat((advicePrice).toFixed(pricePrecision))
        if (signal == 'long') {
            if (remainingBal < minimumAmountLimit) return;
            const buyingAmount = parseFloat((remainingBal).toFixed(amountPrecision));
            if (openBuyOrders.length === 1) {
                const order = openBuyOrders[0];
                const orderPrice = parseFloat(order.price);
                if (advicePrice < orderPrice) return;
                await exchangePair.cancelActiveOrders(order.id);
                await exchangePair.createLimitOrder('buy', buyingAmount, tradingPrice);
                await this.delay();
                return;
            }

            if (openBuyOrders.length < 1) {
                if (tradingPrice > bidPrice) return
                await exchangePair.createLimitOrder('buy', buyingAmount, tradingPrice);
                await this.delay();
            }
        }

        if (signal == 'short' || signal == 'close') {
            if (baseBalance.total < minimumAmountLimit) return;
            const sellingAmount = parseFloat(parseFloat(baseBalance.total).toFixed(amountPrecision))
            if (openSellOrders.length === 1) {
                const order = openSellOrders[0];
                const orderPrice = parseFloat(order.price);
                if (advicePrice > orderPrice) return;
                await exchangePair.cancelActiveOrders(order.id);
                await exchangePair.createLimitOrder('sell', sellingAmount, tradingPrice);
                await this.delay();
                return;
            }
            if (openBuyOrders.length < 1) {
                if (tradingPrice < askPrice) return
                await exchangePair.createLimitOrder('sell', sellingAmount, tradingPrice)
                await this.delay();
                return;
            }
        }
    }

    async runShort(exchangePair, options) {
        const orderType = options.trade["order_type"] // 'limit' or 'market
        const { base, quote} = exchangePair.info;
        const baseBalance = await exchangePair.getBalance(base);

        const { min: minimumAmountLimit, max: maximumAmountLimit } = exchangePair.info.limits.amount;
        const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision

        if (parseFloat(baseBalance.total)  < minimumAmountLimit) return;

        const openOrders = await exchangePair.getActiveOrders();
        if (!openOrders) throw new Error('Error fetching open orders');
        const openSellOrders = openOrders.filter((order) => order.side == 'sell');

        const sellingAmount = parseFloat(parseFloat(baseBalance.total).toFixed(amountPrecision))

        async function cancelAllSellOrders() {
            for (const order of openOrders) {
                if (order.side == 'buy') {
                    await exchangePair.cancelActiveOrders(order.id);
                    await this.delay();
                }
            }
        }

        async function createTheSellOrder() {
            const baseBalance = await exchangePair.getBalance(base);
            const sellingAmount = parseFloat(parseFloat(baseBalance.total).toFixed(amountPrecision))
            if (orderType == 'market') {
                const sellDetails = await exchangePair.createMarketOrder('sell', sellingAmount);
                if (sellDetails) {
                    this.notifyCreatedOrder({side: 'sell', amount: sellingAmount})
                }
                await this.delay();
            }

            if (orderType == 'limit') {
                const ticker = await exchangePair.getTicker();
                const { bidPrice, askPrice, lastPrice} = ticker;
                const sellingPrice = parseFloat((lastPrice < askPrice && lastPrice > bidPrice ? lastPrice : askPrice).toFixed(pricePrecision))
                const sellDetails = await exchangePair.createLimitOrder('sell', sellingAmount, sellingPrice);
                if (sellDetails) {
                    this.notifyCreatedOrder({side: 'sell', amount: sellingAmount, price:sellingPrice })
                }
                await this.delay();
            }
            return;
        }

        if (openSellOrders.length > 1) {
            await cancelAllSellOrders();
            await createTheSellOrder();
            return;
        }

        if (openSellOrders.length < 1) {
            await createTheSellOrder();
            return;
        }

        if (openSellOrders.length === 1) {
            const order = openOrders.find((order) => order.side == 'sell');
            const orderPrice = parseFloat(order.price)
            if (orderPrice > askPrice ) {
                await cancelAllSellOrders();
                await createTheSellOrder();
                return;
            }
        } 
    }

    async runLong(exchangePair, requiredAmount, options) {
        const orderType = options.trade["order_type"] // 'limit' or 'market
        const { base, quote} = exchangePair.info;
        const baseBalance = await exchangePair.getBalance(base);
        const self = this;

        // const {total, free, locked } = baseBalance;
        if (!baseBalance) throw new Error('Error fetching base balance');
        const remainingBal = requiredAmount - baseBalance.total;

        const { min: minimumAmountLimit, max: maximumAmountLimit } = exchangePair.info.limits.amount;
        if (remainingBal < minimumAmountLimit) return;

        const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision
        const { min: minimumPriceLimit, max: maximumPriceLimit } = exchangePair.info.limits.price;

        const buyingAmount = parseFloat((remainingBal).toFixed(amountPrecision))
        if (buyingAmount < minimumAmountLimit && buyingAmount > maximumAmountLimit) throw new Error('Buying amount is not within limit');

        const openOrders = await exchangePair.getActiveOrders();
        if (!openOrders) throw new Error('Error fetching open orders');
        const openBuyOrders = openOrders.filter((order) => order.side == 'buy')

        const ticker = await exchangePair.getTicker()
        const { bidPrice, askPrice, lastPrice} = ticker;

        async function cancelAllBuyOrders() {
            for (const order of openOrders) {
                if (order.side == 'buy') {
                    await exchangePair.cancelActiveOrders(order.id)
                    await self.delay();
                }
            }
        }
        async function createTheBuyOrder() {
            const quoteBalance = await exchangePair.getBalance(quote);
            if ((remainingBal * lastPrice) > quoteBalance.free) return;
            if (orderType == 'market') {
                const buyDetails = await exchangePair.createMarketOrder('buy', buyingAmount);
                if (buyDetails) {
                    this.notifyCreatedOrder({side: 'buy', amount: buyingAmount })
                }
                await self.delay();
            }

            if (orderType == 'limit') {
                const ticker = await exchangePair.getTicker()
                const { bidPrice, askPrice, lastPrice} = ticker;
                const buyingPrice = parseFloat((lastPrice < askPrice && lastPrice > bidPrice ? lastPrice : bidPrice).toFixed(pricePrecision))
                const buyDetails = await exchangePair.createLimitOrder('buy', buyingAmount, buyingPrice);
                if (buyDetails) {
                    this.notifyCreatedOrder({side: 'buy', amount: buyingAmount, price: buyingPrice })
                }
                await self.delay();
            }
            return;
        }

        const moreThanTwoOpenBuyOrders = openBuyOrders.length > 1;
        if (moreThanTwoOpenBuyOrders) {
            await cancelAllBuyOrders();
            await createTheBuyOrder();
            return;
        }

        const noBuyOrder = openBuyOrders.length < 1;
        if (noBuyOrder) {
            await createTheBuyOrder();
            return;
        }

        const oneBuyOrder = openBuyOrders.length == 1;
        if (oneBuyOrder) {
            const order = openOrders.find((order) => order.side == 'buy');
            const orderPrice = parseFloat(order.price)
            if (orderPrice < bidPrice ) {
                await cancelAllBuyOrders();
                await createTheBuyOrder();
                return;
            }
        }

    }

}

module.exports = OrderExecutor;
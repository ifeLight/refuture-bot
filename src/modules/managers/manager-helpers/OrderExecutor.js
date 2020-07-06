module.exports = class OrderExecutor {
    constructor({logger, eventEmitter, notifier}) {

    }

    async execute(signalResult, exchangePair, options) {
        try {
            const tradeOptions = options.trade;
            const lastPrice = exchangePair.getLastPrice();
            let amount;
    
            if (tradeOptions.amount) {
                amount = parseFloat(tradeOptions.amount)
            } else if (tradeOptions['capital_amount']) {
                const capitalAmount = parseFloat(tradeOptions['capital_amount']);
                amount = capitalAmount / parseFloat(lastPrice)
            } else {
                return;
            }

            const { taker: takerFee, maker: makerFee } = exchangePair.info.fees;
            const { amount: amountPrecision, price: pricePrecision } = exchangePair.info.precision
            const { min: minimumAmountLimit, max: maximumAmountLimit } = exchangePair.info.limits.amount;
            const { min: minimumPriceLimit, max: maximumPriceLimit } = exchangePair.info.limits.price;

            // Return when the amount is bad or low
            const exchangeAmountFigure = parseFloat((amount - (parseFloat(takerFee) * amount)).toFixed(amountPrecision));
            if (exchangeAmountFigure < minimumAmountLimit || exchangeAmountFigure > maximumAmountLimit) {
                throw new Error('Insufficient or bad amount');
                return;
            }

            //Return when no advice and signal
            if (!signalResult.getSignal() || !signalResult.getOrderAdvice()) return;
            
            // If it is Futures, run Futures Order Execution
            const isFutures = exchangePair.exchange.isFutures;
            if (isFutures) {
                return await this.executeFutures(signalResult, exchangePair, amount)
            }  
            const { base, quote} = exchangePair.info;
            const baseBalance = await exchangePair.getBalance(base);
            const quoteBalance = await exchangePair.getBalance(quote);

            if (signalResult.getSignal()) {
                signal = signalResult.getSignal()
                if (signal == 'long') {
                    await this.runLong(exchangePair, amount, options);
                }

                if (signal == 'close' || signal == 'short') {
                    await this.runShort(exchangePair);
                }
            } else if (signalResult.getOrderAdvice()) {
                await this.runAdvice();
            }
        } catch (error) {
            this.logger(`Execute Order: Failed to execute Order [${exchangePair.symbol} (${error.message})]`)
        }
    }

    async executeFutures(signalResult, exchangePair, options) {
        const positions = await exchangePair.getPositions();

    }

    async resetPositionsToOne (positions) {
        if (positions.length < 2) return;

    }

    async isLong() {

    }

    async isShort() {

    }

    async isClose() {

    }

    async runAdvice() {}

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
                    await exchangePair.cancelActiveOrders(order.id)
                }
            }
        }

        async function createTheSellOrder() {
            const baseBalance = await exchangePair.getBalance(base);
            const sellingAmount = parseFloat(parseFloat(baseBalance.total).toFixed(amountPrecision))
            if (orderType == 'market') {
                const sellDetails = await exchangePair.createMarketOrder('sell', sellingAmount);
            }

            if (orderType == 'limit') {
                const ticker = exchangePair.getTicker()
                const { bidPrice, askPrice, lastPrice} = ticker;
                const sellingPrice = parseFloat((lastPrice < askPrice && lastPrice > bidPrice ? lastPrice : askPrice).toFixed(pricePrecision))
                const sellDetails = await exchangePair.createLimitOrder('sell', sellingAmount, sellingPrice);
                
            }
            // TODO - A Notifier
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

        if (openSellOrders.length > 1) {
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

        const ticker = exchangePair.getTicker()
        const { bidPrice, askPrice, lastPrice} = ticker;

        const buyingPrice = parseFloat((lastPrice < askPrice && lastPrice > bidPrice ? lastPrice : bidPrice).toFixed(pricePrecision))

        async function cancelAllBuyOrders() {
            for (const order of openOrders) {
                if (order.side == 'buy') {
                    await exchangePair.cancelActiveOrders(order.id)
                }
            }
        }
        async function createTheBuyOrder() {
            const quoteBalance = await exchangePair.getBalance(quote);
            if ((remainingBal * lastPrice) > quoteBalance.free) return;
            if (orderType == 'market') {
                const buyDetails = await exchangePair.createMarketOrder('buy', buyingAmount);
            }

            if (orderType == 'limit') {
                const ticker = exchangePair.getTicker()
                const { bidPrice, askPrice, lastPrice} = ticker;
                const buyingPrice = parseFloat((lastPrice < askPrice && lastPrice > bidPrice ? lastPrice : bidPrice).toFixed(pricePrecision))
                const buyDetails = await exchangePair.createLimitOrder('buy', buyingAmount, buyingPrice);
                
            }
            // TODO - A Notifier
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
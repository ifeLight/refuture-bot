module.exports = class Position {
    constructor({symbol, positionAmount, entryPrice, liquidationPrice, leverage, unRealizedProfit, marginType}) {
        this.symbol = symbol;
        this.positionAmount = parseFloat(positionAmount);
        this.entryPrice = parseFloat(entryPrice);
        this.liquidationPrice = parseFloat(liquidationPrice);
        this.leverage = parseInt(leverage);
        this.unRealizedProfit = parseFloat(unRealizedProfit);
        this.marginType = marginType;
        this.positionSide = this.entryPrice >= liquidationPrice ? 'LONG' : 'SHORT';
    }

    // closePosition () {}
    // changeToLongPosition() {}
    // changeToShortPosition() {}
}
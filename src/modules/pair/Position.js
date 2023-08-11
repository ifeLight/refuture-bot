module.exports = class Position {
    constructor({symbol, positionAmount, entryPrice, liquidationPrice, leverage, unRealizedProfit, marginType, positionSide}) {
        this.symbol = symbol;
        this.positionAmount = parseFloat(Math.abs(positionAmount)); //Remove Negativity
        this.entryPrice = parseFloat(entryPrice);
        this.liquidationPrice = parseFloat(liquidationPrice);  // Still on check might not be there
        this.leverage = parseInt(leverage);
        this.unRealizedProfit = parseFloat(unRealizedProfit);
        this.marginType = marginType;
        this.positionSide = positionSide // this.entryPrice >= liquidationPrice ? 'LONG' : 'SHORT'; //Can be LONG or SHORT or BOTH
    }

    // closePosition () {}
    // changeToLongPosition() {}
    // changeToShortPosition() {}
}
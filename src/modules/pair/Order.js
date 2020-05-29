module.exports = class Order {
    constructor({type, time, id, symbol, price, side, amount, filled, remaining, status}) {
        this.time = time;
        this.id = id;
        this.symbol = symbol;
        this.price = price;
        this.status = status ; // is either 'open' or 'closed'
        this.side = side; //Either 'sell' or 'buy'
        this.type = type; // Either 'limit' or 'market' or any other one in the future
        this.amount = amount;
        this.filled = filled;
        this.remaining = remaining;
    }
}
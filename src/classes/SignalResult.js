const _ = require('lodash');

/**
 * Part of the code, gotten from crypto trading bot- Github
 */

module.exports = class SignalResult {
  constructor() {
    this._debug = {};
    this._signal = undefined;
    this._tag = undefined;
    this._orderAdvice = undefined;
  }

  mergeDebug(debug) {
    this._debug = _.merge(this._debug, debug);
  }

  setTag(tag) {
    this._tag = tag;
  }

  getTag() {
    return this._tag;
  }

  setSignal(signal) {
    if (!['long', 'short', 'close'].includes(signal)) {
      throw `Invalid signal:${signal}`;
    }

    this._signal = signal;
  }

  addDebug(key, value) {
    if (typeof key !== 'string') {
      throw 'Invalid key';
    }

    this._debug[key] = value;
  }

  getDebug() {
    return this._debug;
  }

  getSignal() {
    return this._signal;
  }

  setOrderAdvice(signal, price) {
    if (!['long', 'short', 'close', 'stoploss', 'take_profit'].includes(signal)) {
      throw `Invalid signal:${signal}`;
    }
    this._orderAdvice = {
      signal,
      price
    }
  }

  getOrderAdvice() {
    return this._orderAdvice;
  }

  static createSignal(signal, debug = {}) {
    const result = new SignalResult();

    result.setSignal(signal);
    result.mergeDebug(debug);

    return result;
  }

  static createEmptySignal(debug = {}) {
    const result = new SignalResult();

    result.mergeDebug(debug);

    return result;
  }

  static createAdvice(signal, price) {
    const result = new SignalResult();
    result.setOrderAdvice(signal, price);
    return result;
  }
};

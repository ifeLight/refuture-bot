const IndicatorManager = require('./IndicatorManager');
const PolicyManger = require('./PolicyManager');
const InsuranceManager = require('./InsuranceManager');
const SafetyManager = require('./SafetyManager');
const WatchdogManager = require('./WatchdogManager');
const ExchangeManager = require('./ExchangeManager');

const ExchangePair = require('../pair/ExchangePair')

class StrategyManager {
    constructor ({eventEmitter, logger}) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
    }

    add() {

    }

    getList() {

    }

    async init() {
        this.indicatorManager = new IndicatorManager();
        this.policyManger = new PolicyManger();
        this.insuranceManager = new InsuranceManager();
        this.safetyManager = new SafetyManager();
        this.watchdogManager = new WatchdogManager();
        this.exchangeManager = new ExchangeManager();

        // NOTE Remember to set up ExchngePair for each Symbol
    }

    async setExchangePair() {

    }

    async runStrategies() {}

    async runStrategy(){}

}
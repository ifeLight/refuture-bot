const { exchangeManager, candlesRepository } = require('../../services/preService')

class CandlesCtrl {
    static async getCandles(req, res) {
        try {
            let {
                exchange: exchangeName = 'binance', 
                symbol = 'BTC/USDT', 
                startDate, 
                endDate = new Date().getTime(),
                period = '5m'
            } = req.query;

            console.log('-----API-----')
            console.log(req.query)

            if (!startDate) {
                let tTime = new Date();
                tTime.setDate(tTime.getDate() - 1)
                startDate = tTime.getTime()
            }

            console.log(`Setup Precheck: ${exchangeManager.setupDone}`)

            if (!exchangeManager.setupDone) {
                await exchangeManager.setup();
            }

            console.log(`Setup Postcheck: ${exchangeManager.setupDone}`)

            const exchange = exchangeManager.find(exchangeName);
            if (!exchange) {
                return res.status(400).json({message: 'Invalid exchange name'})
            }

            //To work on date that the query was a Stringified Number
            if (!(new Date(startDate).getTime())) {
                startDate = new Date(Number(startDate)).getTime();
            }
            if (!(new Date(endDate).getTime() == NaN)) {
                endDate = new Date(Number(endDate)).getTime();
            }

            const dateObj =  {
                startTime: new Date(startDate).getTime(),
                endTime: new Date(endDate).getTime()
            }

            console.log(dateObj)
            console.log('Query Started');

            const response = await candlesRepository.fetchCandlesByTimeDifference({
                exchange, symbol, period,
                ...dateObj
            });

            console.log(response && response.length ? 'Response Length: ' + response.length: 'No response')

            return res.status(200).json(response);
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: true,
                message: "An error occured"
            })
        }
    }

}

module.exports =  CandlesCtrl;
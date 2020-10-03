const BacktestModel = require('../../models/Backtest')

class BacktestCtrl {
    static async getBacktestList(req, res) {
        try {
            let {page = 1, limit = 30} = req.query;

            if (limit > 100) {
                limit = 100;
            }

            const result = await BacktestModel.paginate({}, {
                page,
                limit,
                select: '_id symbol exchange createdAt balance',
                sort: { createdAt: -1 }
            })

            return res.status(200).json(result.docs);
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: true,
                message: "An error occured"
            })
        }
    }

    static async getBacktest(req, res) {
        try {
            const { id } = req.params;
            console.log(req.params)
            const result = await BacktestModel.findById(id);
            console.log(result);
            return res.status(200).json(result);
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: true,
                message: "An error occured"
            })
        }
    }

}

module.exports =  BacktestCtrl;
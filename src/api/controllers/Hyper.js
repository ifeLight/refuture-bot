const HyperModel = require('../../models/Hyper')

class HyperCtrl {
    static async getHyperList(req, res) {
        try {
            let {page = 1, limit = 30} = req.query;

            if (limit > 100) {
                limit = 100;
            }

            const result = await HyperModel.paginate({}, {
                page,
                limit,
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

    static async getHyper(req, res) {
        try {
            const { id } = req.params;
            const result = await HyperModel.findById(id);
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

module.exports =  HyperCtrl;
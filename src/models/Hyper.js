const mongoosePaginate = require('mongoose-paginate-v2');

const mongoose  = require('../providers/Mongo')
const config = require('config');
const logger = require('../utils/logger');
const { duration } = require('moment');

const Types = mongoose.Schema.Types;

const hyperSchema = mongoose.Schema({
    parameters: Types.Mixed,
    argmin: Types.Mixed,
    argmax: Types.Mixed,
    optimizationParameter: String,
    space: Types.Mixed,
    override: Types.Mixed,
    duration: Number, // Duration in Hours
    averageRuntime: Number, // In Minutes
    maximumIteration: Number,
    indicator: Types.Mixed,
    safeties: Types.Mixed
},{ timestamps: { 
    createdAt: 'createdAt', 
    updatedAt : "updatedAt" 
}});

hyperSchema.plugin(mongoosePaginate);

const HyperModel = mongoose.model('Hyper', hyperSchema);

module.exports = HyperModel;
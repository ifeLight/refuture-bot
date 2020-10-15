<template>
<vx-card :title="title">
    <div>
        <div :id="chartId"></div>
    </div>
</vx-card>  
</template>

<script>
import { createChart } from 'lightweight-charts';
import queryString  from 'query-string';

export default {
    props: ['title', 'trades', 'options'],
    data () {
        return {
            chart: undefined,
            chartId: 'tradesCandleChart',
            candleSeries: [],
            candles: [],
            markers: [],
        }
    },
    methods: {
        notifyError(message) {
            this.$vs.notify({icon: 'error', title: "Error", color: 'danger', text: message})
        },
        dateToChartTimeMinute(date) {
            return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), 0, 0);
        },
        addCandles(options) {
            if (options && options !== null && options !== undefined) {
                const stringified = queryString.stringify(options)
                this.$http.get('/api/candles?'+ stringified).then((response) => {
                    const data = response.data;
                    const candles = [];
                    data.forEach((candle) => {
                        const {time} = candle;
                        const d = new Date(Number(time));
                        candles.push({
                            ...candle,
                            time: new Date(this.dateToChartTimeMinute(d)).getTime() / 1000,
                        })
                    })
                    this.candles = candles
                    this.candleSeries.setData(candles)
                    this.candleSeries.setMarkers(this.createMarkers())
                }).catch((err) => {
                    this.notifyError(err.message)
                })
            }
        },
        createMarkers() {
            const trades = this.trades;
            const markers = [];
            if (trades && Array.isArray(trades)) {
                trades.forEach((trade) => {
                    if (trade.type == 'long') {
                        markers.push({
                            time: new Date(this.dateToChartTimeMinute(new Date(trade.entryTime))).getTime() / 1000,
                            position: 'belowBar',
                            shape : 'arrowUp',
                            color: 'green',
                            text: `Long ${trade.entry}`
                        })
                    } else {
                        markers.push({
                            time: new Date(this.dateToChartTimeMinute(new Date(trade.entryTime))).getTime() / 1000,
                            position: 'aboveBar',
                            shape : 'arrowDown',
                            color: 'red',
                            text: `Short ${trade.entry}`
                        })
                    }
                    markers.push({
                        time: new Date(this.dateToChartTimeMinute(new Date(trade.closeTime))).getTime() / 1000,
                        position: 'inBar',
                        shape : 'circle',
                        color: 'blue',
                        text: `Close ${trade.close}(${Number(trade.profit).toFixed(2)})`
                    })
                })
            }
            this.markers = markers;
            return markers;
        }
    },
    watch: {
        options(options) {
            this.addCandles(options);
        }
    },
    mounted() {
        this.chart = createChart(document.getElementById(this.chartId), { 
            height: 450, 
            timeScale: {
                timeVisible: true,
                borderColor: '#D1D4DC',
            }, 
        });
        this.candleSeries = this.chart.addCandlestickSeries();
        this.addCandles(this.options);
    }
}
</script>

<style>

</style>
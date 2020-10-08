<template>
  <div>
    <vx-card title="Backtest Single">
      {{$route.params.id}}
    </vx-card>
    <br>
    <div class="vx-row">
      <div class="vx-col w-1/2 md:w-1/2 xl:w-1/3">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="statistics.roi + '%'"
                  statisticTitle="RoI" />
        </div>
        <div class="vx-col w-1/2 md:w-1/2 xl:w-1/3">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="statistics.winRate"
                  statisticTitle="Win Rate" />
        </div>
        <div class="vx-col w-1/2 md:w-1/2 xl:w-1/3">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="statistics.trades"
                  statisticTitle="Total Trades" />
        </div>
        <div class="vx-col w-1/2 md:w-1/2 xl:w-1/3">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="statistics.maximumProfit + '%'"
                  statisticTitle="Maximum Profit" />
        </div>
        <div class="vx-col w-1/2 md:w-1/2 xl:w-1/3">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="statistics.maximumLoss + '%'"
                  statisticTitle="Maximum Loss" />
        </div>
        <div class="vx-col w-1/2 md:w-1/2 xl:w-1/3">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="statistics.maximumDrawdown + '%'"
                  statisticTitle="Maximum Drawdown" />
        </div>
  </div>
    <br>
    <object-table title="Basic Info" :data="info"></object-table>
    <br>
    <object-table title="Uncompleted Trade" :data="uncompletedTrade"></object-table>
    <br>
    <strategies-list :list="indicators" title="Indicators" type="Indicator"></strategies-list>
    <br>
    <strategies-list :list="safeties" title="Safeties" type="Safeties"></strategies-list>
    <br>
  <trades-table :trades="trades" title="Trades Completed"></trades-table>
  <br>
  </div>
</template>

<script>
import dayjs from 'dayjs';

import StategiesList from '../components/StrategiesList.vue';
import ObjectTable from '../components/ObjectTable.vue';
import TradesTable from '../components/TradesTable.vue';
import StatisticsCardLine from '@/components/statistics-cards/StatisticsCardLine.vue';

export default {
    components: {
        StatisticsCardLine,
        'strategies-list': StategiesList,
        'object-table' : ObjectTable,
        'trades-table': TradesTable,
    },
    mounted () {
        const id = this.$route.params.id;
        if (!id) {
            this.notifyError('Error Fetching Data - No ID given');
            return;
        }
        this.id = id;
        this.fetchBacktest(id);
    },
    data () {
        return {
            id :null,
            safeties: null,
            indicators: null,
            info : {},
            trades: [],
            statistics: {},
            uncompletedTrade: {},
        }
    },
    methods: {
        notifyError(message) {
            this.$vs.notify({icon: 'error', title: "Error", color: 'danger', text: message})
        },
        openLoading () {
        this.$vs.loading();
        },
        closeLoading () {
            this.$vs.loading.close();
        },
        fetchBacktest(id) {
            this.openLoading();
            this.$http.get(`/api/backtest/${id}`)
            .then((response) => {
                this.closeLoading();
                const data = response.data;
                const { trades, indicators, safeties, profitTrades, unprofitTrades } = data;
                this.trades = trades;
                this.safeties = safeties;
                this.indicators = indicators;
                this.info = {
                    symbol: data.symbol,
                    exchange: data.exchange,
                    startingBalance: Number(data.amount).toFixed(2),
                    finalBalance: Number(data.balance).toFixed(2),
                    maximumBalance: Number(data.maximumBalance).toFixed(2),
                    minimumBalance: Number(data.minimumBalance).toFixed(2),
                    leverage: data.leverage,
                    exchangeFee: data.exchangeFee,
                    stoploss: data.stopLoss,
                    takeProfit: data.takeProfit,
                    orderType: data.orderType,
                    totalTradesCompleted: data.totalTrades,
                    profitTrades: data.profitTrades,
                    unprofitTrades: data.unprofitTrades,
                    startDate: dayjs(new Date(data.startDate)).format('DD-MM-YYYY/HH:mm:ss'),
                    endDate: dayjs(new Date(data.endDate)).format('DD-MM-YYYY/HH:mm:ss'),
                    dateAdded: dayjs(new Date(data.createdAt)).format('DD-MM-YYYY/HH:mm:ss')
                },
                this.statistics = {
                    roi: Number((data.roi || 0)).toFixed(2),
                    winRate: ((parseInt(profitTrades) / (parseInt(unprofitTrades) + parseInt(profitTrades))) * 100).toFixed(1),
                    maximumProfit: Number(data.maximumProfit).toFixed(2),
                    maximumLoss: Number(data.maximumLoss).toFixed(2),
                    maximumDrawdown: Number(data.maximumDrawdown).toFixed(2),
                    trades: data.trades.length,
                }

                this.uncompletedTrade = {
                    entryTime: dayjs(new Date(data.entryTime)).format('DD-MM-YYYY/HH:mm:ss'),
                    positionType: data.positionType,
                    positionPrice: data.positionEntry
                }


            })
            .catch((err) => {
                this.closeLoading();
                this.notifyError(err.message)
            })
        }
    }
}
</script>

<style>


</style>
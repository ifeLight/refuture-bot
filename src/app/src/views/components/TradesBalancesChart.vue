<template>
  <vx-card :title="title">
    <template>
    <vue-apex-charts type="line" height="350" :options="chartOptions" :series="series"></vue-apex-charts>
    </template>
  </vx-card>
</template>

<script>
import VueApexCharts from "vue-apexcharts";

export default {
  components: {
    VueApexCharts
  },
  data() {
    return {
      series: [
        {
          name: "Balances",
          data: []
        }
      ],
      chartOptions: {
        chart: {
          height: 300,
          zoom: {
            enabled: false
          }
        },
        // colors: themeColors,
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: "straight"
        },
        title: {
          text: "Balances Variation",
          align: "left"
        },
        grid: {
          row: {
            colors: ["#f3f3f3", "transparent"], // takes an array which will be repeated on columns
            opacity: 0.5
          }
        },
        xaxis: {
          type: 'datetime',
            categories: [],
        }
      }
    };
  },
  props: ["trades", 'title'],
  watch: {
    trades(trades) {
      this.recreate(trades);
    }
  },
  methods: {
    recreateSeries(trades) {
        let bal = [];
        trades.forEach((trade) =>{
            bal.push(Number(trade.currentBalance).toFixed(2))
        })
        this.series = [{
            name: "Balances",
            data: bal
        }]
    },
    recreateXaxis(trades) {
        let cat = [];
        trades.forEach((trade) => {
            cat.push(trade.closeDate)
        })
        let xaxis = {
            type: 'datetime',
            categories: cat,
        };
        this.chartOptions = {...this.chartOptions, ...{xaxis}}
    },
    recreate(trades) {
        if (trades && Array.isArray(trades)){
            this.recreateSeries(trades);
            this.recreateXaxis(trades);
      }
    }
  },
  created() {
      this.recreate(this.trades);
  }
};
</script>

<style></style>

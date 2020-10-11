<template>
  <vx-card :title="title">
    <template>
    <vue-apex-charts type="line" :options="chartOptions"  :series="series"></vue-apex-charts>
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
          name: "Profits",
          data: []
        }
      ],
      chartOptions: {
        chart: {
          height: 400,
          zoom: {
            enabled: true
          }
        },
        markers: {
            size: 1,
        },
        // colors: themeColors,
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: "straight"
        },
        title: {
          text: "Profits Variation %",
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
            bal.push(Number(trade.profitInPercentage).toFixed(2))
        })
        this.series = [{
            name: "Profits%",
            data: bal
        }]
    },
    recreateXaxis(trades) {
        let cat = [];
        trades.forEach((trade) => {
            cat.push(new Date(trade.closeDate))
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

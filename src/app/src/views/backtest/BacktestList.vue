<template>
  <div>
    <vx-card title="Backtest List" id="backtest-list-container">
      <p>View the List of backtest Completed</p>
      <br>

      <vs-table :data="backtests" v-model="selected" @selected="handleSelected" >
        <template slot="thead">
          <vs-th>Symbol</vs-th>
          <vs-th>Exchange</vs-th>
          <vs-th>RoI (%)</vs-th>
          <vs-th>Start Date</vs-th>
          <vs-th>End Date</vs-th>
          <vs-th>Leverage</vs-th>
        </template>

        <template slot-scope="{ data }">
          <vs-tr :data="tr" :key="indextr" v-for="(tr, indextr) in data" :state="tr.roi > 50 ? 'success': tr.roi < -50 ? 'danger': ''" @click="alert('sss')">
            <vs-td :data="data[indextr].symbol">
              {{ data[indextr].symbol }}
            </vs-td>
            <vs-td :data="data[indextr].exchange">
              {{ data[indextr].exchange }}
            </vs-td>
            <vs-td :data="data[indextr].roi">
              {{ data[indextr].roi }}
            </vs-td>
            <vs-td :data="data[indextr]._id">`
              {{ data[indextr].startDate }}
            </vs-td>
            <vs-td :data="data[indextr]._id">
              {{ data[indextr].endDate }}
            </vs-td>
            <vs-td :data="data[indextr].leverage">
              {{ data[indextr].leverage }}
            </vs-td>
          </vs-tr>
        </template>
      </vs-table>
    </vx-card>
    <br>
    <vx-card>
      <vs-pagination :totalPages="totalPages" :total="totalPages" v-model="currentPage"></vs-pagination>
    </vx-card>
  </div>
</template>

<script>
import dayjs from 'dayjs';
export default {
  data: function () {
    return {
      backtests: [],
      totalPages: 1,
      total: 1,
      currentPage: 1,
      selected: []
    };
  },
  methods: {
      handleSelected (tr) {
          const { _id } = tr;
          this.$router.push(`/backtest/${_id}`);
      },
      openBacktestListLoading () {
          this.$vs.loading();
      },
      closeBacktestListLoading () {
          this.$vs.loading.close();
      },
     fetchBacktest(page = 1, limit = 30) {
         this.openBacktestListLoading()
         const self = this;
      this.$http
        .get(`/api/backtest?page=${page}&limit=${limit}`)
        .then((response) => {
            self.closeBacktestListLoading();
          const {
            docs,
            totalPages,
            page,
            hasNextPage,
            hasPrevPage,
            totalDocs,
          } = response.data;
          this.totalPages = totalPages;
          // Work on Data
          this.backtests = [];
          docs.forEach((element) => {
              const { exchange, roi, startDate, endDate} = element;
              element.exchange = exchange.toUpperCase();
              element.roi = roi ? parseFloat(roi).toFixed(2) : ""
              element.startDate = startDate ? dayjs(new Date(startDate)).format('DD-MM-YYYY/HH:mm:ss'): "";
              element.endDate = endDate ? dayjs(new Date(endDate)).format('DD-MM-YYYY/HH:mm:ss'): "";
            this.backtests.push(element);
          });
        })
        .catch((err) => {
            self.closeBacktestListLoading();
          this.notifyError(err.message);
        });
    },
    notifyError(message) {
        this.$vs.notify({icon: 'error', title: "Error", color: 'danger', text: message})
    },
  },
  watch: {
      currentPage (newPage, oldPage) {
          if (oldPage == newPage) return;
          this.fetchBacktest(parseInt(newPage));
      },
  },
  mounted() {
    this.fetchBacktest();
  },
};
</script>

<style>
</style>

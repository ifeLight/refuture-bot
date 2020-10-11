<template>
  <div>
    <vx-card title="Hyperameter List" id="hyper-list-container">
      <p>View the List of Hyperameters Completed</p>
      <br>

      <vs-table :data="hyperList" v-model="selected" @selected="handleSelected" >
        <template slot="thead">
          <vs-th>Symbol</vs-th>
          <vs-th>Exchange</vs-th>
          <vs-th>Start Date</vs-th>
          <vs-th>End Date</vs-th>
        </template>

        <template slot-scope="{ data }">
          <vs-tr :data="tr" :key="indextr" v-for="(tr, indextr) in data" :state="tr.roi > 50 ? 'success': tr.roi < -50 ? 'danger': ''" @click="alert('sss')">
            <vs-td :data="data[indextr].symbol">
              {{ data[indextr].symbol }}
            </vs-td>
            <vs-td :data="data[indextr].exchange">
              {{ data[indextr].exchange }}
            </vs-td>
            <vs-td :data="data[indextr]._id">
              {{ data[indextr].startDate }}
            </vs-td>
            <vs-td :data="data[indextr]._id">
              {{ data[indextr].endDate }}
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
      hyperList: [],
      totalPages: 1,
      total: 1,
      currentPage: 1,
      selected: []
    };
  },
  methods: {
      handleSelected (tr) {
          const { id } = tr;
          this.$router.push(`/hyper/${id}`);
      },
      openHyperListLoading () {
          this.$vs.loading();
      },
      closeHyperListLoading () {
          this.$vs.loading.close();
      },
     fetchHyperList(page = 1, limit = 30) {
         this.openHyperListLoading()
         const self = this;
      this.$http
        .get(`/api/hyper?page=${page}&limit=${limit}`)
        .then((response) => {
            self.closeHyperListLoading();
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
          this.hyperList = [];
          docs.forEach((element) => {
              const { _id: id, parameters} = element;
              const { symbol, exchange, startDate, endDate} = parameters;
              const doc = { symbol, id };
              doc.exchange = exchange.toUpperCase();
              doc.startDate = startDate ? dayjs(new Date(startDate)).format('DD-MM-YYYY/HH:mm:ss'): "";
              doc.endDate = endDate ? dayjs(new Date(endDate)).format('DD-MM-YYYY/HH:mm:ss'): "";
            this.hyperList.push(doc);
          });
        })
        .catch((err) => {
            self.closeHyperListLoading();
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
          this.fetchHyperList(parseInt(newPage));
      },
  },
  mounted() {
    this.fetchHyperList();
  },
};
</script>

<style>
</style>

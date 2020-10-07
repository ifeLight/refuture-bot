<template>
  <vx-card title="Backtest List">

        <p>View the List of backtest Completed</p>
        <br>


        <vs-table :data="backtests">

            <template slot="thead">
                <vs-th>Symbol</vs-th>
                <vs-th>Exchange</vs-th>
                <vs-th>RoI</vs-th>
                <vs-th>Start Date</vs-th>
                <vs-th>End Date</vs-th>
                <vs-th>Leverage</vs-th>
            </template>

            <template slot-scope="{data}">
                <vs-tr :key="indextr" v-for="(tr, indextr) in data">
                    <vs-td :data="data[indextr].symbol">
                        {{data[indextr].symbol}}
                    </vs-td>
                    <vs-td :data="data[indextr].exchange">
                        {{data[indextr].exchange}}
                    </vs-td>
                    <vs-td :data="data[indextr].roi">
                        {{data[indextr].roi}}
                    </vs-td>
                    <vs-td :data="data[indextr]._id">
                        {{data[indextr].startDate}}
                    </vs-td>
                    <vs-td :data="data[indextr]._id">
                        {{data[indextr].endDate}}
                    </vs-td>
                    <vs-td :data="data[indextr].leverage">
                        {{data[indextr].leverage}}
                    </vs-td>
                </vs-tr>
            </template>
        </vs-table>
  </vx-card>
</template>

<script>
export default {
    data: function () {
        return {
            backtests: [],
        }
    },
    methods: {
        async fetchBacktest(page = 1, limit = 30) {
            this.$http.get(`/api/backtest?page=${page}&limit=${limit}`)
            .then((response) => {
                const {docs, totalPages, page, hasNextPage, hasPrevPage, totalDocs} = response.data;
                // Work on Data
                this.backtests = []
                docs.forEach(element => {
                    this.backtests.push(element);
                });
                
            })
            .catch((err) => {
                console.error(err)
            })
        }
    },
    async created () {
        await this.fetchBacktest()
    }

}
</script>

<style>

</style>

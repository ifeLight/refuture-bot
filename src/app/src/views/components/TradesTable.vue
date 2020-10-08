<template>
  <vx-card :title="title">
      <vs-table :data="trades" maxItems="15" pagination="true">

    <template slot="thead">
      <vs-th>Type</vs-th>
      <vs-th>Entry Time</vs-th>
      <vs-th>Close Time</vs-th>
      <vs-th>Entry Price</vs-th>
      <vs-th>Close Price</vs-th>
      <vs-th>Fee</vs-th>
      <vs-th>Closed By</vs-th>
      <vs-th>After Balance</vs-th>
      <vs-th>Profit $</vs-th>
      <vs-th>Profit %</vs-th>
    </template>

    <template slot-scope="{data: trades}">
      <vs-tr :state="tr.type == 'long' ? 'success':'danger'" :key="indextr" v-for="(tr, indextr) in trades">

        <vs-td :data="trades[indextr].type">
            {{ trades[indextr].type }}
        </vs-td>

        <vs-td :data="trades[indextr].entryTime">
          {{ dayjs(new Date(trades[indextr].entryTime)).format('DD-MM-YYYY/HH:mm:ss') }}
        </vs-td>

        <vs-td :data="trades[indextr].closeTime">
          {{ dayjs(new Date(trades[indextr].closeTime)).format('DD-MM-YYYY/HH:mm:ss') }}
        </vs-td>

        <vs-td :data="trades[indextr].entry">
          {{ trades[indextr].entry }}
        </vs-td>

        <vs-td :data="trades[indextr].close">
          {{ trades[indextr].close }}
        </vs-td>

        <vs-td :data="trades[indextr].fee">
          {{ parseFloat(trades[indextr].fee).toFixed(2) }}
        </vs-td>

        <vs-td :data="trades[indextr].closedBy">
          {{ trades[indextr].closedBy }}
        </vs-td>

        <vs-td :data="trades[indextr].currentBalance">
          {{ parseFloat(trades[indextr].currentBalance).toFixed(2) }}
        </vs-td>

        <vs-td :data="trades[indextr].profit">
          {{ parseFloat(trades[indextr].profit).toFixed(2) }}
        </vs-td>

        <vs-td :data="trades[indextr].profitInPercentage">
          {{ parseFloat(trades[indextr].profitInPercentage).toFixed(2) }}
        </vs-td>
      </vs-tr>
    </template>

  </vs-table>
  </vx-card>
</template>

<script>
import dayjs from 'dayjs';
export default {
    props: ['title', 'trades'],
    data () {
        return {
            dayjs
        }
    },
    mounted() {
        console.log(this.trades)
    }
}
</script>

<style>

</style>
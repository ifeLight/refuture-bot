<template>
  <vx-card title="Backtest List">

        <p>View the List of backtest Completed</p>
        <br>


        <vs-table :data="backtests">

            <template slot="thead">
                <vs-th>Email</vs-th>
                <vs-th>Name</vs-th>
                <vs-th>Website</vs-th>
                <vs-th>Nro</vs-th>
            </template>

            <template slot-scope="{data}">
                <vs-tr :key="indextr" v-for="(tr, indextr) in data">
                    <vs-td :data="data[indextr].email">
                        {{data[indextr].email}}
                    </vs-td>
                    <vs-td :data="data[indextr].username">
                        {{data[indextr].name}}
                    </vs-td>
                    <vs-td :data="data[indextr].id">
                        {{data[indextr].website}}
                    </vs-td>
                    <vs-td :data="data[indextr].id">
                        {{data[indextr].id}}
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


}
</script>

<style>

</style>

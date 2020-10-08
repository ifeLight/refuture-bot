<template>
  <vx-card :title="title">
      <div v-if="data"> 
          <vs-table :data="{data}">
            <vs-tr>
                <vs-th> Key</vs-th>
                <vs-th>Value</vs-th>
            </vs-tr>
            <vs-tr :key="indextr" v-for="(value, name, indextr) in data">
              <vs-td :data="name">
                {{ name }}
              </vs-td>
              <vs-td :data="value" v-if="typeof value !== 'object'">
                {{ value }}
              </vs-td>
              <vs-td :data="value" v-else>
                {{value || json}}
              </vs-td>
            </vs-tr>
        </vs-table>
      </div>
  </vx-card>
</template>

<script>
export default {
    name: 'object-table',
    props: ['data', 'title'],
    data () {
        return {

        }
    },
    methods: {
        setTitle () {
            if (!this.title) {
                this.title = "Indicator List";
            }
        },
    },
    watch : {
        data () {

        }
    }
}
</script>

<style>

</style>
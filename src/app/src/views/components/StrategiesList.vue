<template>
  <vx-card :title="title">
    <p>List of {{ type }}s</p>
    <br>
    <div v-if="tableList.length > 0">
        <div v-for="(data, indexTr) in tableList" :key="indexTr" class="strategies-table">
        <h4> {{type}} {{indexTr + 1}}</h4>
        <br>
        <vs-table :data="{s: 'no'}">
            <vs-tr>
                <vs-th> Name</vs-th>
                <vs-td>{{tableList[indexTr].name}}</vs-td>
            </vs-tr>
        </vs-table>
      <div v-if="tableList[indexTr].options">
          <vs-table :data="{s: 'no'}">
              <vs-tr> <vs-th>Options</vs-th></vs-tr>
            <vs-tr>
                <vs-th> Key</vs-th>
                <vs-th>Value</vs-th>
            </vs-tr>
            <vs-tr :key="indextr" v-for="(value, name, indextr) in tableList[indexTr].options">
              <vs-td :data="name">
                {{ name }}
              </vs-td>
              <vs-td :data="value">
                {{ value }}
              </vs-td>
            </vs-tr>

        </vs-table>
      </div>
    </div>
    </div>
  </vx-card>
</template>

<script>
export default {
  name: "strategies-list",
  props: ["list", "title", "type"],
  data() {
    return {
      tableList: []
    };
  },
  created() {
    const list = this.list;
    this.setTitle();
    this.setTableList(list);
  },
  mounted() {

  },
  methods: {
    setTitle() {
      if (!this.title) {
        this.title = "Indicator List";
      }
    },
    setType() {
      if (!this.type) {
        this.type = "Indicator";
      }
    },
    setTableList(list) {
      if (typeof list === "string"  && list.length > 0) {
        this.tableList = [
          {
            name: list,
            options: {}
          }
        ];
      }

      if (typeof list === "object" && !Array.isArray(list)) {
        this.tableList = [];
        if (list) {
            const { name, options } = list;
            const newObj = {
            name: name ? name : "Unknown Strategy Type",
            options: options ? options : {}
            };
            this.tableList = [newObj];
        }
      }

      if (typeof list === "object" && Array.isArray(list)) {
        this.tableList = [];
        if (list[0] & (typeof list[0] === "string")) {
          list.forEach(item => {
            this.tableList.push({
              name: item,
              options: {}
            });
          });
        }
        if (list[0] & (typeof list[0] === "object")) {
          list.forEach(item => {
            const { name, options } = item;
            this.tableList.push({
              name: name ? name : "Unknown Strategy Type",
              options: options ? options : {}
            });
          });
        }
      }
    }
  },
  watch: {
      list (obj) {
          this.setTableList(obj);
      }
  }
};
</script>

<style></style>

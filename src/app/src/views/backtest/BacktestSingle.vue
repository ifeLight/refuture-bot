<template>
  <vx-card title="Backtest Single">
      {{$route.params.id}}
  </vx-card>
</template>

<script>

export default {
    mounted () {
        const id = this.$route.params.id;
        if (!id) {
            this.notifyError('Error Fetching Data - No ID given');
            return;
        }
        this.id = id;
        
    },
    data () {
        return {
            id :null,
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

            })
            .catch((err) => {
                this.closeLoading();
            })
        }
    }
}
</script>

<style>


</style>
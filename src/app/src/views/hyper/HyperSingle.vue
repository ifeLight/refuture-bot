<template>
  <div>
      <vx-card title="Hyper Single">
      {{$route.params.id}}
  </vx-card>
  <br>
  <div class="vx-row">
      <div class="vx-col w-1/2 md:w-1/2 xl:w-1/4">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="optimizationParameter"
                  statisticTitle="Optimization" />
        </div>
        <div class="vx-col w-1/2 md:w-1/2 xl:w-1/4">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="averageRuntime + 'mins'"
                  statisticTitle="Avg Runtime" />
        </div>
        <div class="vx-col w-1/2 md:w-1/2 xl:w-1/4">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="duration + 'hrs'"
                  statisticTitle="Duration" />
        </div>
        <div class="vx-col w-1/2 md:w-1/2 xl:w-1/4">
                <statistics-card-line
                  hideChart
                  icon-right
                  class="mb-base"
                  icon="EyeIcon"
                  :statistic="maximumIteration"
                  statisticTitle="Iteration" />
        </div>
  </div>
  <br>
  <object-table title="MainParameters" :data="parameters"></object-table>
  <br>
  <object-table title="Arg Max" :data="argmax"></object-table>
  <br>
  <object-table title="Arg Min" :data="argmin"></object-table>
  <br>
  <object-table title="Space Parameters" :data="space"></object-table>
  <br>
  <object-table title="Override Parameters" :data="override"></object-table>
  <br>
  <strategies-list :list="indicators" title="Indicators" type="Indicator"></strategies-list>
  <br>
  <strategies-list :list="safeties" title="Safeties" type="Safeties"></strategies-list>
  </div>
</template>

<script>
import dayjs from 'dayjs';

import StategiesList from '../components/StrategiesList.vue';
import ObjectTable from '../components/ObjectTable.vue'
import StatisticsCardLine from '@/components/statistics-cards/StatisticsCardLine.vue'

export default {
    components: {
        StatisticsCardLine,
        'strategies-list': StategiesList,
        'object-table' : ObjectTable,
    },
    mounted () {
        const id = this.$route.params.id;
        if (!id) {
            this.notifyError('Error Fetching Data - No ID given');
            return;
        }
        this.id = id;
        this.fetchHyper(id)
        
    },
    data () {
        return {
            id :null,
            argmin: null,
            argmax: null,
            optimizationParameter: "",
            parameters: null,
            space: null,
            duration: "",
            averageRuntime: "",
            dateAdded: null,
            maximumIteration: "",
            override: null,
            indicators: null,
            safeties: null
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
        fetchHyper(id) {
            this.openLoading();
            this.$http.get(`/api/hyper/${id}`)
            .then((response) => {
                this.closeLoading();
                const data = response.data;
                const {
                    argmin, argmax, parameters, optimizationParameter, space,
                    duration, averageRuntime, createdAt, override,
                    maximumIteration, safeties, indicator
                } = data
                this.argmin = argmin;
                this.argmax = argmax;
                this.parameters = parameters;
                this.optimizationParameter = optimizationParameter;
                this.duration = Number(duration).toFixed(2);;
                this.averageRuntime = Number(averageRuntime).toFixed(2);
                this.maximumIteration = maximumIteration;
                this.override = override;
                this.dateAdded = new Date(createdAt);
                this.safeties = safeties;
                this.space = space;
                this.indicators = indicator;
                this.parameters['dateAdded'] = dayjs(this.dateAdded).format('DD-MM-YYYY/HH:mm:ss');
            })
            .catch((err) => {
                this.closeLoading();
                this.notifyError(err.message);
            })
        }
    }
}
</script>

<style>


</style>
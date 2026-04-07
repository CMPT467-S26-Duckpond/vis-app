<template>
  <!-- Select variables -->
  <!-- If map mode is choropleth, only allow setting one var -->
</template>

<script setup lang="ts">
import { U } from "vue-router/dist/index-BzEKChPW.js";
import type { MapModes } from "~/pages/test.vue";
import type { AquastatVariables } from "~~/server/utils/aquastatVars";

defineProps<{
  mapMode: MapModes;
}>();

const { data: aquastatOptions } = useFetch("/api/aquastat-options");

const WATER_CONSUMPTION_RATE_VARS: AquastatVariables[] = [
  "Agricultural water withdrawal [10^9 m3/year]",
  "Industrial water withdrawal [10^9 m3/year]",
  "Municipal water withdrawal [10^9 m3/year]",
  "Fresh groundwater withdrawal [10^9 m3/year]",
  "Fresh surface water withdrawal [10^9 m3/year]",
  "Total freshwater withdrawal [10^9 m3/year]",
  "Total water withdrawal [10^9 m3/year]"
]
</script>

<template>
  <ActiveBodyPolygon
    v-if="map && activeBodyData"
    :map="map"
    :activeBodyData="activeBodyData"
  />

  <ActiveBodyVis
    v-if="map && activeBodyData"
    :map="map"
    :activeBodyData="activeBodyData"
    :waterConsumedKM3
  />
</template>

<script setup lang="ts">
import * as L from "leaflet";
import { useWaterBodyPins } from "~/composables/useWaterBodyPins";
import ActiveBodyPolygon from "./lakeVis/ActiveBodyPolygon.vue";
import ActiveBodyVis from "./lakeVis/ActiveBodyVis.vue";

const { map } = defineProps<{
  map: L.Map;
  waterConsumedKM3: number;
}>();

const emit = defineEmits<{ (e: "loading", isLoading: boolean): void }>();

const selectedLake = defineModel("selectedLake", {
  type: String,
  default: undefined
});

const pinsLayer = useWaterBodyPins((a, _, id) => {
  map.setView(a.latlng, 8);
  selectedLake.value = id;
});

const { data: activeBodyData, pending: activeBodyPending } = useAsyncData(
  "activeBodyData",
  () => {
    if (!selectedLake.value) throw new Error("No body selected");
    return $fetch(
      `/api/supplementary/waterBodies/${selectedLake.value}?includeBathymetry=true`
    );
  },
  {
    watch: [() => selectedLake.value]
  }
);

watch(activeBodyPending, (pending) => {
  emit("loading", pending);
});

onMounted(() => {
  if (!map) return;

  pinsLayer.waterBodyLayer.addTo(map);
});

onUnmounted(() => {
  pinsLayer.waterBodyLayer.removeFrom(map);
});
</script>

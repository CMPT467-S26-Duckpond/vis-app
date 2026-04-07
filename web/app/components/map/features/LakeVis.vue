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

const selectedBody = ref<string>();

const pinsLayer = useWaterBodyPins((a, body, id) => {
  map.setView(a.latlng, 8);
  selectedBody.value = id;
});

const { data: activeBodyData, pending: activeBodyPending } = useAsyncData(
  "activeBodyData",
  () => {
    if (!selectedBody.value) throw new Error("No body selected");
    return $fetch(
      `/api/supplementary/waterBodies/${selectedBody.value}?includeBathymetry=true`
    );
  },
  {
    watch: [() => selectedBody.value]
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

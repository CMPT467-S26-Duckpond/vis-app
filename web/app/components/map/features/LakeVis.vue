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
    :waterConsumedKM3="(consumptionKM3 / 365) * drainProgress"
  />
</template>

<script setup lang="ts">
import type { AquastatPayload } from "~~/server/api/aquastat.get";
import type { AquastatVariables } from "~~/server/utils/aquastatVars";
import * as L from "leaflet";
import type { AquastatAbstractions } from "~/pages/test.vue";
import { useWaterBodyPins } from "~/composables/useWaterBodyPins";
import ActiveBodyPolygon from "./lakeVis/ActiveBodyPolygon.vue";
import ActiveBodyVis from "./lakeVis/ActiveBodyVis.vue";

const {
  map,
  targetVariable,
  targetYear,
  abstractionMembers,
  abstraction,
  aquastatData
} = defineProps<{
  map: L.Map;
  targetVariable: AquastatVariables;
  targetYear: string;
  drainProgress: number;
  abstraction: AquastatAbstractions;
  abstractionMembers: string[];
  aquastatData?: AquastatPayload;
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

const consumptionKM3 = computed(() => {
  if (!aquastatData) return 0;

  const varData = aquastatData[abstraction]!;

  // Sum
  const res = abstractionMembers.reduce((sum, member) => {
    const value =
      varData?.[member]?.values[targetVariable]?.[targetYear]?.value ?? 0;
    return sum + (typeof value === "number" && value >= 0 ? value : 0);
  }, 0);

  return res;
});

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

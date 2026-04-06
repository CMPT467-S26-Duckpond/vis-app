<template>
  <UButton @click="updateMap">Refresh</UButton>
  {{ maxDepth }}
  {{ currentMaxDepth }}
  <USlider :min="0" :max="maxDepth" v-model="currentMaxDepth" />
</template>

<script setup lang="ts">
import type { BathymetryResponse } from "~~/server/api/supplementary/waterBodies/[id]/bathymetry.get";

import * as L from "leaflet";

import { renderBathymetryData } from "./renderBathymetry";

const { map, selectedBody } = defineProps<{
  map: L.Map | L.LayerGroup;
  selectedBody: string;
}>();

const { data: activeBodyData } = useAsyncData(
  "activeBodyData",
  () => {
    if (!selectedBody) throw new Error("No body selected");
    return $fetch(
      `/api/supplementary/waterBodies/${selectedBody}?includeBathymetry=true`
    );
  },
  {
    watch: [() => selectedBody]
  }
);

const currentMaxDepth = ref(0);

watch(
  () => activeBodyData.value,
  (newData) => {
    if (!newData) return;

    const bathymetryData = newData.bathymetryData;
    if (!bathymetryData) return;

    currentMaxDepth.value = -Math.min(...bathymetryData.z);
  }
);

let shapeLayer: L.LayerGroup;
let depthLayer: L.LayerGroup;

onMounted(() => {
  shapeLayer = new L.LayerGroup().addTo(map);
  depthLayer = new L.LayerGroup().addTo(map);
});

onUnmounted(() => {
  shapeLayer.remove();
  depthLayer.remove();
});

const maxDepth = ref(0);

const filteredBathymetryData = computed(() => {
  if (!activeBodyData.value) return null;

  const bathymetryData = activeBodyData.value.bathymetryData;
  if (!bathymetryData) return null;

  const filtered: BathymetryResponse = {
    latitude: [],
    longitude: [],
    z: []
  };

  for (let i = 0; i < bathymetryData.z.length; i++) {
    if (-bathymetryData.z[i]! > currentMaxDepth.value) {
      filtered.latitude.push(bathymetryData.latitude[i]!);
      filtered.longitude.push(bathymetryData.longitude[i]!);
      filtered.z.push(bathymetryData.z[i]!);
    }
  }

  return filtered;
});

watch(filteredBathymetryData, () => {
  updateBathymetryLayer();
});

async function updateBathymetryLayer() {
  if (!filteredBathymetryData.value) return;

  depthLayer.clearLayers();
  renderBathymetryData(
    filteredBathymetryData.value,
    depthLayer,
    -maxDepth.value
  );
}

async function updateMap() {
  if (!activeBodyData.value) return;

  shapeLayer.clearLayers();

  L.geoJSON(activeBodyData.value.bodyData.geoJSON, {
    style: {
      color: "blue",
      fillColor: "blue",
      fillOpacity: 0.5
    }
  }).addTo(shapeLayer);

  maxDepth.value = -Math.min(...activeBodyData.value.bathymetryData!.z);

  // Chonky boi
  updateBathymetryLayer();
}

watch(activeBodyData, async (newValue) => {
  if (!newValue) return;

  updateMap();
});
</script>

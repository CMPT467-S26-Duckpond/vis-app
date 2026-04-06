<template>
  <UButton @click="refresh()">Refresh</UButton>
  {{ maxDepth }}
  {{ currentMaxDepth }}
  <USlider :min="0" :max="maxDepth + 1" v-model="currentMaxDepth" />
</template>

<script setup lang="ts">
import type { BathymetryPoint } from "~~/server/models/MapWaterBody";
import * as L from "leaflet";
import { makeBathymetryPoint } from "./renderBathymetry";

const { map, selectedBody } = defineProps<{
  map: L.Map | L.LayerGroup;
  selectedBody: string;
}>();

const { data: activeBodyData, refresh } = useAsyncData(
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

const maxDepth = computed(() => {
  if (!activeBodyData.value) return 0;

  const bathymetryData = activeBodyData.value.depthBathymetry;
  if (!bathymetryData) return 0;

  return Math.max(...bathymetryData.map((d) => d.z));
});

watch(maxDepth, (newData) => {
  if (!newData) return;

  currentMaxDepth.value = 0;
});

let shapeLayer: L.LayerGroup;
let depthLayer: L.LayerGroup;

onMounted(() => {
  depthLayer = new L.LayerGroup().addTo(map);
  shapeLayer = new L.LayerGroup().addTo(map);
});

onUnmounted(() => {
  shapeLayer.remove();
  depthLayer.remove();
});

type BathymetryMapBlip = { data: BathymetryPoint; point: L.Circle };

export type BathymetryPointMap = Map<number, BathymetryMapBlip[]>;

/**
 * Group bathymetry points by depth for more performant rendering and filtering
 */
const bathMap = computed<BathymetryPointMap>(() => {
  if (!activeBodyData.value) return new Map();

  const bathymetryData = activeBodyData.value.depthBathymetry;
  if (!bathymetryData) return new Map();

  const map: BathymetryPointMap = new Map();

  bathymetryData.forEach((point) => {
    const depth = point.z;
    if (!map.has(depth)) {
      map.set(depth, []);
    }

    map.get(depth)!.push({
      data: point,
      point: makeBathymetryPoint(point, maxDepth.value)
    });
  });

  return map;
});

const filteredBathymetryData = computed(() => {
  const result: BathymetryMapBlip[] = [];

  bathMap.value.forEach((points, depth) => {
    if (depth + 1 > currentMaxDepth.value) {
      result.push(...points);
    }
  });

  return result;
});

const currentlyRenderedPoints = new Set<BathymetryMapBlip>();

watch(filteredBathymetryData, () => {
  updateBathymetryLayer();
});

function updateBathymetryLayer() {
  // Step 1: Remove points that are no longer in the filtered data
  currentlyRenderedPoints.forEach((blip) => {
    if (blip.data.z <= currentMaxDepth.value + 1) {
      depthLayer.removeLayer(blip.point);
      currentlyRenderedPoints.delete(blip);
    }
  });

  // Step 2: Add new points that are in the filtered data but not currently rendered
  filteredBathymetryData.value.forEach((blip) => {
    if (!currentlyRenderedPoints.has(blip)) {
      blip.point.addTo(depthLayer);
      currentlyRenderedPoints.add(blip);
    }
  });
}

function updateMap() {
  if (!activeBodyData.value) return;

  shapeLayer.clearLayers();
  depthLayer.clearLayers();
  currentlyRenderedPoints.clear();

  L.geoJSON(activeBodyData.value.geoJSON, {
    style: {
      color: "blue",
      fillColor: "blue",
      fillOpacity: 0.5
    }
  })
    .setZIndex(-1)
    .addTo(shapeLayer);

  // Chonky boi
  updateBathymetryLayer();
}

watch(activeBodyData, (newValue) => {
  if (!newValue) return;

  updateMap();
});
</script>

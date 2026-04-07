<template></template>

<script setup lang="ts">
import type {
  BathymetryPoint,
  IWaterBody
} from "~~/server/models/MapWaterBody";
import { clamp } from "es-toolkit";
import * as L from "leaflet";
import { makeBathymetryPoint } from "../renderBathymetry";

const { map, activeBodyData, waterConsumedKM3 } = defineProps<{
  map: L.Map | L.LayerGroup;
  activeBodyData: IWaterBody;
  waterConsumedKM3: number;
}>();

const drainedPercent = computed(() => {
  return clamp(0, 100, (waterConsumedKM3 / activeBodyData.volumeKM3) * 100);
});

const maxDepth = computed(() => {
  const bathymetryData = activeBodyData.depthBathymetry;
  if (!bathymetryData) return 0;

  return Math.max(...bathymetryData.map((d) => d.z));
});

let depthLayer: L.LayerGroup;

type BathymetryMapBlip = { data: BathymetryPoint; point: L.Circle };

export type BathymetryPointMap = Map<number, BathymetryMapBlip[]>;

/**
 * Group bathymetry points by depth for more performant rendering and filtering
 */
const bathMap = computed<BathymetryPointMap>(() => {
  const bathymetryData = activeBodyData.depthBathymetry;
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

const volumePercentRemainingAtDepth = computed(() => {
  if (!bathMap.value.size) return [];
  if (!activeBodyData.depthBathymetry) return [];

  const allDepths = Array.from(bathMap.value.keys()).sort((a, b) => a - b);
  allDepths.push(maxDepth.value + 1);
  const allPoints = activeBodyData.depthBathymetry.length;

  const percentagesWithNext = allDepths.map((depth, index) => {
    const pointsDeeperThanDepth = allDepths
      .slice(index)
      .reduce((sum, d) => sum + (bathMap.value.get(d)?.length ?? 0), 0);

    return {
      depth,
      percentageRemaining: pointsDeeperThanDepth / allPoints
    };
  });

  return percentagesWithNext;
});

const thresholdDepth = computed(() => {
  return (
    volumePercentRemainingAtDepth.value.find(
      (entry) => entry.percentageRemaining <= (100 - drainedPercent.value) / 100
    )?.depth ?? 0
  );
});

const filteredBathymetryData = computed(() => {
  const result: BathymetryMapBlip[] = [];

  bathMap.value.forEach((points, depth) => {
    if (depth + 1 > thresholdDepth.value) {
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
    if (blip.data.z <= thresholdDepth.value + 1) {
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
  depthLayer.clearLayers();
  currentlyRenderedPoints.clear();

  // Chonky boi
  updateBathymetryLayer();
}

onMounted(() => {
  depthLayer = new L.LayerGroup().addTo(map);

  updateMap();
});

onUnmounted(() => {
  depthLayer.remove();
});

watch(
  () => activeBodyData,
  (newValue) => {
    if (!newValue) return;
    updateMap();
  }
);
</script>

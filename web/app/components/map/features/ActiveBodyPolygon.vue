<template></template>

<script setup lang="ts">
import type { GeoJsonObject } from "geojson";
import type { IWaterBody } from "~~/server/models/MapWaterBody";
import * as L from "leaflet";

const { activeBodyData, map } = defineProps<{
  map: L.Map | L.LayerGroup;
  activeBodyData: IWaterBody;
}>();

function setLakePolygon(layer: L.LayerGroup, geoJSON: GeoJsonObject) {
  L.geoJSON(geoJSON, {
    style: {
      color: "grey",
      fillColor: "grey",
      fillOpacity: 0.75
    }
  })
    .setZIndex(-1)
    .addTo(layer);
}

let activeLakePolygonLayer: L.LayerGroup;
onMounted(() => {
  activeLakePolygonLayer = new L.LayerGroup().addTo(map);
  update();
});

onUnmounted(() => {
  activeLakePolygonLayer.clearLayers();
});

function update() {
  activeLakePolygonLayer.clearLayers();
  setLakePolygon(activeLakePolygonLayer, activeBodyData.geoJSON);
}

watch(() => activeBodyData, update);
</script>

<template>
  <!-- 
    This template section is very tiny. That's because all we need to do is define a "dummy" element that leaflet can use to populate with a map 

    All we need to do is give Vue a way to target the element (ref attribute) and give it some styling
  -->
  <div ref="map" style="height: 500px" />

  {{ test }}
</template>

<script setup lang="ts">
import * as L from "leaflet";
import { ref, onMounted, useTemplateRef } from "vue";

import { setMapPins } from "./mapPins";
import { mapVolumeTest } from "./mapVolume";

const mapRef = useTemplateRef("map");
const map = ref<L.Map>();

const selectedBody = ref<string>();
let shapeLayer: L.LayerGroup;
let depthLayer: L.LayerGroup;

function loadMap() {
  if (!map.value) return;

  map.value.setView([40.7128, -74.006], 2);

  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  }).addTo(map.value!);
}

onMounted(() => {
  // Quick way to make sure we do in fact have our map div available
  // Yes, if map doesn't exist everything about this component would break. Whatever. This shouldn't ever be triggered. It's mostly to make Typescripts type-checker happy.
  if (!mapRef.value) return;

  // Most of this code is adapted from this: https://medium.com/@smhabibjr/implement-an-interactive-map-in-the-vue-js-8a865010fb41
  // Leaflet let's you pick a specific set of "map tiles" to use as the background. I played around here: https://leaflet-extras.github.io/leaflet-providers/preview/
  map.value = L.map(mapRef.value);

  const pinLayer = new L.LayerGroup().addTo(map.value);
  shapeLayer = new L.LayerGroup().addTo(map.value);
  depthLayer = new L.LayerGroup().addTo(map.value);

  loadMap();

  setMapPins(pinLayer, map.value, async (event, id) => {
    selectedBody.value = id;
  });
});

const { data: activeBodyData, status: activeBodyDataStatus } = useAsyncData(
  "activeBodyData",
  () => {
    if (!selectedBody.value) throw new Error("No body selected");
    return $fetch(`/api/supplementary/waterBodies/${selectedBody.value}`);
  },
  {
    watch: [selectedBody]
  }
);

watch(activeBodyData, async (newValue) => {
  if (!newValue) return;

  shapeLayer.clearLayers();
  depthLayer.clearLayers();

  L.geoJSON(newValue.geoJSON, {
    style: {
      color: "blue",
      fillColor: "blue",
      fillOpacity: 0.5
    }
  }).addTo(shapeLayer);

  // Chonky boi
  mapVolumeTest(newValue._id, depthLayer);
});
</script>

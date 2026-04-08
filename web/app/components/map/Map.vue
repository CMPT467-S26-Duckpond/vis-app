<template>
  <!-- 
    This template section is very tiny. That's because all we need to do is define a "dummy" element that leaflet can use to populate with a map 

    All we need to do is give Vue a way to target the element (ref attribute) and give it some styling
  -->
  <div class="size-full">
    <div ref="map" class="size-full" />
    <span
      class="absolute top-0 left-0 z-1000 w-full h-full flex items-center justify-center bg-gray-600/50"
      v-if="isLoading"
    >
      <LoadingSpan />
    </span>
  </div>

  <LakeVis
    v-if="map && mapMode === 'lakeVis'"
    :map="toRaw(map)"
    :waterConsumedKM3="500"
    @loading="isLoading = $event"
    v-model:selected-lake="selectedLake"
  />

  <!--
    Why is there a "toRaw" on map?
    https://stackoverflow.com/a/73588115

    Vue seems to be too smart for it's own good and breaks some leaflet behaviour.
    Easy enough fix fortunately (once you know about it...)
  -->
  <Choropleth
    v-if="map && mapMode === 'choropleth'"
    :map="toRaw(map)"
    :abstraction="abstraction"
    :targetVariable="targetVariable"
    targetYear="2022"
    @area-clicked="(name) => emit('area-clicked', name)"
  />

  <div style="height: 20px" />
</template>

<script setup lang="ts">
import type { AquastatVariables } from "~~/server/utils/aquastatVars";
import * as L from "leaflet";
import type { AquastatAbstractions, MapModes } from "~/pages/test.vue";
import LoadingSpan from "../ui/LoadingSpan.vue";
import Choropleth from "./features/Choropleth.vue";
import LakeVis from "./features/LakeVis.vue";

const props = defineProps<{
  mapMode: MapModes;
  abstraction?: AquastatAbstractions;
  showPins?: boolean;
  targetVariable?: AquastatVariables;
  targetYear?: string;
}>();

const emit = defineEmits<{ (e: "area-clicked", name: string): void }>();

const mapRef = useTemplateRef("map");
const map = ref<L.Map>();

defineExpose({
  map
});

const selectedLake = defineModel("selectedLake", {
  type: String,
  default: undefined
});

const isLoading = ref(false);

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

  // pane for choropleth so it sits below lakes
  map.value.createPane("choroplethPane");
  map.value.getPane("choroplethPane")!.style.zIndex = "250"; // default tile layer is 200, points/vectors are usually 400

  loadMap();
});
</script>

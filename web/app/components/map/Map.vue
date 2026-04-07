<template>
  <!-- 
    This template section is very tiny. That's because all we need to do is define a "dummy" element that leaflet can use to populate with a map 

    All we need to do is give Vue a way to target the element (ref attribute) and give it some styling
  -->
  <div
    ref="map"
    class="absolute inset-0 w-full h-full"
    style="min-height: 500px"
  />

  <ActiveBodyPolygon
    v-if="map && activeBodyData"
    :map="map"
    :activeBodyData="activeBodyData"
  />

  <ActiveBodyVis
    v-if="map && activeBodyData"
    :map="map"
    :activeBodyData="activeBodyData"
    :waterConsumedKM3="drainPercent"
  />

  <!--
    Why is there a "toRaw" on map?
    https://stackoverflow.com/a/73588115

    Vue seems to be too smart for it's own good and breaks some leaflet behaviour.
    Easy enough fix fortunately (once you know about it...)
  -->
  <Choropleth
    v-if="map"
    :map="toRaw(map)"
    :abstraction="abstraction"
    :targetVariable="targetVariable"
    :targetYear="targetYear"
    @area-clicked="(name) => emit('area-clicked', name)"
  />

  <div style="height: 20px" />
</template>

<script setup lang="ts">
import * as L from "leaflet";
import { useWaterBodyPins } from "~/composables/useWaterBodyPins";
import ActiveBodyPolygon from "./features/ActiveBodyPolygon.vue";
import ActiveBodyVis from "./features/ActiveBodyVis.vue";
import Choropleth from "./features/Choropleth.vue";

const props = defineProps<{
  abstraction?: string;
  showPins?: boolean;
  targetVariable?: string;
  targetYear?: string;
}>();
const emit = defineEmits<{ (e: "area-clicked", name: string): void }>();

const mapRef = useTemplateRef("map");
const map = ref<L.Map>();

const selectedBody = ref<string>();
const drainPercent = ref(0);

const pinsLayer = useWaterBodyPins((a, body, id) => {
  map.value?.setView(a.latlng, 8);
  selectedBody.value = id;
});

watch(
  () => props.showPins,
  (newVal) => {
    if (!map.value) return;

    if (newVal) {
      pinsLayer.waterBodyLayer.addTo(toRaw(map.value));
    } else {
      pinsLayer.waterBodyLayer.removeFrom(toRaw(map.value));
    }
  }
);

function loadMap() {
  if (!map.value) return;

  map.value.setView([40.7128, -74.006], 2);

  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  }).addTo(map.value!);
}

const { data: activeBodyData } = useAsyncData(
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

<template>
  <!-- 
    This template section is very tiny. That's because all we need to do is define a "dummy" element that leaflet can use to populate with a map 

    All we need to do is give Vue a way to target the element (ref attribute) and give it some styling
  -->
  <div ref="map" class="absolute inset-0 w-full h-full" style="min-height: 500px;" />

  <div class="hidden">{{ activeBodyDataStatus }}</div>
</template>

<script setup lang="ts">
import * as L from "leaflet";
import { ref, onMounted, useTemplateRef, watch } from "vue";

import { setMapPins } from "./mapPins";
import { mapVolumeTest } from "./mapVolume";

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
let choroplethLayerGroup: L.LayerGroup;
let choroplethGeoJson: L.GeoJSON;
let pinLayer: L.LayerGroup;
let shapeLayer: L.LayerGroup;
let depthLayer: L.LayerGroup;

const { data: boundariesData } = useAsyncData("worldBounds", () => $fetch("/world_countries.geojson"));
const { data: aquastatData } = useAsyncData(
  "aquastatData",
  () => $fetch<any>("/api/aquastat", {
    query: {
      targetVariable: props.targetVariable,
      targetYear: props.targetYear
    }
  }),
  { watch: [() => props.targetVariable, () => props.targetYear] }
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

  choroplethLayerGroup = new L.LayerGroup().addTo(map.value);
  pinLayer = new L.LayerGroup();
  shapeLayer = new L.LayerGroup().addTo(map.value);
  depthLayer = new L.LayerGroup().addTo(map.value);
  if (props.showPins !== false) {
    pinLayer.addTo(map.value);
  }
  loadMap();

  setMapPins(pinLayer, map.value, async (event, id) => {
    selectedBody.value = id;
  });
});

function drawChoropleth() {
  if (!map.value || !boundariesData.value || !aquastatData.value || !choroplethLayerGroup) return;

  choroplethLayerGroup.clearLayers();

  const bounds: any = boundariesData.value;
  const stats: any = aquastatData.value;
  const abs = props.abstraction || "Countries";

  const getIso = (feature: any) => {
    let iso = feature.properties['ISO3166-1-Alpha-3'];
    if (iso === '-99' || !iso) {
      const featureName = feature.properties.name;
      const found = Object.keys(stats.countries || {}).find(k => stats.countries[k].name === featureName);
      if (found) return found;
    }
    return iso;
  };

  const getMetric = (feature: any): number | null => {
    const iso = getIso(feature);
    if (abs === "Countries") {
      const value = stats.countries?.[iso]?.value;
      return typeof value === "number" && value >= 0 ? value : null;
    }
    if (abs === "Continents") {
      const c = stats.countries?.[iso]?.continent;
      const value = c ? stats.continents?.[c]?.value : undefined;
      return typeof value === "number" && value > 0 ? value : null;
    }
    if (abs === "Regions") {
      const r = stats.countries?.[iso]?.region;
      const value = r ? stats.regions?.[r]?.value : undefined;
      return typeof value === "number" && value > 0 ? value : null;
    }
    return null;
  };

  const colorRamp = [
    "#FFEDA0",
    "#FED976",
    "#FEB24C",
    "#FD8D3C",
    "#FC4E2A",
    "#E31A1C",
    "#BD0026",
    "#800026"
  ];

  const buildThresholds = (values: number[]) => {
    if (values.length < 2) return [];

    const sorted = [...values].sort((a, b) => a - b);
    const thresholds: number[] = [];
    const lastValue = sorted[sorted.length - 1] ?? 0;

    for (let i = 1; i < colorRamp.length; i++) {
      const position = (sorted.length - 1) * (i / colorRamp.length);
      const lowerIndex = Math.floor(position);
      const upperIndex = Math.ceil(position);
      const lowerValue = sorted[lowerIndex] ?? lastValue;
      const upperValue = sorted[upperIndex] ?? lowerValue;
      thresholds.push(lowerValue + (upperValue - lowerValue) * (position - lowerIndex));
    }

    return thresholds;
  };

  const getColor = (value: number | null, thresholds: number[]) => {
    if (value === null) return "#d9d9d9";

    for (let i = 0; i < thresholds.length; i++) {
      const threshold = thresholds[i];
      if (threshold !== undefined && value <= threshold) return colorRamp[i];
    }

    return colorRamp[colorRamp.length - 1];
  };

  const metricValues = (bounds as any).features
    .map((feature: any) => getMetric(feature))
    .filter((value: number | null): value is number => value !== null);

  const thresholds = buildThresholds(metricValues);

  choroplethGeoJson = L.geoJSON(bounds as any, {
    pane: "choroplethPane",
    style: (feature) => {
      const val = getMetric(feature);
      let fillColor = getColor(val, thresholds);

      return {
        fillColor: fillColor,
        weight: abs === "Countries" ? 1 : 0, // hide borders to visually fuse regions/continents
        opacity: abs === "Countries" ? 1 : 0,
        color: "white",
        fillOpacity: 0.7,
      };
    },
    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: (e) => {
          const target = e.target;
          const targetIso = getIso(target.feature);
          const targetContinent = stats.countries?.[targetIso]?.continent;      
          const targetRegion = stats.countries?.[targetIso]?.region;

          choroplethGeoJson.eachLayer((l: any) => {
            const iso = getIso(l.feature);
            const continent = stats.countries?.[iso]?.continent;
            const region = stats.countries?.[iso]?.region;

            if (abs === "Continents" && targetContinent && targetContinent === continent) {
              l.setStyle({ weight: 2, color: "#222", opacity: 1 });
            } else if (abs === "Regions" && targetRegion && targetRegion === region) {
              l.setStyle({ weight: 2, color: "#222", opacity: 1 });
            } else if (abs === "Countries" && iso === targetIso) {
              l.setStyle({ weight: 2, color: "#222", opacity: 1 });
            }
          });
          
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            target.bringToFront();
          }
        },
        mouseout: (e) => {
          choroplethGeoJson.eachLayer((l: any) => {
            choroplethGeoJson.resetStyle(l);
          });
        },
        click: () => {
          const iso = getIso(feature);
          let clickedName = feature.properties.name;
          if (abs === "Continents") clickedName = stats.countries?.[iso]?.continent || clickedName;
          if (abs === "Regions") clickedName = stats.countries?.[iso]?.region || clickedName;
          emit("area-clicked", clickedName);
        },
      });

      const metric = getMetric(feature);
      const tooltipValue = metric === null ? "no data" : `${Math.round(metric * 100) / 100}`;
      let name = feature.properties.name;
      const tooltipIso = getIso(feature);
      if (abs === "Continents") name = stats.countries?.[tooltipIso]?.continent || name;
      if (abs === "Regions") name = stats.countries?.[tooltipIso]?.region || name;

      layer.bindTooltip(`<b>${name}</b><br/>${tooltipValue}`, { sticky: true });
    },
  }).addTo(choroplethLayerGroup);
}

watch([() => props.abstraction, boundariesData, aquastatData], drawChoropleth, { deep: true });

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

watch(() => props.showPins, (show) => {
  if (!map.value || !pinLayer) return;
  if (show !== false) {
    if (!map.value.hasLayer(pinLayer)) {
      pinLayer.addTo(map.value);
    }
  } else {
    map.value.removeLayer(pinLayer);
  }
});
</script>

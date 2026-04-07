<template></template>

<script setup lang="ts">
import * as L from "leaflet";

const PANE_NAME = "choroplethPane";

const { map, abstraction, targetVariable, targetYear } = defineProps<{
  map: L.Map;
  abstraction?: string;
  targetVariable?: string;
  targetYear?: string;
}>();

const emits = defineEmits<{
  (e: "area-clicked", name: string): void;
}>();

const { data: boundariesData } = useAsyncData("worldBounds", () =>
  $fetch("/world_countries.geojson")
);
const { data: aquastatData } = useAsyncData(
  "aquastatData",
  () =>
    $fetch<any>("/api/aquastat", {
      query: {
        targetVariable,
        targetYear
      }
    }),
  { watch: [() => targetVariable, () => targetYear] }
);

const choroplethLayerGroup = new L.LayerGroup();
let choroplethGeoJson: L.GeoJSON;

onMounted(() => {
  // pane for choropleth so it sits below lakes
  map.createPane(PANE_NAME);
  map.getPane(PANE_NAME)!.style.zIndex = "250"; // default tile layer is 200, points/vectors are usually 400

  choroplethLayerGroup.addTo(map);
});

onUnmounted(() => {
  map.getPane(PANE_NAME)?.remove();
});

function drawChoropleth() {
  if (
    !map ||
    !boundariesData.value ||
    !aquastatData.value ||
    !choroplethLayerGroup
  )
    return;

  choroplethLayerGroup.clearLayers();

  const bounds: any = boundariesData.value;
  const stats: any = aquastatData.value;
  const abs = abstraction || "Countries";

  const getIso = (feature: any) => {
    let iso = feature.properties["ISO3166-1-Alpha-3"];
    if (iso === "-99" || !iso) {
      const featureName = feature.properties.name;
      const found = Object.keys(stats.countries || {}).find(
        (k) => stats.countries[k].name === featureName
      );
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
      thresholds.push(
        lowerValue + (upperValue - lowerValue) * (position - lowerIndex)
      );
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
        fillOpacity: 0.6
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

            if (
              abs === "Continents" &&
              targetContinent &&
              targetContinent === continent
            ) {
              l.setStyle({ weight: 2, color: "#222", opacity: 1 });
            } else if (
              abs === "Regions" &&
              targetRegion &&
              targetRegion === region
            ) {
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
          if (abs === "Continents")
            clickedName = stats.countries?.[iso]?.continent || clickedName;
          if (abs === "Regions")
            clickedName = stats.countries?.[iso]?.region || clickedName;
          emits("area-clicked", clickedName);
        }
      });

      const metric = getMetric(feature);
      const tooltipValue =
        metric === null ? "no data" : `${Math.round(metric * 100) / 100}`;
      let name = feature.properties.name;
      const tooltipIso = getIso(feature);
      if (abs === "Continents")
        name = stats.countries?.[tooltipIso]?.continent || name;
      if (abs === "Regions")
        name = stats.countries?.[tooltipIso]?.region || name;

      layer.bindTooltip(`<b>${name}</b><br/>${tooltipValue}`, { sticky: true });
    }
  }).addTo(choroplethLayerGroup);
}

watch([() => abstraction, boundariesData, aquastatData], drawChoropleth, {
  deep: true
});
</script>

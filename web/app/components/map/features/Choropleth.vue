<template></template>

<script setup lang="ts">
import type { AquastatPayload } from "~~/server/api/aquastat.get";
import type {
  AquastatVariables,
  AquastatYears
} from "~~/server/utils/aquastatVars";
import * as L from "leaflet";
import type { AquastatAbstractions } from "~/pages/test.vue";

const { map, abstraction, targetVariable, targetYear, aquastatData } =
  defineProps<{
    map: L.Map;
    abstraction: AquastatAbstractions;
    targetVariable?: AquastatVariables;
    targetYear: AquastatYears;
    aquastatData?: AquastatPayload;
  }>();

const emits = defineEmits<{
  (e: "area-clicked", name: string): void;
}>();

const { data: boundariesData } = useAsyncData("worldBounds", () =>
  $fetch("/world_countries.geojson")
);

const choroplethLayerGroup = new L.LayerGroup();
let choroplethGeoJson: L.GeoJSON;

onMounted(() => {
  choroplethLayerGroup.addTo(map);
});

onUnmounted(() => {
  choroplethLayerGroup.removeFrom(map);
});

function drawChoropleth() {
  if (!map || !boundariesData.value || !aquastatData || !choroplethLayerGroup)
    return;

  choroplethLayerGroup.clearLayers();

  const bounds: any = boundariesData.value;
  const stats = aquastatData;
  const abs = abstraction || "Countries";

  const getIso = (feature: any) => {
    let iso = feature.properties["ISO3166-1-Alpha-2"];
    if (iso === "-99" || !iso) {
      const featureName = feature.properties.name;
      const found = Object.keys(stats.countries || {}).find(
        (k) => stats.countries[k]?.name === featureName
      );
      if (found) return found;
    }
    return iso;
  };

  const getMetric = (feature: any): number | null => {
    if (!targetVariable || !targetYear) return null;

    const iso = getIso(feature);
    if (abs === "countries") {
      const value =
        stats.countries?.[iso]?.values[targetVariable]?.[targetYear]?.value;
      return typeof value === "number" && value >= 0 ? value : null;
    }
    if (abs === "continents") {
      const c = stats.countries?.[iso]?.continent;
      const value = c
        ? stats.continents?.[c]?.values[targetVariable]?.[targetYear]?.value
        : undefined;
      return typeof value === "number" && value > 0 ? value : null;
    }
    if (abs === "regions") {
      const r = stats.countries?.[iso]?.region;
      const value = r
        ? stats.regions?.[r]?.values[targetVariable]?.[targetYear]?.value
        : undefined;
      return typeof value === "number" && value > 0 ? value : null;
    }
    return null;
  };

  const colorRamp = [
    "#006400",
    "#0B7A0B",
    "#1E8E1E",
    "#2FAE2F",
    "#66D966",
    "#90EE90",
    "#B6F2B6",
    "#D8F7D8",
    "#FFFFFF",
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
    if (value === null) return "#888888";

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
    style: (feature) => {
      const val = getMetric(feature);
      let fillColor = getColor(val, thresholds);

      return {
        fillColor: fillColor,
        weight: abs === "countries" ? 1 : 0, // hide borders to visually fuse regions/continents
        opacity: abs === "countries" ? 1 : 0,
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
              abs === "continents" &&
              targetContinent &&
              targetContinent === continent
            ) {
              l.setStyle({ weight: 2, color: "#222", opacity: 1 });
            } else if (
              abs === "regions" &&
              targetRegion &&
              targetRegion === region
            ) {
              l.setStyle({ weight: 2, color: "#222", opacity: 1 });
            } else if (abs === "countries" && iso === targetIso) {
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
          let clickedName = feature.properties["ISO3166-1-Alpha-2"];
          if (abs === "continents")
            clickedName = stats.countries?.[iso]?.continent || clickedName;
          if (abs === "regions")
            clickedName = stats.countries?.[iso]?.region || clickedName;
          emits("area-clicked", clickedName);
        }
      });

      const tooltipIso = getIso(feature);
      const isEstimatedRegion =
        abs === "regions"
          ? stats.regions?.[stats.countries?.[tooltipIso]?.region!]?.values[
              targetVariable!
            ]?.[targetYear!]?.estimate
          : false;
      const isEstimatedContinent =
        abs === "continents"
          ? stats.continents?.[stats.countries?.[tooltipIso]?.continent!]
              ?.values[targetVariable!]?.[targetYear!]?.estimate
          : false;
      const isEstimated = isEstimatedRegion || isEstimatedContinent;

      const metric = getMetric(feature);
      const hasNoData = metric === null;
      const shownDataNumber =
        metric !== null ? Math.round(metric * 100) / 100 : null;
      const tooltipValue = hasNoData
        ? "no data"
        : `${shownDataNumber}${isEstimated ? "*" : ""}`;

      let name = feature.properties.name;
      if (abs === "continents")
        name = stats.countries?.[tooltipIso]?.continent || name;
      if (abs === "regions")
        name = stats.countries?.[tooltipIso]?.region || name;

      layer.bindTooltip(`<b>${name}</b><br/>${tooltipValue}`, { sticky: true });
    }
  }).addTo(choroplethLayerGroup);
}

watch(() => [abstraction, boundariesData, aquastatData], drawChoropleth, {
  deep: true
});
</script>

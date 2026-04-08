<template>
  <!-- Select variables -->
  <!-- Abstraction (country region, continent) -->
  <!-- If map mode is choropleth, only allow setting one var -->
  <div class="flex flex-col gap-4 w-full">
    <div>
      <span class="font-semibold text-gray-700">Map View Abstraction:</span>
      <p class="text-sm text-gray-500 mb-1">
        Select the level of abstraction for the map view. <br />
        This will determine how the data is aggregated and displayed on the map.
      </p>
      <USelect
        v-model="selectedAbstraction"
        :items="abstractionOptions"
        placeholder="Select abstraction level"
        class="w-full"
        size="xl"
      />

      <!-- Select specific members of abstraction -->
      <div v-if="mapMode === 'lakeVis'">
        <span class="font-semibold text-gray-700"
          >Select {{ selectedAbstraction }}:</span
        >
        <p class="text-sm text-gray-500 mb-1">
          Select specific countries to focus on in the map view. <br />
          You can select multiple countries by holding down the Ctrl (Windows)
          or Command (Mac) key while clicking.
        </p>
        <USelectMenu
          v-model="selectedAbstractionMembers"
          :items="aquastatOptions?.abstractionMembers[selectedAbstraction]"
          :placeholder="`Select ${selectedAbstraction}`"
          class="w-full"
          size="xl"
          multiple
        />
      </div>
    </div>

    <div>
      <span class="font-semibold text-gray-700">Variable:</span>
      <p class="text-sm text-gray-500 mb-1">
        {{
          mapMode === "lakeVis"
            ? "Select one or more variables to visualize in the lake view."
            : "Select a variable to visualize in the choropleth view."
        }}
      </p>
      <USelect
        v-model="selectedVariable"
        :items="availableUsageVars"
        placeholder="Select a variable"
        class="w-full"
        :multiple="mapMode === 'lakeVis'"
        size="xl"
        :ui="{ content: 'min-w-fit' }"
      />

      <!-- Show each var selected -->
      <div
        v-if="mapMode === 'lakeVis' && selectedVariable.length"
        class="mt-2 flex flex-wrap gap-2"
      >
        <span
          v-for="variable in selectedVariable"
          :key="variable"
          class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          {{ variable }}
        </span>
      </div>
    </div>

    <!-- Quick option to select a lake in lakeVis mode -->
    <div v-if="mapMode === 'lakeVis'">
      <span class="font-semibold text-gray-700"
        >Select a lake to focus on:</span
      >
      <p class="text-sm text-gray-500 mb-1">
        This will zoom the lake visualization to the selected lake and show its
        data. <br />
        You can also select a lake by clicking on its pin in the map.
      </p>
      <USelectMenu
        :model-value="uiSelectedLake"
        @update:model-value="onLakeUpdate"
        :items="lakeOptions"
        placeholder="Select a lake"
        class="w-full"
        size="xl"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectItem } from "@nuxt/ui";
import type {
  AquastatVariables,
  AquastatYears
} from "~~/server/utils/aquastatVars";
import * as L from "leaflet";
import { ref } from "vue";
import type { MapModes } from "~/pages/test.vue";

const selectedVariable = defineModel<AquastatVariables[]>("selectedVariable", {
  type: [String, Array] as any,
  default: () => []
});

const selectedAbstractionMembers = defineModel<string[]>(
  "selectedAbstractionMembers",
  {
    type: Array as any,
    default: () => []
  }
);

const uiSelectedLake = ref<SelectItem | undefined>(undefined);

watch(selectedAbstraction, () => {
  selectedAbstractionMembers.value = [] as any; // Reset variable selection when changing abstraction
});

watch(
  () => mapMode,
  (newVal, oldVal) => {
    if (newVal === "choropleth" && oldVal === "lakeVis") {
      // If switching to choropleth, only keep the first selected variable
      if (Array.isArray(selectedVariable.value)) {
        selectedVariable.value = selectedVariable.value[0] as any;
      }
    } else if (newVal === "lakeVis" && oldVal === "choropleth") {
      // If switching to lakeVis, allow multiple variables again (but don't change current selection)
      if (!Array.isArray(selectedVariable.value)) {
        selectedVariable.value = [selectedVariable.value];
      }
    }

    // Filter vars based on available
    selectedVariable.value = Array.isArray(selectedVariable.value)
      ? (selectedVariable.value as AquastatVariables[]).filter((v) =>
          availableUsageVars.value.includes(v)
        )
      : availableUsageVars.value.includes(selectedVariable.value)
        ? selectedVariable.value
        : ("" as any);
  }
);

watch(selectedVariable, (newVal) => {
  if (Array.isArray(newVal) && newVal.length > 3) {
    // Limit to 3 variables for lakeVis to avoid clutter
    selectedVariable.value = (
      selectedVariable.value as AquastatVariables[]
    ).slice(1);
  }
});

const WATER_CONSUMPTION_RATE_VARS: AquastatVariables[] = [
  "Agricultural water withdrawal [10^9 m3/year]",
  "Industrial water withdrawal [10^9 m3/year]",
  "Municipal water withdrawal [10^9 m3/year]",
  "Fresh groundwater withdrawal [10^9 m3/year]",
  "Fresh surface water withdrawal [10^9 m3/year]",
  "Total freshwater withdrawal [10^9 m3/year]",
  "Total water withdrawal [10^9 m3/year]"
];

const availableUsageVars = computed(() => {
  if (mapMode === "lakeVis") {
    return WATER_CONSUMPTION_RATE_VARS.filter((v) =>
      aquastatOptions.value?.variables.includes(v)
    );
  }
  return aquastatOptions.value?.variables || [];
});
</script>

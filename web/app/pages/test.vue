<template>
  <UDashboardGroup>
    <UDashboardSidebar variant="inset" resizable>
      <!-- Select variables -->
      <!-- Abstraction (country region, continent) -->
      <!-- If map mode is choropleth, only allow setting one var -->
      <div class="flex flex-col gap-4 w-full">
        <div>
          <span class="font-semibold text-gray-700">Map View Abstraction:</span>
          <p class="text-sm text-gray-500 mb-1">
            Select the level of abstraction for the map view. <br />
            This will determine how the data is aggregated and displayed on the
            map.
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
              You can select multiple countries by holding down the Ctrl
              (Windows) or Command (Mac) key while clicking.
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
            size="xl"
            :ui="{ content: 'min-w-fit' }"
          />
        </div>

        <!-- Quick option to select a lake in lakeVis mode -->
        <div v-if="mapMode === 'lakeVis'">
          <span class="font-semibold text-gray-700"
            >Select a lake to focus on:</span
          >
          <p class="text-sm text-gray-500 mb-1">
            This will zoom the lake visualization to the selected lake and show
            its data. <br />
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
        {{ selectedAbstraction }}
        {{ selectedVariable }}
      </div>
    </UDashboardSidebar>

    <div class="p-4 w-full h-10/12">
      <div class="w-full flex items-center justify-end gap-2">
        <span class="font-semibold text-gray-700">Map Mode:</span>
        <SelectionIcon
          name="game-icons:molecule"
          @click="showMole = !showMole"
          :active="showMole"
          displayName="Toggle Mole View"
        />
        <SelectionIcon
          name="game-icons:wireframe-globe"
          @click="mapMode = 'choropleth'"
          :active="mapMode === 'choropleth'"
          display-name="Choropleth View"
        />
        <SelectionIcon
          name="game-icons:river"
          @click="mapMode = 'lakeVis'"
          :active="mapMode === 'lakeVis'"
          display-name="Lake Visualization View"
        />
      </div>
      <div class="overflow-hidden rounded-xl size-full mb-4">
        <Map
          ref="map"
          :mapMode
          v-model:selected-lake="selectedLake"
          :target-variable="selectedVariable"
          :abstraction="selectedAbstraction"
        />
      </div>

      <div class="p-4 w-full h-2/12 rounded-xl">SLIDER GOES HERE</div>
    </div>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { SelectItem } from "@nuxt/ui";
import type { AquastatVariables } from "~~/server/utils/aquastatVars";
import Map from "~/components/map/Map.vue";
import SelectVariables from "~/components/selector/SelectVariables.vue";
import SelectionIcon from "~/components/ui/SelectionIcon.vue";

const abstractionOptions: SelectItem[] = [
  { label: "Countries", value: "countries" },
  { label: "Regions", value: "regions" },
  { label: "Continents", value: "continents" }
];

const { data: aquastatOptions } = useFetch("/api/aquastat-options");

const { data: availableLakes } = useFetch(
  "/api/supplementary/waterBodies/simple"
);

const lakeOptions = computed(() => {
  return (
    availableLakes.value?.map<SelectItem>((lake) => ({
      label: lake.name,
      value: lake._id
    })) ?? []
  );
});

const selectedLake = ref<string | undefined>(undefined);

const mapMode = ref<MapModes>("choropleth");
const showMole = ref(false);

export type MapModes = "lakeVis" | "choropleth";
export type AquastatAbstractions = "countries" | "regions" | "continents";

const map = useTemplateRef("map");
const selectedAbstraction = ref<AquastatAbstractions>("countries");
const abstractionMembers = ref<string[]>([]);
const selectedVariable = ref<AquastatVariables>(
  "Agricultural water withdrawal [10^9 m3/year]"
);

watch(selectedAbstraction, () => {
  abstractionMembers.value = [] as any; // Reset variable selection when changing abstraction
});

watch(mapMode, (newVal, oldVal) => {
  // Filter vars based on available
  selectedVariable.value = availableUsageVars.value.includes(
    selectedVariable.value
  )
    ? selectedVariable.value
    : "Agricultural water withdrawal [10^9 m3/year]";
});

watch(selectedAbstraction, () => {
  abstractionMembers.value = [] as any; // Reset variable selection when changing abstraction
});

const uiSelectedLake = ref<SelectItem | undefined>(undefined);

function onLakeUpdate(newLake: SelectItem) {
  uiSelectedLake.value = newLake;
  selectedLake.value = newLake.value;
  if (map.value?.map) {
    const lakeData = availableLakes.value?.find(
      (lake) => lake._id === newLake.value
    );
    if (lakeData) {
      map.value?.map.setView(lakeData.position.toReversed(), 8);
    }
  }
}

watch(mapMode, (newMode, oldMode) => {
  if (newMode === "choropleth" && oldMode === "lakeVis") {
    selectedLake.value = undefined; // Reset selected lake when switching off lakeVis mode
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
  if (mapMode.value === "lakeVis") {
    return WATER_CONSUMPTION_RATE_VARS.filter((v) =>
      aquastatOptions.value?.variables.includes(v)
    );
  }
  return aquastatOptions.value?.variables || [];
});
</script>

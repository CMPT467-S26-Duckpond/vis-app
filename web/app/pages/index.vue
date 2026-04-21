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
            :items="availableAbstractions"
            placeholder="Select abstraction level"
            class="w-full"
            size="xl"
            :ui="{ content: 'min-w-fit' }"
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
              v-model="abstractionMembers"
              :items="aquastatOptions?.abstractionMembers[selectedAbstraction]"
              :placeholder="`Select ${selectedAbstraction}`"
              class="w-full"
              size="xl"
              multiple
              :ui="{ content: 'min-w-fit' }"
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
            :model-value="
              lakeOptions.find((o) => o.value === selectedLake)?.label ?? ''
            "
            @update:model-value="onLakeUpdate"
            :items="lakeOptions"
            placeholder="Select a lake"
            class="w-full"
            size="xl"
          />
        </div>
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
          :disabled="mapMode !== 'choropleth'"
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
        <div class="flex size-full flex-col">
          <div class="w-full h-4/12" v-if="showMole">
            <MoleView
              :abstraction="selectedAbstraction"
              :target-variable="selectedVariable"
              :target-variable-y="selectedVariable"
              :target-year="targetYear"
              :aquastat-data="aquastatData"
              :selected-area="selectedArea"
            />
          </div>
          <div class="w-full" :class="showMole ? 'h-8/12' : 'h-full'">
            <Map
              ref="map"
              :mapMode
              v-model:selected-lake="selectedLake"
              :target-variable="selectedVariable"
              :abstraction="selectedAbstraction"
              :abstractionMembers="abstractionMemberValues"
              :targetYear="targetYear"
              :drainProgress="drainProgress"
              :aquastatData="aquastatData"
              @area-clicked="selectedArea = $event"
            />
          </div>
        </div>
      </div>

      <div class="p-4 w-full h-2/12 rounded-xl">
        <div class="flex items-center gap-2" v-if="mapMode === 'choropleth'">
          <UButton
            :label="isPlaying ? 'Pause' : 'Play'"
            color="primary"
            variant="soft"
            size="sm"
            :disabled="!availableYears.length"
            @click="togglePlayback"
          />
          <div class="flex flex-col gap-0.5 flex-1 min-w-0">
            <USlider
              v-model="yearSliderIndex"
              :min="0"
              :max="Math.max(availableYears.length - 1, 0)"
              :step="1"
              :disabled="!availableYears.length"
              class="w-full"
            />
            <div
              class="flex items-center justify-between text-[10px] leading-none text-gray-500 tabular-nums"
            >
              <span>{{ aquastatOptions?.minYear || "—" }}</span>
              <span class="font-medium text-gray-700">{{
                currentYearLabel || "—"
              }}</span>
              <span>{{ aquastatOptions?.maxYear || "—" }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2" v-if="mapMode === 'lakeVis'">
          <USelectMenu
            v-model="targetYear"
            :items="availableYears"
            placeholder="Select a year"
            size="xl"
            :ui="{ content: 'min-w-fit' }"
          />
          <div class="flex flex-col gap-0.5 flex-1 min-w-0">
            <USlider
              v-model="drainProgress"
              :min="0"
              :max="365"
              :step="1"
              :disabled="!availableYears.length"
              class="w-full"
            />
            <div
              class="flex items-center justify-between text-[10px] leading-none text-gray-500 tabular-nums"
            >
              <span>January 1st</span>
              <span>Day {{ drainProgress }} </span>
              <span>December 31st</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { LatLngTuple } from "leaflet";
import type { AquastatPayload } from "~~/server/api/aquastat.get";
import {
  type AquastatYears,
  type AquastatVariables
} from "~~/server/utils/aquastatVars";
import Map from "~/components/map/Map.vue";
import MoleView from "~/components/mole/MoleView.vue";
import SelectionIcon from "~/components/ui/SelectionIcon.vue";

export type CustomSelectItem = {
  label: string;
  value: string;
};

const { data: aquastatOptions } = useFetch("/api/aquastat-options");

const { data: availableLakes } = useFetch(
  "/api/supplementary/waterBodies/simple"
);

const targetYear = ref<AquastatYears>("2022");
const isPlaying = ref(false);

const drainProgress = ref(0);

let playbackTimer: ReturnType<typeof setInterval> | null = null;
function stopPlayback() {
  if (playbackTimer) {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }
  isPlaying.value = false;
}

function stepYear(direction: 1 | -1) {
  const years = availableYears.value;
  if (!years.length) return;

  const nextIndex = yearSliderIndex.value + direction;
  if (nextIndex >= years.length) {
    stopPlayback();
    return;
  }

  if (nextIndex < 0) {
    yearSliderIndex.value = years.length - 1;
    return;
  }

  yearSliderIndex.value = nextIndex;
}

function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback();
    return;
  }

  if (!availableYears.value.length) return;

  isPlaying.value = true;
  playbackTimer = setInterval(() => {
    if (!availableYears.value.length) {
      stopPlayback();
      return;
    }

    stepYear(1);
  }, 1400);
}

const availableYears = computed(() => aquastatOptions.value?.years || []);

const currentYearLabel = computed(() => {
  return targetYear.value || availableYears.value[yearSliderIndex.value] || "";
});

const yearSliderIndex = computed({
  get() {
    const years = availableYears.value;
    if (!years.length) return 0;

    const selectedIndex = years.indexOf(targetYear.value);
    return selectedIndex >= 0 ? selectedIndex : years.length - 1;
  },
  set(nextIndex: number) {
    const years = availableYears.value;
    if (!years.length) return;

    const clampedIndex = Math.min(
      Math.max(Math.round(nextIndex), 0),
      years.length - 1
    );
    const nextYear = years[clampedIndex];
    if (nextYear) {
      targetYear.value = nextYear;
    }
  }
});

const lakeOptions = computed(() => {
  return (
    availableLakes.value?.map<CustomSelectItem>((lake) => ({
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
const abstractionMembers = ref<CustomSelectItem[]>([]);
const selectedVariable = ref<AquastatVariables>(
  "Agricultural water withdrawal [10^9 m3/year]"
);

watch(selectedAbstraction, () => {
  abstractionMembers.value = [] as any; // Reset variable selection when changing abstraction
});

function onLakeUpdate(newLake: CustomSelectItem) {
  selectedLake.value = newLake.value;
  if (map.value?.map) {
    const lakeData = availableLakes.value?.find(
      (lake) => lake._id === newLake.value
    );
    if (lakeData) {
      map.value?.map.setView(
        lakeData.position.toReversed() as any as LatLngTuple,
        8
      );
    }
  }
}

const selectedArea = ref<string | undefined>();
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

watch(
  mapMode,
  (newMode, oldMode) => {
    if (newMode === "choropleth" && oldMode === "lakeVis") {
      selectedLake.value = undefined; // Reset selected lake when switching off lakeVis mode
    }

    if (newMode === "lakeVis" && oldMode === "choropleth") {
      selectedArea.value = undefined;
      showMole.value = false; // Hide mole view when switching to lakeVis, as it may not be relevant and can be overwhelming with the lake visualization
    }

    // Filter vars based on available
    selectedVariable.value = availableUsageVars.value.includes(
      selectedVariable.value
    )
      ? selectedVariable.value
      : "Agricultural water withdrawal [10^9 m3/year]";
  },
  {
    immediate: true
  }
);

const abstractionMemberValues = computed(() => {
  return abstractionMembers.value.map((m) => m.value);
});

const { data: aquastatData } = useAsyncData(
  "aquastatData",
  () =>
    $fetch<AquastatPayload>("/api/aquastat", {
      query: {
        targetVariable: selectedVariable.value,
        targetYear: targetYear.value
      }
    }),
  { watch: [() => selectedVariable.value, () => targetYear.value] }
);

const abstractionOptions: CustomSelectItem[] = [
  { label: "Countries", value: "countries" },
  { label: "Regions", value: "regions" },
  { label: "Continents", value: "continents" }
];

const availableAbstractions = computed<CustomSelectItem[]>(() => {
  // No country allowed in lakeVis
  if (mapMode.value === "lakeVis") {
    return abstractionOptions.filter((o) => o.value !== "continents");
  } else {
    return abstractionOptions;
  }
});

watch(availableAbstractions, (newVal) => {
  if (!newVal.find((o) => o.value === selectedAbstraction.value)) {
    selectedAbstraction.value = newVal[0]?.value as AquastatAbstractions;
  }
});

watch(selectedVariable, (newVar) => {
  selectedArea.value = undefined; // Reset selected area when variable changes, as the data and thus the areas may be different
});
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- UI Controls Section -->
    <div
      class="p-4 border-b flex items-center justify-between shadow-sm bg-white shrink-0 z-[1000] relative"
    >
      <div class="flex items-center gap-6">
        <span class="font-semibold text-gray-700">Map View Abstraction:</span>
        <select v-model="activeAbstraction" class="border p-2 rounded">
          <option value="Countries">Countries</option>
          <option value="Regions">Regions</option>
          <option value="Continents">Continents</option>
        </select>
        <span class="font-semibold text-gray-700">Variable:</span>
        <select v-model="targetVariable" class="border p-2 rounded max-w-xl">
          <option v-for="variable in optionData?.variables || []" :key="variable" :value="variable">
            {{ variable }}
          </option>
        </select>
        <span class="font-semibold text-gray-700">Year:</span>
        <select v-model="targetYear" class="border p-2 rounded w-28">
          <option v-for="year in optionData?.years || []" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
        <label class="flex items-center gap-2 cursor-pointer ml-4">
          <input type="checkbox" v-model="showPins" class="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500" />
          <span class="text-sm font-medium text-gray-700">Show Lake Pins</span> 
        </label>
      </div>
      <div class="text-sm font-medium text-gray-600">
        Selected Area:
        <span class="text-primary font-bold">{{ selectedMapArea || "None" }}</span>
      </div>
    </div>

    <!-- Map Section -->
    <div class="flex-grow relative">
      <Map
        :abstraction="activeAbstraction"
        :showPins="showPins"
        :target-variable="targetVariable"
        :target-year="targetYear"
        @area-clicked="selectedMapArea = $event"
      />
    </div>
  </div>
</template>

<!-- 
  Make sure when you are defining your own components to follow this script tag syntax exactly! Otherwise things will break in strange and confusing ways 

  If you starting reading Vue's documentation, make sure you follow examples that use the "Composition syntax" (as opposed to the options syntax)
-->
<script setup lang="ts">
// This is importing our custom Map component that we defined in the components folder
import Map from "~/components/map/Map.vue";
import { ref, watch } from "vue";

const activeAbstraction = ref("Countries");
const showPins = ref(true);
const selectedMapArea = ref<string | null>(null);
const targetVariable = ref("");
const targetYear = ref("");

const { data: optionData } = useAsyncData("aquastatOptions", () => $fetch<{
  variables: string[];
  years: string[];
  defaultVariable: string | null;
  defaultYear: string | null;
}>("/api/aquastat-options"));

watch(optionData, (data) => {
  if (!data) return;
  if (!targetVariable.value) {
    targetVariable.value = data.defaultVariable || data.variables[0] || "";
  }
  if (!targetYear.value) {
    targetYear.value = data.defaultYear || data.years[data.years.length - 1] || "";
  }
}, { immediate: true });
</script>

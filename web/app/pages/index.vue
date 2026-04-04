<template>
  <div class="h-screen flex flex-col">
    <!-- UI Controls Section -->
    <div
      class="p-4 border-b flex items-center justify-between shadow-sm bg-white shrink-0 z-[1000] relative"
    >
      <div class="flex items-center gap-6 flex-wrap">
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
        <span class="font-semibold text-gray-700">Compairison Variable:</span>
        <select v-model="targetVariableY" class="border p-2 rounded max-w-xl">
          <option v-for="variable in optionData?.variables || []" :key="variable" :value="variable">
            {{ variable }}
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

    <MoleView
        :abstraction="activeAbstraction"
        :target-variable-x="targetVariable"
        :target-variable-y="targetVariableY"
        :target-year="targetYear"/>
    <!-- Map Section -->
    <div class="flex-grow relative">
      <Map
        :abstraction="activeAbstraction"
        :showPins="showPins"
        :target-variable="targetVariable"
        :target-year="targetYear"
        @area-clicked="selectedMapArea = $event"
      />

      <div class="fixed bottom-10 left-1/2 z-[1101] -translate-x-1/2">
        <div
          v-if="showTimelineControls"
          class="mb-3 w-[min(42rem,calc(100vw-1.5rem))] rounded-2xl border border-white/70 bg-white/90 p-2 shadow-2xl backdrop-blur-md"
        >
          <div class="flex items-center gap-2">
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
                <div class="flex items-center justify-between text-[10px] leading-none text-gray-500 tabular-nums">
                  <span>{{ optionData?.minYear || '—' }}</span>
                  <span class="font-medium text-gray-700">{{ currentYearLabel || '—' }}</span>
                  <span>{{ optionData?.maxYear || '—' }}</span>
                </div>
            </div>
            <UButton
              label="Close"
              color="gray"
              variant="ghost"
              size="xs"
              @click="showTimelineControls = false"
            />
          </div>
        </div>

        <UButton
          v-else
          label="Time"
          color="primary"
          variant="solid"
          icon="i-lucide-timer-reset"
          class="rounded-full shadow-2xl"
          @click="showTimelineControls = true"
        />
      </div>
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
import MoleView from "~/components/mole/MoleView.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";

const activeAbstraction = ref("Countries");
const showPins = ref(true);
const selectedMapArea = ref<string | null>(null);
const targetVariable = ref("");
const targetVariableY = ref("");
const targetYear = ref("");
const isPlaying = ref(false);
const showTimelineControls = ref(false);
let playbackTimer: ReturnType<typeof setInterval> | null = null;

const { data: optionData } = useAsyncData("aquastatOptions", () => $fetch<{
  variables: string[];
  years: string[];
  defaultVariable: string | null;
  defaultYear: string | null;
}>("/api/aquastat-options"));

const availableYears = computed(() => optionData.value?.years || []);

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

    const clampedIndex = Math.min(Math.max(Math.round(nextIndex), 0), years.length - 1);
    const nextYear = years[clampedIndex];
    if (nextYear) {
      targetYear.value = nextYear;
    }
  }
});

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

watch(availableYears, (years) => {
  if (!years.length) return;
  if (!targetYear.value || !years.includes(targetYear.value)) {
    targetYear.value = optionData.value?.defaultYear || years[years.length - 1] || "";
  }
}, { immediate: true });

watch(optionData, (data) => {
  if (!data) return;
  if (!targetVariable.value) {
    targetVariable.value = data.defaultVariable || data.variables[0] || "";
  }
  if (!targetYear.value) {
    targetYear.value = data.defaultYear || data.years[data.years.length - 1] || "";
  }
}, { immediate: true });

onBeforeUnmount(() => {
  stopPlayback();
});
</script>

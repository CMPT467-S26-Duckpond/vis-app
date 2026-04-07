<template>
  <UDashboardGroup>
    <UDashboardSidebar variant="inset" resizable>
      <SelectVariables :mapMode />
    </UDashboardSidebar>

    <div class="p-4 w-full h-10/12">
      <div class="w-full flex items-end justify-end gap-2">
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
        <Map :mapMode />
      </div>

      <div class="p-4 w-full h-2/12 rounded-xl">SLIDER GOES HERE</div>
    </div>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import Map from "~/components/map/Map.vue";
import SelectVariables from "~/components/selector/SelectVariables.vue";
import SelectionIcon from "~/components/ui/SelectionIcon.vue";

export type MapModes = "lakeVis" | "choropleth";

const mapMode = ref<MapModes>("choropleth");
const showMole = ref(false);
</script>

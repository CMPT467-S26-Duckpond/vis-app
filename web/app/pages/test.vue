<script setup lang="ts">
import Map from "~/components/map/Map.vue";
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar variant="inset" resizable>
      EVERYTHING IS FINE
    </UDashboardSidebar>

    <div class="p-4 size-full">
      <div class="overflow-hidden rounded-xl size-full">
        <Map show-pins />
      </div>
    </div>
  </UDashboardGroup>
</template>

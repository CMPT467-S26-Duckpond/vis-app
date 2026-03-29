<template>
  <Map />
</template>

<!-- 
  Make sure when you are defining your own components to follow this script tag syntax exactly! Otherwise things will break in strange and confusing ways 

  If you starting reading Vue's documentation, make sure you follow examples that use the "Composition syntax" (as opposed to the options syntax)
-->
<script setup lang="ts">
// This is importing our custom Map component that we defined in the components folder
import Map from "~/components/map/Map.vue";
</script>

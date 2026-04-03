<!-- Adapted from: https://dev.to/jacobandrewsky/building-charts-in-vue-with-d3-38gl -->
<!-- Adapted from: https://observablehq.com/@harrylove/draw-a-circle-with-d3 -->


<template>
    <svg v-bind:id="moleId" ref="svg">
    </svg>
</template>

<script setup lang="ts">

// const {a,b,c} = defineProps<{a:type, b:type, c:type}>();
//                                                              VS
// const {a,b,c} = defineProps({a:type, b:type, c:type});


const {xAxis, yAxis, moleId} = defineProps<{ 
    xAxis: number, 
    yAxis: number, 
    moleId: string }>();

    
    import {
        fetchCsv,
        getLatestYearWaterUsage,
        WATER_VARIABLES,
        type ParsedCsv,
    } from "./dataUtils";
    
    // import TimeSlider from "./timeSlider/TimeSlider.vue"; // STEAL BEA'S SLIDER
    
    import * as d3 from "d3";
    import { ref, onMounted, useTemplateRef } from "vue";
    
    const svg = ref(null);

    const width = 928;
    const height = 150;
    const drawMole = () => {
        
        console.log("drawing Mole");
        const mole = d3.select(svg.value); // How to reference a prop in script vue
        // mole.selectAll('*').remove() // Clear previous renders
        
        mole.attr('width', width).attr('height', height)

        console.log(`Selected Mole: ${mole}`);
        mole.append('ellipse')
        .attr('cx', xAxis)
        .attr('cy', yAxis)
        .attr('rx', xAxis)
        .attr('ry', yAxis)
        .style('fill', 'green');

    };
    onMounted(drawMole);
    watch(() => xAxis, drawMole);

</script>

<style>

</style>
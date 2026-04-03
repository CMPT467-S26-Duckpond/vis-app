<!-- Adapted from: https://dev.to/jacobandrewsky/building-charts-in-vue-with-d3-38gl -->
<!-- Adapted from: https://observablehq.com/@harrylove/draw-a-circle-with-d3 -->


<template>
    <svg v-bind:id="moleId">
        <circle rx={{xAxis}} ry={{yAxis}}>

        </circle>
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

    const svg = ref(null)


    import {
        fetchCsv,
        getLatestYearWaterUsage,
        WATER_VARIABLES,
        type ParsedCsv,
    } from "./dataUtils";

    // import TimeSlider from "./timeSlider/TimeSlider.vue"; // STEAL BEA'S SLIDER

    import * as d3 from "d3";
    import { ref, onMounted, useTemplateRef } from "vue";

    const drawMole = () => {
        
        console.log("drawing Mole");
        const mole = d3.select(moleId); // How to reference a prop in script vue
        mole.append('circle')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', 20)
        .style('fill', 'green');

    };

    const width = 928;
    const height = 680;
    onMounted(drawMole);
    watch(() => xAxis, drawMole);


    
</script>

<style>

</style>
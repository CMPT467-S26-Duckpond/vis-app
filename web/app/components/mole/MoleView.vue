<!-- SVG Docs: https://www.w3.org/TR/SVG/ -->
<template>
    <div>
        <h2>
            Mole Viz
        </h2>
        <div>
            <input type="radio" class="mole-view" id="world-mole" name="world" @click="(event) => loadMoleData(event)"  />
            <label for="world-mole"> World View </label>
            <input type="radio" class="mole-view" id="region-mole" name="region"  />
            <label for="region-mole"> Region View </label>
            <input type="radio" class="mole-view" id="continent-mole" name="continent"  />
            <label for="continent-mole"> Continent View </label>
        </div>
        <div id = "mole-container">
            <Mole :xAxis=4 :yAxis=5 moleId="mole1" props={{bogusData }} />
        </div>
    </div>
</template>

<script setup lang="ts">
    // Adapted From :https://observablehq.com/@d3/disjoint-force-directed-graph/2

    // Level drop down

    import Mole from "~/components/mole/Mole.vue";

    const worldData = ref([
        { id: 1, title: 'My journey with Vue' },
        { id: 2, title: 'Blogging with Vue' },
        { id: 3, title: 'Why Vue is so fun' }
    ])

    const regionData = ref([
        { id: 1, title: 'My journey with Vue' },
        { id: 2, title: 'Blogging with Vue' },
        { id: 3, title: 'Why Vue is so fun' }
    ])

    const contiData = ref([
        { id: 1, title: 'My journey with Vue' },
        { id: 2, title: 'Blogging with Vue' },
        { id: 3, title: 'Why Vue is so fun' }
    ])

    const bogusData = ref({"data":[34,53,66]});
    import {
        fetchCsv,
        getLatestYearWaterUsage,
        WATER_VARIABLES,
        type ParsedCsv,
    } from "./dataUtils";

    // bogusData.forEach((data) => console.log(data)
    //     //TODO: Dynamically create a mole view based on the number of countries/area is in the selected level hierarchy.
    // );


    function loadMoleData(event: Event){
        console.log(event);

    };

    // import TimeSlider from "./timeSlider/TimeSlider.vue"; // STEAL BEA'S SLIDER

    import * as d3 from "d3";
    import { ref, onMounted, useTemplateRef } from "vue";
    const data = d3.csvParse("/aquastat_water_cleaned.csv")

    console.log("Data: = " + data)
    data.forEach((row) => console.log(row));
    
    const width = 640;
    const height = 400;
    const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

    // Beas prototype work below: 
    // const csvData = ref<ParsedCsv>();

    // const allCountries = computed(() => {
    // if (!csvData.value) return [];

    // const countries = new Set<string>();

    //     csvData.value.forEach((row) => {
    //         countries.add(row.country);
    //     });

    // return Array.from(countries);
    // });

    // const selectedCountries = ref<string[]>(["Canada"]);
    // const selectedVariables = ref<(keyof typeof WATER_VARIABLES)[]>([
    //     "Agricultural",
    //     "Industrial",
    //     "Municipal",
    // ]);





    
</script>

<style>

</style>
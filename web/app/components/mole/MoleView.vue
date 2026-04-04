<!-- SVG Docs: https://www.w3.org/TR/SVG/ -->
<template>
    <div>
        <h2>
            Mole Viz
        </h2>
        <div id = "mole-container">
            <!-- Idea: moleId = abstraction_name + "mole" -->
            <!-- <Mole :xPos=5 :yPos=5 :xAxis=25 :yAxis=5 moleId="mole1"  />
            <Mole :xPos=5 :yPos=5 :xAxis=25 :yAxis=55 moleId="mole2"  /> -->
            <Mole v-for="data in widthSubset || []" :data=widthData :xPos=5 :yPos=5 :xAxis=25 :yAxis=55 moleId="mole2"  />
        </div>
    </div>
</template>

<script setup lang="ts">
    // Adapted From :https://observablehq.com/@d3/disjoint-force-directed-graph/2

    // Level drop down

    import Mole from "~/components/mole/Mole.vue";
    import {filterDataByAbstraction, fetchData, printData} from "~/components/mole/dataUtils";
    
    const xStart = 10;
    const yStart = 10;

    const xPos = ref(xStart);
    const yPos = ref(yStart);
    const moleValues = ref();
    
    
    
    const props = defineProps<{
        abstraction?: string;
        targetVariable?: string;
        targetVariableY?: string;
        targetYear?: string;
    }>();
    const abstraction = props.abstraction || "Countries";

    // Fetch the Width data of the elipse
    // Makes an HTTP request with targetVariable and targetYear as variables 
    // i.e /api/aquastat?targetVariable=...&targetYear=...
    
    // Call fetch data and extract values   

    let widthSubset = ref(null);
    let heightSubset = ref(null);

    
    const fetchElipseData = async () => {
        
        // Fetch the Height data of the elipse  
        const widthData :Promise<any> = await fetchData(props.targetVariable, props.targetYear);
        const heightData :Promise<any> = await fetchData(props.targetVariableY, props.targetYear);
        printData(widthData, "Fetched Width Data");
        widthSubset = filterDataByAbstraction(widthData, abstraction);
        heightSubset = filterDataByAbstraction(heightData, abstraction);
    };


    //TODO: Dynamically create a mole view based on the number of countries/area is in the selected level hierarchy.
    console.log(`aqua stat data width = ${widthSubset.value}`);

    import * as d3 from "d3";
    import { ref, onMounted, useTemplateRef } from "vue";
    
    const width = 640;
    const height = 400;
    const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);
    
    //console.log(`Value = ${aquastatDataHeight.value}`);
    console.log(`widthSubset = ${widthSubset}`);

    //Lifecycle Hooks
    onMounted(fetchElipseData);
    watch(props,fetchElipseData);
    
</script>

<style>

</style>
<!-- SVG Docs: https://www.w3.org/TR/SVG/ -->
<template>
    <div>
        <h2>
            Year: {{year}}
        </h2>
        <div id = "mole-container">
            <!-- Idea: moleId = abstraction_name + "mole" -->
            <!-- <Mole :xPos=5 :yPos=5 :xAxis=25 :yAxis=5 moleId="mole1"  />
            <Mole :xPos=5 :yPos=5 :xAxis=25 :yAxis=55 moleId="mole2"  /> -->
            <!-- <Mole v-for="widthData in widthSubset || []" :data=widthData :xPos=5 :yPos=5 :yAxis=55 moleId="mole2"  /> -->
        </div>
        <svg ref="svg">
        
        </svg>
    </div>
</template>

<script setup lang="ts">
    // Adapted From :https://observablehq.com/@d3/disjoint-force-directed-graph/2

    // Level drop down
    const svg = ref<SVGSVGElement>(null);

    import Mole from "~/components/mole/Mole.vue";
    import {filterDataByAbstraction, fetchData, printData, getMoleColour, createID} from "~/components/mole/dataUtils";
    import {addEllipseTest} from "~/components/mole/TestCases";
    import * as d3 from "d3";
    import { ref, onMounted, useTemplateRef } from "vue";
    
    const xStart = 10;
    const yStart = 10;
    
    

    const xPos = ref(xStart);
    const yPos = ref(yStart);

    
    
    
    const props = defineProps<{
        abstraction?: string;
        targetVariable?: string;
        targetVariableY?: string;
        targetYear?: string;
        selectedArea?: string | null;
    }>();

    const year = ref(props.targetYear);

    const abstraction = props.abstraction || "Countries";

    // Fetch the Width data of the elipse
    // Makes an HTTP request with targetVariable and targetYear as variables 
    // i.e /api/aquastat?targetVariable=...&targetYear=...
    
    // Call fetch data and extract values   

    let widthSubset = ref<Object>(Object);
    let heightSubset = ref(null);
    
    // Zoom D3 Example: https://observablehq.com/@d3/programmatic-zoom?collection=@d3/d3-zoom
    const fetchElipseData = async () => {
        year.value = props.targetYear;
        const moleFrame = d3.select<SVGSVGElement, unknown>(svg.value);
        const width = 928;
        const height = 300;
        moleFrame.attr("viewBox", [0, 0, width, height]);
        const g = moleFrame.append("g").attr("cursor", "grab");

        // Remove all previously drawn data ellipses
        g.selectAll('*').remove();
        //moleFrame.attr('width', width).attr('height', height);
        
        // Fetch the Height data of the elipse  
        const widthData :Promise<Object> = await fetchData(
            props.targetVariable, 
            props.targetYear);
        const heightData :Promise<any> = await fetchData(props.targetVariableY, props.targetYear);
        
        const filteredData = (filterDataByAbstraction(widthData, abstraction));
        
        widthSubset.value = filteredData ? Object.values(filteredData) : [];

        const widthSubset2 = filteredData ? Object.values(filteredData) : [];

        heightSubset = filterDataByAbstraction(heightData, abstraction);

        let xPositon = 0;
        const padding = 5;
        
        // For every abstract data type we create an elipse with an id == data.name
        widthSubset2.forEach((data: any, index) => {

            //console.log(`Item = ${data}, index = ${index}`);
            if(data.value > 0){
                printData(data, "Elipse data");
                var tooltip = g.append("div").style("position", "absolute").style("visibility", "hidden").text(data.name);
                xPositon = xPositon + (data.value *.03) + padding ; // Put centre at 1/2 the distance of the elipse width
                const newEllipse = g.append('ellipse')
                .attr("id", createID(`${data.name}`))
                .attr('cx', xPositon)
                .attr('cy', 10)
                .attr('rx', Math.round(data.value *.03))
                .attr('ry', Math.round(data.value *.03))
                .style('fill', getMoleColour(data.value,abstraction))
                .on("mouseover", () => tooltip.style("visibility", "visible"))
                .on("mouseout", () => tooltip.style("visibility", "hidden"));
                xPositon = xPositon + (data.value *.03 + padding); // Put centre at 1/2 the distance of the elipse width
                
                console.log(` assigned id == #${newEllipse.attr("id")}`);
            }


        });

        moleFrame.call(d3.zoom<SVGSVGElement, unknown>()
        .extent([[0, 0], [width*100, height*100]])
        .scaleExtent([1, 100])
        .on("zoom", ({transform}) => {
            //What to do when zooming on the ellipses
            console.log(`ZOOOMING`);
            g.attr("transform", transform);
        }));

        if(props.selectedArea !== null){
        // const
            // get abstraction element that was selected
            const selectedData = g.select(createID(`#${props.selectedArea}`));

            if(selectedData.empty()){
                console.log(`selected id =  #${createID(props.selectedArea)}`);
                console.log(`Selected data = ${selectedData} IS EMPTY`);

            }else{
                
                console.log(`Selected data = ${selectedData} ~NOT~ EMPTY`);
            }
            if(selectedData === undefined){
                console.log(`Selected data = ${selectedData} IS UNDEFINDED`);
            }else{
                console.log(`Selected data = ${selectedData} IS ~NOT~ UNDEFINDED`);

            }
            console.log(`Selected data = ${selectedData}`);
            // get coordinate locations of selecte element
            const x = (selectedData.attr("cx"));
            const y = (selectedData.attr("cy"));
            const elipseWidth = (selectedData.attr("rx"));
            const elipseHeight = (selectedData.attr("rx"));
            console.log(` x = ${x}, y = ${y}, width = ${elipseWidth}, height = ${elipseHeight}`);

            //translate the view to selected element

        }

        
        
    };


    //TODO: Dynamically create a mole view based on the number of countries/area is in the selected level hierarchy.
    console.log(`aqua stat data width = ${widthSubset.value}`);
    
    //console.log(`Value = ${aquastatDataHeight.value}`);
    printData(widthSubset, "widthSubset");

    //Lifecycle Hooks
    onMounted(()=>{
        
        fetchElipseData()
    
    }
    );
    watch(props,fetchElipseData);

    function drawMole(){
        console.log("Drawing Mole");
    }



    
</script>

<style>

</style>
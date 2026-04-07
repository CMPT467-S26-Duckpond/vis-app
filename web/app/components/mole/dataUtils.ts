import * as d3 from "d3";

const { data: boundariesData } = await useAsyncData("worldBounds", () => $fetch("/world_countries.geojson"));
const bounds: any = boundariesData.value;

  const colorRamp = <string[]>[
    "#FFEDA0",
    "#FED976",
    "#FEB24C",
    "#FD8D3C",
    "#FC4E2A",
    "#E31A1C",
    "#BD0026",
    "#800026"
  ];

function getIso(feature: any, stats:any){
    let iso = feature.properties['ISO3166-1-Alpha-3'];
    if (iso === '-99' || !iso) {
      const featureName = feature.properties.name;
      const found = Object.keys(stats.countries || {}).find(k => stats.countries[k].name === featureName);
      if (found) return found;
    }
    return iso;
  };

function getMetric(stats: any, abstraction: string, feature: any){
  const iso = getIso(feature, stats);
      if (abstraction === "Countries") {
        const value = stats.countries?.[iso]?.value;
        return typeof value === "number" && value >= 0 ? value : null;
      }
      if (abstraction === "Continents") {
        const c = stats.countries?.[iso]?.continent;
        const value = c ? stats.continents?.[c]?.value : undefined;
        return typeof value === "number" && value > 0 ? value : null;
      }
      if (abstraction === "Regions") {
        const r = stats.countries?.[iso]?.region;
        const value = r ? stats.regions?.[r]?.value : undefined;
        return typeof value === "number" && value > 0 ? value : null;
      }
      return null;

}

// Same function as getMetricValues() in Map.vue
export function getThresholdValues(stats: any, theAbstraction: string | undefined){
  const abstraction = theAbstraction || "Countries";
  const metricValues=(bounds as any).features.map((feature: any ) => {
    getMetric(stats,abstraction, feature)
    });
    const thresholds= buildThresholds(metricValues);

    return thresholds;
  };

export function buildThresholds(values: number[]){
  if (values.length < 2) return [];

    const sorted = [...values].sort((a, b) => a - b);
    const thresholds: number[] = [];
    const lastValue = sorted[sorted.length - 1] ?? 0;

    // Assigns a colour based on 
    for (let i = 1; i < colorRamp.length; i++) {
      const position = (sorted.length - 1) * (i / colorRamp.length);
      const lowerIndex = Math.floor(position);
      const upperIndex = Math.ceil(position);
      const lowerValue = sorted[lowerIndex] ?? lastValue;
      const upperValue = sorted[upperIndex] ?? lowerValue;
      thresholds.push(lowerValue + (upperValue - lowerValue) * (position - lowerIndex));
    }

    return thresholds;

}

// selects the right subset of data abstraction returned by the API
export function filterDataByAbstraction(stats : any , abstraction: string){
    console.log(`Calling filterDataByAbstraction(${stats}, ${abstraction})`);

    if (stats === undefined) {
      console.log("\t WARNING: stats == undefined ");
      
      return undefined;
    }else{
      console.log(`\t Stats =  ${stats}`);
    }

    if (abstraction === "Countries") {
      const countries = stats.countries;
      
      return countries;
    }
    if (abstraction === "Continents") {
      const continent = stats.continents;
      
      return continent;
    }
    if (abstraction === "Regions") {
      const region = stats.region;
      
      return region;
    }
    return null;
};
const DEFAULT_COLOR = "#d9d9d9";

export function getMoleColour(value: number | null, thresholds: number[]): string{
    if (value === null || thresholds === undefined) return DEFAULT_COLOR;
    let color = DEFAULT_COLOR;

    for (let i = 0; i < thresholds.length; i++) {
      const threshold = thresholds[i];
      if (threshold !== undefined && value <= threshold) {
        color =colorRamp[i] ?? DEFAULT_COLOR; 
        console.log(`Mole colour with value ${value} = ${color}`);
        return color; // fallback to defalut colour if index i doesnt exist
      }
    }
    color = colorRamp[colorRamp.length - 1] ?? DEFAULT_COLOR;
    console.log(`Mole colour with value ${value} = ${color}`);
    return color; 
  };

// Source: https://stackoverflow.com/questions/1983648/replace-spaces-with-dashes-and-make-all-letters-lower-case
// replaces spaces with
export function createID(input: (string | undefined | null)) {
    if (!input)
        return '';
    if (input===undefined)
      return '';

    // make lower case and trim
    var slug = input.replace(/\s+/g, '-').toLowerCase();

    return slug;
}


// Composable useFetch Docs: https://nuxt.com/docs/4.x/api/composables/use-fetch
// https://nuxt.com/docs/4.x/getting-started/data-fetching
export async function fetchData(theTargetVariable : any, theTargetYear: any){
  // Fetch the Height data of the elipse
  const { data: aquastatData, status: dataStatus, error: dataError } =  useAsyncData(
  "aquastatData",
  () => $fetch<any>("/api/aquastat", {
      query: {
          targetVariable: theTargetVariable,
          targetYear: theTargetYear
      }
  }));

  if(dataError.value === undefined && aquastatData !== undefined){
    console.log(`\t SUCCESS useFetch() returned ok: ${aquastatData.value}`);
    return aquastatData.value;
  }
  console.log(`\t WARNING useFetch() returned an error: ${dataError.value}`);
  return undefined;

};


export function printData(theData: Object, message: string){

  console.log(`${message}: ${JSON.stringify(theData, null, 2)}`);
  return;
};


export function getContinentFeature(stats : any, requestedFeild: string){
  console.log("getting Continent elements")
};
export function getCountryFeature(stats : any, requestedFeild: string){
  console.log("getting Country elements")
};

export function getRegionFeature(stats : any, requestedFeild: string){
  console.log("getting Region elements")
};


import * as d3 from "d3";

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

export function getMoleColour(value : any , abstraction: string){
    const colorRamp = [
    "#FFEDA0",
    "#FED976",
    "#FEB24C",
    "#FD8D3C",
    "#FC4E2A",
    "#E31A1C",
    "#BD0026",
    "#800026"
  ];


  return 'green';
};

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
  const { data: aquastatData, status: dataStatus, error: dataError } =  useFetch("/api/aquastat", {
      query: {
          targetVariable: theTargetVariable,
          targetYear: theTargetYear
      }
  });

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


export function getIso(stats: any, feature: any){
    let iso = feature.properties['ISO3166-1-Alpha-3'];
  if (iso === '-99' || !iso) {
    const featureName = feature.properties.name;
    const found = Object.keys(stats.countries || {}).find(k => stats.countries[k].name === featureName);
    if (found) return found;
  }
  return iso;
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


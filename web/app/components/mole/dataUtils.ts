import * as d3 from "d3";

// selects the right subset of data abstraction returned by the API
export function filterDataByAbstraction(stats : any , abstraction: string){
    console.log(`Calling filterDataByAbstraction(${stats}, ${abstraction})`);

    if (stats === null) {
      console.log("WARNING: stats == null ");
      console.log(`STATS DATA: ${JSON.stringify(stats, null, 2)}`);
    }else{
      console.log(JSON.stringify(stats, null, 2));
    }

    if (abstraction === "Countries") {
      const countries = stats.countries;
      console.log(`Getting countries: ${JSON.stringify(countries, null, 2)}`);
      return countries;
    }
    if (abstraction === "Continents") {
      const continent = stats.continents;
      console.log(`Getting Continents: ${JSON.stringify(continent, null, 2)}`);
      return continent;
    }
    if (abstraction === "Regions") {
      const region = stats.region;
      console.log(`Getting Regions: ${JSON.stringify(region, null, 2)}`);
      return region;
    }
    return null;
};

// Composable useFetch Docs: https://nuxt.com/docs/4.x/api/composables/use-fetch
export async function fetchData(theTargetVariable : any, theTargetYear: any){
  // Fetch the Height data of the elipse
  const { data: aquastatData, status: dataStatus, error: dataError } =  useFetch("/api/aquastat", {
      query: {
          targetVariable: theTargetVariable,
          targetYear: theTargetYear
      }
  });

  if(dataError.value === undefined){
    console.log(`SUCCESS useFetch() returned ok: ${aquastatData.value}`);
    console.log(`FETCHED DATA: ${JSON.stringify(aquastatData.value, null, 2)}`);
    return aquastatData.value;
  }
  console.log(`WARNING useFetch() returned an error: ${dataError.value}`);
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


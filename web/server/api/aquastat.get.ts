import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import z4 from "zod/v4";
import {
  isAquastatVariable,
  isAquastatYear,
  strIsYear,
  type AquastatVariables,
  type AquastatYears
} from "../utils/aquastatVars";

interface CountryResponse {
  name: string;
  value: number;
  region: string;
  continent: string;
  iso3: string;
}

interface RegionResponse {
  name: string;
  totalValue: number;
  count: number;
  value: number;
  estimate: boolean;
}

type Payload = {
  meta: {
    targetVariable: string;
    targetYear: string;
  };
  countries: Record<string, CountryResponse>;
  regions: Record<string, RegionResponse>;
  continents: Record<string, RegionResponse>;
};

const querySchema = z4.object({
  targetVariable: z4
    .string()
    .transform((str) => (isAquastatVariable(str) ? str : undefined))
    .default(
      "Total water withdrawal per capita [m3/inhab/year]" satisfies AquastatVariables
    ),
  targetYear: z4
    .string()
    .transform((str) => (isAquastatYear(str) ? str : undefined))
    .default("2022" satisfies AquastatYears)
});

export default defineEventHandler(async (event) => {
  const csvPath = path.resolve("server", "data", "aquastat_water_cleaned.csv");
  const csvContent = await fs.readFile(csvPath, "utf8");
  const isoPath = path.resolve("server", "data", "iso-3166.csv");
  const isoContent = await fs.readFile(isoPath, "utf8");
  const dataRecords = Papa.parse<any>(csvContent, {
    header: true,
    skipEmptyLines: true
  }).data;
  const isoRecords = Papa.parse<any>(isoContent, {
    header: true,
    skipEmptyLines: true
  }).data;

  const defaultVariable = "Total water withdrawal per capita [m3/inhab/year]";
  const defaultYear = "2022";

  const availableVariables = Array.from(
    new Set(dataRecords.map((record) => record["variable"]).filter(Boolean))
  );
  const headerYears = Object.keys(dataRecords[0] || {}).filter(strIsYear);

  const query = await getValidatedQuery(event, querySchema.parse);
  if (!availableVariables.includes(query.targetVariable)) {
    query.targetVariable = defaultVariable;
  }
  if (!headerYears.includes(query.targetYear)) {
    query.targetYear = defaultYear;
  }

  const payload: Payload = {
    meta: query,
    countries: {},
    regions: {},
    continents: {}
  };

  dataRecords.forEach((record) => {
    if (record["variable"] !== query.targetVariable) return;

    const name = record["name"];
    const type = record["type"];
    const region = record["region"];
    const continent = record["continent"];
    const value = parseFloat(record[query.targetYear]) || -1;

    let iso3 = "";
    if (type === "country") {
      // match exactly or formatted fallback (Bolivia (Plurinational State of) -> Bolivia, Plurinational State of)
      let normalizedName = name.replace(" (", ", ").replace(")", "");
      // manual adjustments to name to match
      if (name === "Democratic Republic of the Congo")
        normalizedName = "Congo, Democratic Republic of the";
      if (name === "Republic of Moldova")
        normalizedName = "Moldova, Republic of";
      if (name === "Democratic People's Republic of Korea")
        normalizedName = "Korea, Democratic People's Republic of";
      if (name === "Republic of Korea") normalizedName = "Korea, Republic of";
      if (name === "United Republic of Tanzania")
        normalizedName = "Tanzania, United Republic of";

      const isoRecord = isoRecords.find(
        (iso) => iso["name"] === name || iso["name"] === normalizedName
      );
      if (isoRecord) iso3 = isoRecord["alpha-3"];
    }

    if (type === "country" && iso3) {
      payload.countries[iso3] = { name, value, region, continent, iso3 };
    }

    if (type === "region" || (type === "country" && region)) {
      if (!payload.regions[region]) {
        payload.regions[region] = {
          name: region,
          totalValue: 0,
          count: 0,
          value: 0,
          estimate: false
        };
      }
      if (type === "country" && value > 0) {
        payload.regions[region].totalValue += value;
        payload.regions[region].count += 1;
        payload.regions[region].value =
          payload.regions[region].totalValue / payload.regions[region].count;
        payload.regions[region].estimate = true;
      }
    }

    if (type === "country" && continent) {
      if (!payload.continents[continent]) {
        payload.continents[continent] = {
          name: continent,
          totalValue: 0,
          count: 0,
          value: 0,
          estimate: false
        };
      }
      if (value > 0) {
        payload.continents[continent].totalValue += value;
        payload.continents[continent].count += 1;
        payload.continents[continent].value =
          payload.continents[continent].totalValue /
          payload.continents[continent].count;
        payload.continents[continent].estimate = true;
      }
    }

    if (type === "region" && value > 0) {
      payload.regions[region] = {
        name: region,
        totalValue: value,
        count: 1,
        value,
        estimate: false
      };
    }

    if (type === "continent" && value > 0) {
      payload.continents[continent] = {
        name: continent,
        totalValue: value,
        count: 1,
        value,
        estimate: false
      };
    }
  });

  // insert empty entries for missing country data
  isoRecords.forEach((iso) => {
    const iso3 = iso["alpha-3"];
    if (iso3 && !payload.countries[iso3]) {
      payload.countries[iso3] = {
        name: iso["name"],
        value: -1,
        region: iso["sub-region"],
        continent: iso["region"],
        iso3: iso3
      };
    }
  });

  // manual data for unrecognized/disputed/special territories in GeoJSON
  payload.countries["KOS"] = {
    name: "Kosovo",
    value: -1,
    region: "Southern Europe",
    continent: "Europe",
    iso3: "KOS"
  };
  payload.countries["NNC"] = {
    name: "Northern Cyprus",
    value: -1,
    region: "Western Asia",
    continent: "Asia",
    iso3: "NNC"
  };
  payload.countries["SOM"] = {
    name: "Somaliland",
    value: -1,
    region: "Sub-Saharan Africa",
    continent: "Africa",
    iso3: "SOM"
  };
  payload.countries["BAY"] = {
    name: "Baykonur Cosmodrome",
    value: 0,
    region: "Central Asia",
    continent: "Asia",
    iso3: "BAY"
  };
  payload.countries["SIA"] = {
    name: "Siachen Glacier",
    value: -1,
    region: "Southern Asia",
    continent: "Asia",
    iso3: "SIA"
  };

  // Taiwan (TWN) has empty region and continent values
  if (payload.countries["TWN"]) {
    payload.countries["TWN"].name = "Taiwan";
    payload.countries["TWN"].region = "Eastern Asia";
    payload.countries["TWN"].continent = "Asia";
  } else {
    payload.countries["TWN"] = {
      name: "Taiwan",
      value: -1,
      region: "Eastern Asia",
      continent: "Asia",
      iso3: "TWN"
    };
  }

  return payload;
});

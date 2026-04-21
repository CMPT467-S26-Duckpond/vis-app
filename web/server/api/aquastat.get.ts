import Papa from "papaparse";
import z4 from "zod/v4";
import {
  AquastatRowEntry,
  isAquastatVariable,
  isAquastatYear,
  strIsYear,
  type AquastatVariables,
  type AquastatYears
} from "../utils/aquastatVars";

type VariableResponse<And = {}> = Partial<
  Record<
    AquastatVariables,
    Partial<Record<AquastatYears, { value: number } & And>>
  >
>;

interface CountryResponse {
  name: string;
  values: VariableResponse;
  region: string;
  continent: string;
  iso2: string;
}

interface RegionResponse {
  name: string;
  values: VariableResponse<{
    totalValue: number;
    count: number;
    estimate: boolean;
  }>;
}

export type AquastatPayload = {
  meta: VariableMeta;
  countries: Record<string, CountryResponse>;
  regions: Record<string, RegionResponse>;
  continents: Record<string, RegionResponse>;
};

const targetVariableSchema = z4
  .string()
  .transform((str) => (isAquastatVariable(str) ? str : undefined))
  .default(
    "Total water withdrawal per capita [m3/inhab/year]" satisfies AquastatVariables
  );

const targetYearSchema = z4
  .string()
  .transform((str) => (isAquastatYear(str) ? str : undefined))
  .default("2022" satisfies AquastatYears);

function normalizeToArray<K>(input: K | K[]): K[] {
  return Array.isArray(input) ? input : [input];
}

const querySchema = z4.object({
  targetVariable: targetVariableSchema
    .or(targetVariableSchema.array())
    .transform(normalizeToArray),
  targetYear: targetYearSchema
    .or(targetYearSchema.array())
    .transform(normalizeToArray)
});

type VariableMeta = z4.infer<typeof querySchema>;

export async function getAquastatCSV() {
  const assetStorage = useStorage("assets:server");
  const csvContent = await assetStorage.get("aquastat_water_cleaned.csv");
  const isoContent = await assetStorage.get("iso-3166.csv");

  if (!csvContent || !isoContent) {
    throw createError({
      statusCode: 500,
      message: "Failed to load dataset files."
    });
  }


  const dataRecords = Papa.parse<AquastatRowEntry>(csvContent.toString(), {
    header: true,
    skipEmptyLines: true,
    transform(value, header) {
      if (strIsYear(header as string)) {
        return parseFloat(value) || -1;
      }

      return value;
    }
  }).data;
  const isoRecords = Papa.parse<any>(isoContent.toString(), {
    header: true,
    skipEmptyLines: true
  }).data;

  const cleanedData = dataRecords.map((record) => {
    let iso2 = "";

    if (record.type === "country") {
      // match exactly or formatted fallback (Bolivia (Plurinational State of) -> Bolivia, Plurinational State of)
      let normalizedName = record.name.replace(" (", ", ").replace(")", "");
      // manual adjustments to name to match
      if (record.name === "Democratic Republic of the Congo")
        normalizedName = "Congo, Democratic Republic of the";
      if (record.name === "Republic of Moldova")
        normalizedName = "Moldova, Republic of";
      if (record.name === "Democratic People's Republic of Korea")
        normalizedName = "Korea, Democratic People's Republic of";
      if (record.name === "Republic of Korea")
        normalizedName = "Korea, Republic of";
      if (record.name === "United Republic of Tanzania")
        normalizedName = "Tanzania, United Republic of";

      const isoRecord = isoRecords.find(
        (iso) => iso["name"] === record.name || iso["name"] === normalizedName
      );
      if (isoRecord) iso2 = isoRecord["alpha-2"];
    }
    return { record, iso2 };
  });

  const availableVariables = Array.from(
    new Set(dataRecords.map((record) => record["variable"]).filter(Boolean))
  );
  const headerYears = Object.keys(dataRecords[0] || {}).filter(strIsYear);

  return {
    isoRecords,
    dataRecords: cleanedData,
    availableVariables,
    headerYears
  };
}

export default defineEventHandler(async (event) => {
  const { dataRecords, isoRecords, availableVariables, headerYears } =
    await getAquastatCSV();

  const query = await getValidatedQuery(event, querySchema.parse);

  query.targetVariable.forEach((variable) => {
    if (!availableVariables.includes(variable)) {
      throw createError({
        statusCode: 400,
        message: `Invalid targetVariable: ${variable}`
      });
    }
  });

  query.targetYear.forEach((year) => {
    if (!headerYears.includes(year)) {
      throw createError({
        statusCode: 400,
        message: `Invalid targetYear: ${year}`
      });
    }
  });

  const payload: AquastatPayload = {
    meta: query,
    countries: {},
    regions: {},
    continents: {}
  };

  const filtered = dataRecords.filter((r) =>
    query.targetVariable.includes(r.record["variable"])
  );

  query.targetVariable.forEach((variable) => {
    query.targetYear.forEach((year) => {
      filtered.forEach((r) => {
        if (r.record["variable"] !== variable) return;

        const name = r.record["name"];
        const type = r.record["type"];
        const region = r.record["region"];
        const continent = r.record["continent"];
        const value = r.record[year];

        if (r.record["type"] === "country" && r.iso2) {
          payload.countries[r.iso2] ??= {
            name,
            values: {},
            region,
            continent,
            iso2: r.iso2
          };
          payload.countries[r.iso2]!.values[variable] ??= {};
          payload.countries[r.iso2]!.values[variable]![year] = {
            value
          };
        }

        if (type === "region" || (type === "country" && region)) {
          if (!payload.regions[region]) {
            payload.regions[region] ??= {
              name: region,
              values: {}
            };
            payload.regions[region].values[variable] ??= {};
            payload.regions[region].values[variable]![year] = {
              totalValue: 0,
              count: 0,
              value: 0,
              estimate: false
            };
          }

          if (type === "country" && value > 0) {
            payload.regions[region].values[variable]![year]!.totalValue +=
              value;
            payload.regions[region].values[variable]![year]!.count += 1;
            payload.regions[region].values[variable]![year]!.value =
              payload.regions[region].values[variable]![year]!.totalValue /
              payload.regions[region].values[variable]![year]!.count;
            payload.regions[region].values[variable]![year]!.estimate = true;
          }
        }

        if (type === "country" && continent) {
          if (!payload.continents[continent]) {
            payload.continents[continent] ??= {
              name: continent,
              values: {}
            };
            payload.continents[continent].values[variable] ??= {};
            payload.continents[continent].values[variable]![year] = {
              totalValue: 0,
              count: 0,
              value: 0,
              estimate: false
            };
          }
          if (value > 0) {
            payload.continents[continent].values[variable]![year]!.totalValue +=
              value;
            payload.continents[continent].values[variable]![year]!.count += 1;
            payload.continents[continent].values[variable]![year]!.value =
              payload.continents[continent].values[variable]![year]!
                .totalValue /
              payload.continents[continent].values[variable]![year]!.count;
            payload.continents[continent].values[variable]![year]!.estimate =
              true;
          }
        }

        if (type === "region" && value > 0) {
          payload.regions[region] = {
            name: region,
            values: {}
          };
          payload.regions[region].values[variable] ??= {};
          payload.regions[region].values[variable]![year] = {
            totalValue: value,
            count: 1,
            value,
            estimate: false
          };
        }

        if (type === "continent" && value > 0) {
          payload.continents[continent] = {
            name: continent,
            values: {}
          };
          payload.continents[continent].values[variable] ??= {};
          payload.continents[continent].values[variable]![year] = {
            totalValue: value,
            count: 1,
            value,
            estimate: false
          };
        }
      });
    });
  });

  function makeEmpty(): VariableResponse {
    const res: VariableResponse = {};

    query.targetVariable.forEach((variable) => {
      query.targetYear.forEach((year) => {
        res[variable] ??= {};
        res[variable]![year] = {
          value: -1
        };
      });
    });

    return res;
  }

  // insert empty entries for missing country data
  isoRecords.forEach((iso) => {
    const iso2 = iso["alpha-2"];
    if (iso2 && !payload.countries[iso2]) {
      payload.countries[iso2] = {
        name: iso["name"],
        values: makeEmpty(),
        region: iso["sub-region"],
        continent: iso["region"],
        iso2: iso
      };
    }
  });

  // manual data for unrecognized/disputed/special territories in GeoJSON
  payload.countries["KOS"] = {
    name: "Kosovo",
    values: makeEmpty(),
    region: "Southern Europe",
    continent: "Europe",
    iso2: "KOS"
  };
  payload.countries["NNC"] = {
    name: "Northern Cyprus",
    values: makeEmpty(),
    region: "Western Asia",
    continent: "Asia",
    iso2: "NNC"
  };
  payload.countries["SOM"] = {
    name: "Somaliland",
    values: makeEmpty(),
    region: "Sub-Saharan Africa",
    continent: "Africa",
    iso2: "SOM"
  };
  payload.countries["BAY"] = {
    name: "Baykonur Cosmodrome",
    values: makeEmpty(),
    region: "Central Asia",
    continent: "Asia",
    iso2: "BAY"
  };
  payload.countries["SIA"] = {
    name: "Siachen Glacier",
    values: makeEmpty(),
    region: "Southern Asia",
    continent: "Asia",
    iso2: "SIA"
  };

  // Taiwan (TWN) has empty region and continent values
  if (payload.countries["TWN"]) {
    payload.countries["TWN"].name = "Taiwan";
    payload.countries["TWN"].region = "Eastern Asia";
    payload.countries["TWN"].continent = "Asia";
  } else {
    payload.countries["TWN"] = {
      name: "Taiwan",
      values: makeEmpty(),
      region: "Eastern Asia",
      continent: "Asia",
      iso2: "TWN"
    };
  }

  return payload;
});

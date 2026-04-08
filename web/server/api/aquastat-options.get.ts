import { AquastatVariables, AquastatYears } from "../utils/aquastatVars";
import { getAquastatCSV } from "./aquastat.get";

interface AquastatOptionsResponse {
  variables: AquastatVariables[];
  abstractionMembers: {
    regions: string[];
    countries: string[];
    continents: string[];
  };

  years: AquastatYears[];
  minYear: AquastatYears;
  maxYear: AquastatYears;
  defaultVariable: AquastatVariables;
  defaultYear: AquastatYears;
}

export default defineEventHandler(async () => {
  const { dataRecords, availableVariables, headerYears } =
    await getAquastatCSV();

  const years = headerYears.sort((a, b) => Number(a) - Number(b));

  if (!availableVariables || years.length === 0) {
    throw createError({
      statusCode: 500,
      message: "Failed to extract variables or years from the dataset."
    });
  }

  const countries = Array.from(
    new Set(
      dataRecords
        .filter((record) => record.record["type"] === "country")
        .map((record) => record.record.name)
    )
  );

  const regions = Array.from(
    new Set(
      dataRecords
        .filter((record) => record.record["type"] === "region")
        .map((record) => record.record.name)
    )
  );

  const continents = Array.from(
    new Set(
      dataRecords
        .filter((record) => record.record["type"] === "continent")
        .map((record) => record.record.name)
    )
  );

  return {
    variables: availableVariables,
    abstractionMembers: {
      countries,
      regions,
      continents
    },
    years: years,
    minYear: years[0]!,
    maxYear: years[years.length - 1]!,
    defaultVariable: "Total water withdrawal per capita [m3/inhab/year]",
    defaultYear: years.includes("2022") ? "2022" : years[years.length - 1]!
  } as AquastatOptionsResponse;
});

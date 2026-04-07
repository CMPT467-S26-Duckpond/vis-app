import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import {
  AquastatVariables,
  AquastatYears,
  strIsYear
} from "../utils/aquastatVars";

interface AquastatOptionsResponse {
  variables: AquastatVariables[];
  years: AquastatYears[];
  minYear: AquastatYears;
  maxYear: AquastatYears;
  defaultVariable: AquastatVariables;
  defaultYear: AquastatYears;
}

export default defineEventHandler(async () => {
  const csvPath = path.resolve("server", "data", "aquastat_water_cleaned.csv");
  const csvContent = await fs.readFile(csvPath, "utf8");

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  const records = parsed.data;
  const availableVariables = Array.from(
    new Set(records.map((record) => record.variable).filter(Boolean))
  ).sort();

  const yearColumns = Object.keys(records[0] || {}).filter(strIsYear);
  const years = yearColumns.sort((a, b) => Number(a) - Number(b));

  if (!availableVariables || years.length === 0) {
    throw createError({
      statusCode: 500,
      message: "Failed to extract variables or years from the dataset."
    });
  }

  return {
    variables: availableVariables,
    years: years,
    minYear: years[0]!,
    maxYear: years[years.length - 1]!,
    defaultVariable: "Total water withdrawal per capita [m3/inhab/year]",
    defaultYear: years.includes("2022") ? "2022" : years[years.length - 1]!
  } as AquastatOptionsResponse;
});

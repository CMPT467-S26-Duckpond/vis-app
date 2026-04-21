import { AquastatVariables, AquastatYears } from "../utils/aquastatVars";
import { getAquastatCSV } from "./aquastat.get";

interface AquastatOptionsResponse {
  variables: AquastatVariables[];
  abstractionMembers: {
    regions: { label: string; value: string }[];
    countries: { label: string; value: string }[];
    continents: { label: string; value: string }[];
  };

  years: AquastatYears[];
  minYear: AquastatYears;
  maxYear: AquastatYears;
  defaultVariable: AquastatVariables;
  defaultYear: AquastatYears;
}

export default defineCachedEventHandler(
  async () => {
    const { dataRecords, availableVariables, headerYears, isoRecords } =
      await getAquastatCSV();

    const years = headerYears.sort((a, b) => Number(a) - Number(b));

    if (!availableVariables || years.length === 0) {
      throw createError({
        statusCode: 500,
        message: "Failed to extract variables or years from the dataset."
      });
    }

    const countryRecords = dataRecords.filter(
      (record) => record.record["type"] === "country"
    );

    const countries = Array.from(
      new Set(countryRecords.map((r) => r.record.name))
    ).map((record) => ({
      label: record,
      value: isoRecords.find((i) => i.name === record)?.["alpha-2"]
    }));

    const regions = Array.from(
      new Set(countryRecords.map((record) => record.record.region))
    )
      .filter((m) => Boolean(m))
      .map((record) => ({
        label: record,
        value: record
      }));

    const continents = Array.from(
      new Set(countryRecords.map((record) => record.record.continent))
    )
      .filter((m) => Boolean(m))
      .map((record) => ({
        label: record,
        value: record
      }));

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
  },
  {
    maxAge: 24 * 60 * 60 // Cache for 24 hours
  }
);

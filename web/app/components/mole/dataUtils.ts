import * as d3 from "d3";

const BILLION = 1e9;

type Years =
  | "1962"
  | "1963"
  | "1964"
  | "1965"
  | "1966"
  | "1967"
  | "1968"
  | "1969"
  | "1970"
  | "1971"
  | "1972"
  | "1973"
  | "1974"
  | "1975"
  | "1976"
  | "1977"
  | "1978"
  | "1979"
  | "1980"
  | "1981"
  | "1982"
  | "1983"
  | "1984"
  | "1985"
  | "1986"
  | "1987"
  | "1988"
  | "1989"
  | "1990"
  | "1991"
  | "1992"
  | "1993"
  | "1994"
  | "1995"
  | "1996"
  | "1997"
  | "1998"
  | "1999"
  | "2000"
  | "2001"
  | "2002"
  | "2003"
  | "2004"
  | "2005"
  | "2006"
  | "2007"
  | "2008"
  | "2009"
  | "2010"
  | "2011"
  | "2012"
  | "2013"
  | "2014"
  | "2015"
  | "2016"
  | "2017"
  | "2018"
  | "2019"
  | "2020"
  | "2021"
  | "2022";

type RowEntry = {
  variable: string;
  country: string;
  country_code: number;
} & {
  [key in Years]: number;
};
const STRING_FIELDS = ["variable", "country"];

export type ParsedCsv = d3.DSVParsedArray<RowEntry>;

export async function fetchCsv(): Promise<ParsedCsv> {
  return d3.csv<RowEntry>("/aquastat_water_cleaned.csv", (d) => {
    Object.entries(d).forEach(([key, value]) => {
      if (!STRING_FIELDS.includes(key)) {
        // @ts-expect-error
        d[key] = value === "" ? NaN : +value;
      }
    });

    return d as any;
  });
}

export const WATER_VARIABLES = {
  Agricultural: "Agricultural water withdrawal [10^9 m3/year]",
  Industrial: "Industrial water withdrawal [10^9 m3/year]",
  Municipal: "Municipal water withdrawal [10^9 m3/year]",
};

export function getLatestYearWaterUsage(
  data: ParsedCsv,
  countries: string[],
  variables: string[],
): number {
  const latestYear = "2022";

  const vars = variables.map(
    (v) => WATER_VARIABLES[v as keyof typeof WATER_VARIABLES],
  );

  const filtered = data.filter(
    (r) =>
      !Number.isNaN(r[latestYear]) &&
      countries.includes(r.country) &&
      vars.includes(r.variable),
  );

  return filtered.reduce((sum, row) => sum + row[latestYear], 0) * BILLION; // convert from billion m3 to m3
}

export function getWorldData(){
  
};

export function getWorld(){

};
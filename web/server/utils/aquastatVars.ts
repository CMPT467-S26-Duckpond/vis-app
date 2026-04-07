export type AquastatYears =
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

export function strIsYear(str: string): boolean {
  return /^\d{4}$/.test(str);
}

export function isAquastatYear(str: string): str is AquastatYears {
  return strIsYear(str) && parseInt(str) >= 1962 && parseInt(str) <= 2022;
}

export const aquastatVariables = [
  "Agricultural water withdrawal [10^9 m3/year]",
  "Agricultural water withdrawal as % of total water withdrawal [%]",
  "Fresh groundwater withdrawal [10^9 m3/year]",
  "Fresh surface water withdrawal [10^9 m3/year]",
  "Industrial water withdrawal [10^9 m3/year]",
  "Industrial water withdrawal as % of total water withdrawal [%]",
  "Irrigation water requirement [10^9 m3/year]",
  "Municipal water withdrawal [10^9 m3/year]",
  "SDG 6.4.2. Agricultural Sector Contribution to Water Stress [%]",
  "SDG 6.4.2. Industrial Sector Contribution to Water Stress [%]",
  "SDG 6.4.2. Municipal Sector Contribution to Water Stress [%]",
  "SDG 6.4.2. Water Stress [%]",
  "Total freshwater withdrawal [10^9 m3/year]",
  "Total water withdrawal [10^9 m3/year]",
  "Total water withdrawal per capita [m3/inhab/year]"
] as const;

export type AquastatVariables = (typeof aquastatVariables)[number];

export function isAquastatVariable(str: string): str is AquastatVariables {
  return (aquastatVariables as readonly string[]).includes(str);
}

type AquastatTypeVar = "country" | "region" | "continent";

export type AquastatRowEntry = {
  /** Country */
  name: string;
  type: AquastatTypeVar;
  variable: AquastatVariables;
  continent: string;
  region: string;
} & Record<AquastatYears, number>;

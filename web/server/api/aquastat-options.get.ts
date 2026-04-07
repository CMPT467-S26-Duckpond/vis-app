import fs from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';

export default defineEventHandler(async () => {
  const csvPath = path.resolve('server', 'data', 'aquastat_water_cleaned.csv');
  const csvContent = await fs.readFile(csvPath, 'utf8');

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  const records = parsed.data;
  const availableVariables = Array.from(
    new Set(records.map((record) => record.variable).filter(Boolean))
  ).sort();

  const yearColumns = Object.keys(records[0] || {}).filter((key) => /^\d{4}$/.test(key));
  const years = yearColumns.sort((a, b) => Number(a) - Number(b));

  return {
    variables: availableVariables,
    years,
    minYear: years[0] ?? null,
    maxYear: years[years.length - 1] ?? null,
    defaultVariable: 'Total water withdrawal per capita [m3/inhab/year]',
    defaultYear: years.includes('2022') ? '2022' : (years[years.length - 1] ?? null)
  };
});

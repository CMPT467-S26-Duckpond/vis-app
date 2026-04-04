import fs from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';

export default defineEventHandler(async (event) => {
  const csvPath = path.resolve('server', 'data', 'aquastat_water_cleaned.csv');
  const csvContent = await fs.readFile(csvPath, 'utf8');
  const isoPath = path.resolve('server', 'data', 'iso-3166.csv');
  const isoContent = await fs.readFile(isoPath, 'utf8');
  const dataRecords = Papa.parse<any>(csvContent, { header: true, skipEmptyLines: true }).data;
  const isoRecords = Papa.parse<any>(isoContent, { header: true, skipEmptyLines: true }).data;

  const defaultVariable = 'Total water withdrawal per capita [m3/inhab/year]';
  const defaultYear = '2022';

  const query = getQuery(event);
  const requestedVariable = typeof query.targetVariable === 'string' ? query.targetVariable : '';
  const requestedYear = typeof query.targetYear === 'string' ? query.targetYear : '';

  const availableVariables = Array.from(new Set(dataRecords.map(record => record['variable']).filter(Boolean)));
  const headerYears = Object.keys(dataRecords[0] || {}).filter((key) => /^\d{4}$/.test(key));

  const targetVariable = availableVariables.includes(requestedVariable) ? requestedVariable : defaultVariable;
  const targetYear = headerYears.includes(requestedYear) ? requestedYear : defaultYear;

  const payload: any = {
    meta: {
      targetVariable,
      targetYear
    },
    countries: {},
    regions: {},
    continents: {}
  };

  dataRecords.forEach(record => {
    if (record['variable'] !== targetVariable) return;

    const name = record['name'];
    const type = record['type'];
    const region = record['region'];
    const continent = record['continent'];
    const value = parseFloat(record[targetYear]) || -1;

    let iso3 = '';
    if (type === 'country') {
      // match exactly or formatted fallback (Bolivia (Plurinational State of) -> Bolivia, Plurinational State of)
      let normalizedName = name.replace(' (', ', ').replace(')', '');
      // manual adjustments to name to match
      if (name === 'Democratic Republic of the Congo') normalizedName = 'Congo, Democratic Republic of the';
      if (name === 'Republic of Moldova') normalizedName = 'Moldova, Republic of';
      if (name === "Democratic People's Republic of Korea") normalizedName = "Korea, Democratic People's Republic of";
      if (name === 'Republic of Korea') normalizedName = 'Korea, Republic of';
      if (name === 'United Republic of Tanzania') normalizedName = 'Tanzania, United Republic of';

      const isoRecord = isoRecords.find(iso => iso['name'] === name || iso['name'] === normalizedName);
      if (isoRecord) iso3 = isoRecord['alpha-3'];
    }

    if (type === 'country' && iso3) {
      payload.countries[iso3] = { name, value, region, continent, iso3 };       
    }

    if (type === 'region' || (type === 'country' && region)) {
      if (!payload.regions[region]) {
        payload.regions[region] = { name: region, totalValue: 0, count: 0, value: 0 };
      }
      if (type === 'country' && value > 0) {
        payload.regions[region].totalValue += value;
        payload.regions[region].count += 1;
        payload.regions[region].value = payload.regions[region].totalValue / payload.regions[region].count;
      }
    }

    if (type === 'continent' || (type === 'country' && continent)) {     
      if (!payload.continents[continent]) {
        payload.continents[continent] = { name: continent, totalValue: 0, count: 0, value: 0 };
      }
      if (type === 'country' && value > 0) {
        payload.continents[continent].totalValue += value;
        payload.continents[continent].count += 1;
        payload.continents[continent].value = payload.continents[continent].totalValue / payload.continents[continent].count;
      }
    }
  });

  // insert empty entries for missing country data
  isoRecords.forEach(iso => {
    const iso3 = iso['alpha-3'];
    if (iso3 && !payload.countries[iso3]) {
      payload.countries[iso3] = {
        name: iso['name'],
        value: -1,
        region: iso['sub-region'],
        continent: iso['region'],
        iso3: iso3
      };
    }
  });

  // manual data for unrecognized/disputed/special territories in GeoJSON
  payload.countries['KOS'] = { name: 'Kosovo', value: 0, region: 'Southern Europe', continent: 'Europe', iso3: 'KOS' };
  payload.countries['NNC'] = { name: 'Northern Cyprus', value: 0, region: 'Western Asia', continent: 'Asia', iso3: 'NNC' };
  payload.countries['SOM'] = { name: 'Somaliland', value: 0, region: 'Sub-Saharan Africa', continent: 'Africa', iso3: 'SOM' };
  payload.countries['BAY'] = { name: 'Baykonur Cosmodrome', value: 0, region: 'Central Asia', continent: 'Asia', iso3: 'BAY' };
  payload.countries['SIA'] = { name: 'Siachen Glacier', value: 0, region: 'Southern Asia', continent: 'Asia', iso3: 'SIA' };

  // Taiwan (TWN) has empty region and continent values 
  if (payload.countries['TWN']) {
    payload.countries['TWN'].name = 'Taiwan';
    payload.countries['TWN'].region = 'Eastern Asia';
    payload.countries['TWN'].continent = 'Asia';
  } else {
    payload.countries['TWN'] = { name: 'Taiwan', value: 0, region: 'Eastern Asia', continent: 'Asia', iso3: 'TWN' };
  }

  return payload;
});

# CMPT 467 Final Project: Water Vis

## Requirements

- Node.js (LTS/v24.7.0 or later)
- Docker (as recent as possible)

## Setup

Ensure your `cwd` is set to the `web` directory of the project:

```bash
cd web
npm install

docker compose up -d
npm run dev
```

The site should now be running at `http://localhost:3000`. You can stop the server with `Ctrl + C`/`CMD + C` and stop the database with `docker compose down`.

# Usage

The site is a visualization of several geographical water metrics. The user can interact with a given year of data, as well as a given variable by adjusting the dropdowns on the sidebar and the slider at the bottom.

To switch between visualization modes, the user can use the "Map Mode" buttons located in the top right which will toggle "Mole View" on and off, as well as a "Choropleth" and "Lake Vis" view

The Lake Vis mode is selected, several additional variables can be modified from the sidebar. Based on selection, the user can then visualize the aggregated water consumption of several regions as it would impact the volume of a lake which the user can also select by clicking it on the map.

# Data folder

The data folder contains supplementary datasets that were used to support our primary dataset. These datasets include:
- Lake metric information provided by wikidata
- Lake Shapefile/GeoJSON information provided by various sources and precompiled

The data found within this folder is precompiled and should not be modified.
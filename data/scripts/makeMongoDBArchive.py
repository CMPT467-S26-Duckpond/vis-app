# This script was used to convert a bunch of shapefiles in GEOJSON format into a single mongoDB image.
# The source files this ran on no longer exist but the result is in the mongo archive

# The split file was generated using QGIS using the Vector -> Data Management Tools -> Split Vector Layer tool,
# splitting on the "name" field with the input a file in raw and the output set to the split directory

# Then this script is run to create the 467projdata.archive.gz file. This file is an image for a MongoDB database
# Containing all the different lake GeoJSON files we can use for our visualizations.
# In our website, we can query the MongoDB database for specific lake data.

# When we properly host our project, this archive file is a quick way to recreate the MongoDB database as we need it.

from pymongo import MongoClient
import os
import json
import subprocess
import requests
from time import sleep
import math

MONGO_URL = "mongodb://localhost:3001/"
DATABASE_NAME = "467projdata"
COLLECTION_NAME = "map_water_bodies"

WATER_BODIES_PATH = "../lakes/split"


def mean(values):
    return sum(values) / len(values)


if __name__ == "__main__":
    client = MongoClient(MONGO_URL)
    client.drop_database(DATABASE_NAME)
    db = client[DATABASE_NAME]

    # Read all GeoJSON files in the split dir and insert them into the database

    batch = []
    for filename in os.listdir(WATER_BODIES_PATH):
        if len(batch) >= 50:
            # Process batch and upload to MongoDB
            # Need to fetch a couple things from wikidata

            wikidata_ids = "|".join([item["wikidataId"] for item in batch])

            batchUrl = f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={wikidata_ids}&format=json&languages=en&props=claims"

            res = requests.get(
                batchUrl,
                json=True,
                headers={"User-Agent": "academic project (python script)"},
            )
            data = res.json()  # type: dict

            for item in batch:
                wikiDataId = item["wikidataId"]

                wikidataRes = data["entities"][wikiDataId]
                if wikidataRes is None:
                    continue

                # Need to get 3 properties from wikidata - surface elevation and volume, area
                # If they are missing, skip this item
                surfaceElevation = wikidataRes["claims"].get("P2044", None)
                volume = wikidataRes["claims"].get("P2234", None)
                area = wikidataRes["claims"].get("P2046", None)

                if surfaceElevation is None or volume is None or area is None:
                    continue

                surfaceElevation = mean(
                    [
                        float(claim["mainsnak"]["datavalue"]["value"]["amount"])
                        for claim in surfaceElevation
                    ]
                )
                volume = mean(
                    [
                        float(claim["mainsnak"]["datavalue"]["value"]["amount"])
                        for claim in volume
                    ]
                )
                area = mean(
                    [
                        float(claim["mainsnak"]["datavalue"]["value"]["amount"])
                        for claim in area
                    ]
                )

                toUpload = {
                    "name": item["name"],
                    "position": item["position"],
                    "geoJSON": item["geoJSON"],
                    "wikidataId": item["wikidataId"],
                    "surfaceAreaKM2": area,
                    "surfaceElevationM": math.ceil(surfaceElevation),
                    "volumeKM3": volume,
                }

                db[COLLECTION_NAME].insert_one(toUpload)
            batch = []
            sleep(1)

        if filename.endswith(".geojson"):
            with open(os.path.join(WATER_BODIES_PATH, filename), encoding="utf-8") as f:
                data = json.load(f)

                allCoordinates = data["features"][0]["geometry"]["coordinates"][0][0]
                meanCoords = [
                    sum(x) / len(allCoordinates) for x in zip(*allCoordinates)
                ]

                wikiDataId = data["features"][0]["properties"]["wikidataid"]

                # Ensure we have a wikidata entry
                if wikiDataId is None:
                    continue

                batch.append(
                    {
                        "name": data["features"][0]["properties"]["name"],
                        "position": meanCoords,
                        "geoJSON": data,
                        "wikidataId": wikiDataId,
                    }
                )

    # Export database
    subprocess.run(
        [
            "mongodump",
            f"--uri={MONGO_URL}",
            "--gzip",
            f"--db={DATABASE_NAME}",
            f"--archive={DATABASE_NAME}.archive.gz",
        ]
    )

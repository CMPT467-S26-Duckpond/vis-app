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
from area import area as calculate_area

MONGO_URL = "mongodb://localhost:3001/"
DATABASE_NAME="467projdata"
COLLECTION_NAME="map_water_bodies"

WATER_BODIES_PATH = "../lakes/split"

if __name__ == "__main__":
    client = MongoClient(MONGO_URL)
    client.drop_database(DATABASE_NAME)
    db = client[DATABASE_NAME]

    # Read all GeoJSON files in the split dir and insert them into the database
    for filename in os.listdir(WATER_BODIES_PATH):
        if filename.endswith(".geojson"):
            with open(os.path.join(WATER_BODIES_PATH, filename), encoding="utf-8") as f:
                data = json.load(f)

                area = calculate_area(data["features"][0]["geometry"])

                allCoordinates = data["features"][0]["geometry"]["coordinates"][0][0]
                meanCoords = [
                    sum(x) / len(allCoordinates) for x in zip(*allCoordinates)
                ]

                toUpload = {
                    "name": data["features"][0]["properties"]["name"],
                    "position": meanCoords,
                    "surfaceArea": area,
                    "geoJSON": data,
                }

                db[COLLECTION_NAME].insert_one(toUpload)

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

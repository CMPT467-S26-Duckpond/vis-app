import { GeoJsonObject } from "geojson";
import mongoose, { Schema } from "mongoose";

interface IMapFeature {
  name: string;
  /**
   * Mean position of the feature. Returned as a tuple of [longitude, latitude]
   */
  position: [lng: number, lat: number];
  geoJSON: GeoJsonObject;
  surfaceAreaKM2: number;
  surfaceElevationM: number;
  volumeKM3: number;
}

export const MapWaterBody = new Schema<IMapFeature>({
  name: {
    type: String,
    required: true
  },
  position: {
    type: [Number],
    required: true
  },
  geoJSON: {
    type: Object,
    required: true
  },
  surfaceAreaKM2: {
    type: Number,
    required: true
  },
  surfaceElevationM: {
    type: Number,
    required: true
  },
  volumeKM3: {
    type: Number,
    required: true
  }
});

export default mongoose.model<IMapFeature>(
  "MapWaterBody",
  MapWaterBody,
  "map_water_bodies"
);

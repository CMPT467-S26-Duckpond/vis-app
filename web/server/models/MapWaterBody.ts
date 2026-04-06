import { GeoJsonObject } from "geojson";
import mongoose, { Schema } from "mongoose";

export interface BathymetryPoint {
  longitude: number;
  latitude: number;
  /**
   * Height of the point relative to sea level in meters. 0 Represents sea level, positive values represent above sea level, and negative values represent below sea level.
   */
  z: number;
}

interface IWaterBody {
  name: string;
  /**
   * Mean position of the feature. Returned as a tuple of [longitude, latitude]
   */
  position: [lng: number, lat: number];
  geoJSON: GeoJsonObject;
  surfaceAreaKM2: number;
  surfaceElevationM: number;
  volumeKM3: number;

  /**
   * Bathymetry data of the lake. Represented as depth in meters below surface elevation
   *
   * +10m means "10 meters below surface"
   */
  depthBathymetry?: BathymetryPoint[];
}

const BathymetryPoint = new Schema<IWaterBody["depthBathymetry"]>(
  {
    longitude: {
      type: Number,
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    z: {
      type: Number,
      required: true
    }
  },
  {
    _id: false
  }
);

export const MapWaterBody = new Schema<IWaterBody>({
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
  },
  depthBathymetry: {
    type: [BathymetryPoint],
    required: false,
    default: undefined
  }
});

export default mongoose.model<IWaterBody>(
  "MapWaterBody",
  MapWaterBody,
  "map_water_bodies"
);

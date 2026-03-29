import { GeoJSON } from "leaflet";
import mongoose, { Schema } from "mongoose";

interface IMapFeature {
  name: string;
  /**
   * Mean position of the feature. Returned as a tuple of [longitude, latitude]
   */
  position: [lng: number, lat: number];
  geoJSON: GeoJSON;
}

const MapWaterBody = new Schema<IMapFeature>({
  name: {
    type: String,
    required: true
  },
  position: {
    type: Array,
    required: true
  },
  geoJSON: {
    type: Object,
    required: true
  }
});

export default mongoose.model<IMapFeature>(
  "MapWaterBody",
  MapWaterBody,
  "map_water_bodies"
);

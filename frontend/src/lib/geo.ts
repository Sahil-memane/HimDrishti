/**
 * Geographic utilities for accurately visualizing real backend data.
 *
 * MapLibre's built-in `circle` paint layer sizes its radius in *pixels*, not
 * real-world distance — it visually shrinks/grows as you zoom and is wrong
 * at different latitudes. For anything that represents a genuine physical
 * distance (like Model 2's `confidence_radius_km`), that's not a stylistic
 * choice, it's inaccurate. This module builds real geodesic circles (true
 * km radius on the Earth's surface) as GeoJSON polygons instead.
 */
import circle from '@turf/circle';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

export interface IcebergDayFeatureProps {
  iceberg_id: string;
  horizon_day: number;
  confidence_radius_km: number;
}

/**
 * Build one real geodesic circle polygon per iceberg forecast point, radius
 * = the model's actual confidence_radius_km (not a fixed pixel size).
 * Opacity/fade-by-day is applied later via a MapLibre paint expression on
 * the `horizon_day` property — this function only builds true geometry.
 */
export function buildIcebergCircles(
  icebergPoints: Array<Feature<any, IcebergDayFeatureProps>>
): FeatureCollection<Polygon, IcebergDayFeatureProps> {
  const features: Feature<Polygon, IcebergDayFeatureProps>[] = [];

  for (const pt of icebergPoints) {
    const coords = pt.geometry?.coordinates;
    const radiusKm = pt.properties?.confidence_radius_km;
    if (!coords || radiusKm == null || radiusKm <= 0) continue;

    const poly = circle([coords[0], coords[1]], radiusKm, { units: 'kilometers', steps: 48 });
    features.push({
      type: 'Feature',
      geometry: poly.geometry,
      properties: { ...pt.properties },
    });
  }

  return { type: 'FeatureCollection', features };
}

/** Format decimal degrees as degrees-minutes, e.g. 60.0 / -66.333 -> "60°00.0'N" / "66°20.0'S". */
export function toDegMin(value: number, positiveSuffix: string, negativeSuffix: string): string {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return `${String(deg).padStart(positiveSuffix === 'N' ? 2 : 3, '0')}°${min.toFixed(1).padStart(4, '0')}'${suffix}`;
}

export function latToDegMin(lat: number): string {
  return toDegMin(lat, 'N', 'S');
}

export function lonToDegMin(lon: number): string {
  return toDegMin(lon, 'E', 'W');
}

const KM_TO_NM = 0.539957;

export function kmToNm(km: number): number {
  return km * KM_TO_NM;
}

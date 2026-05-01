import type { OshFeatureCollection } from "./types";

/** Curated demo GeoJSON when OSH_API_TOKEN is unset (UI + browser testing). */
export const DEMO_FEATURE_COLLECTION: OshFeatureCollection = {
  type: "FeatureCollection",
  count: 8,
  features: [
    mk("DEMO-US-001", "US", "Aurora Cut & Sew", "Denver, CO", 39.74, -104.99, 2, "Apparel"),
    mk("DEMO-BD-002", "BD", "Dhaka Composite Mill", "Dhaka", 23.81, 90.41, 4, "Textiles"),
    mk("DEMO-VN-003", "VN", "Ho Chi Minh Assembly 7", "Ho Chi Minh City", 10.82, 106.63, 3, "Apparel"),
    mk("DEMO-IN-004", "IN", "Tirupur Knit Works", "Tiruppur", 11.11, 77.34, 5, "Apparel"),
    mk("DEMO-CN-005", "CN", "Shenzhen Final Assembly", "Shenzhen", 22.54, 114.06, 3, "Electronics"),
    mk("DEMO-MX-006", "MX", "Monterrey Components", "Monterrey", 25.69, -100.32, 2, "Automotive"),
    mk("DEMO-TR-007", "TR", "Istanbul Denim Finishing", "Istanbul", 41.01, 28.98, 4, "Apparel"),
    mk("DEMO-DE-008", "DE", "Stuttgart Logistics Hub", "Stuttgart", 48.78, 9.18, 1, "Logistics"),
  ],
};

function mk(
  osId: string,
  country: string,
  name: string,
  city: string,
  lat: number,
  lng: number,
  contributors: number,
  sector: string,
): import("./types").OshFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      os_id: osId,
      name,
      address: `${city} — demo row`,
      country_code: country,
      sector,
      product_type: "Demo product",
      facility_type: "Assembly|Warehousing",
      processing_type: "Sewing|Finishing",
      number_of_contributors: contributors,
      number_of_public_contributors: Math.max(0, contributors - 1),
    },
  };
}

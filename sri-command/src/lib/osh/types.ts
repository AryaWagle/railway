import { z } from "zod";

/** Minimal GeoJSON-ish feature from OSH GET /facilities/ */
export const oshFeatureSchema = z
  .object({
    type: z.string().optional(),
    geometry: z
      .object({
        type: z.string().optional(),
        coordinates: z.array(z.number()).optional(),
      })
      .passthrough()
      .optional(),
    properties: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const oshFeatureCollectionSchema = z.object({
  type: z.string().optional(),
  features: z.array(oshFeatureSchema),
  count: z.number().optional(),
  next: z.union([z.string(), z.null()]).optional(),
  previous: z.union([z.string(), z.null()]).optional(),
});

export type OshFeature = z.infer<typeof oshFeatureSchema>;
export type OshFeatureCollection = z.infer<typeof oshFeatureCollectionSchema>;

export type NormalizedFacility = {
  osId: string;
  name: string;
  address: string;
  countryCode?: string;
  sector?: string;
  productTypes: string[];
  facilityTypes: string[];
  processingTypes: string[];
  contributorCount: number;
  publicContributorCount?: number;
  lng?: number;
  lat?: number;
  oshUrl: string;
};

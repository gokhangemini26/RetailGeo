
export enum SegmentType {
  URBAN_PROFESSIONAL = "Şehirli Profesyonel",
  YOUNG_TRENDY = "Genç & Trend",
  FAMILY_RESIDENTIAL = "Aile & Konut",
  UNKNOWN = "Bilinmiyor"
}

export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";

export interface LocationMetrics {
  affluenceScore: number; // 0-100
  trendScore: number; // 0-100
  familyScore: number; // 0-100
  dominantSegment: SegmentType;
  reasoning: string;
}

export interface MapGroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            snippet: string;
        }[]
    }
  };
}

export interface AnalysisResult {
  locationName: string;
  rawMapData: string;
  groundingChunks: MapGroundingChunk[];
  metrics: LocationMetrics;
  productStrategy: string;
}

export interface RecommendedProduct {
  name: string;
  category: string;
  reason: string;
  estimatedPrice: string;
  matchScore: number;
  imageUrl?: string; // Optional simulated image url
}

export interface ProductDNA {
  bestMatchPersona: SegmentType;
  matchScore: number;
  analysisReasoning: string;
  styleTags: string[];
  perceivedQuality: string;
  colorPalette: string[];
}

export interface StoreProfile {
  id: string;
  name: string;
  address: string;
  segment: SegmentType;
  metrics: LocationMetrics;
  analyzedAt: string;
}

export interface StoreMatchResult {
  store: StoreProfile;
  fitScore: number;
  fitLabel: 'Mükemmel' | 'Yüksek' | 'Orta' | 'Düşük' | 'Uyumsuz';
  reason: string;
}

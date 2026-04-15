/**
 * geminiService.ts
 *
 * Client-side service. All Gemini API calls are proxied through /api/gemini
 * so the API key is NEVER exposed in the browser bundle.
 */
import { AnalysisResult, SegmentType, RecommendedProduct, ProductDNA, AspectRatio } from '../types';

const API_ENDPOINT = '/api/gemini';

// Generic helper: POST to serverless function
const callApi = async (action: string, params: object): Promise<any> => {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  return data.result;
};

// 1. GATHER DATA
export const gatherLocationData = async (
  address: string,
  customCriteria?: string
): Promise<{ text: string; chunks: any[] }> => {
  return callApi('gatherLocation', { address, customCriteria });
};

// 2. ANALYZE & THINK
export const analyzeStrategicFit = async (
  locationData: string,
  customScoring?: string
): Promise<AnalysisResult['metrics'] & { productStrategy: string }> => {
  return callApi('analyzeFit', { locationData, customScoring });
};

// 3. STORE-PRODUCT OPTIMIZATION
export const generateProductRecommendations = async (
  persona: SegmentType,
  brandUrl: string
): Promise<RecommendedProduct[]> => {
  return callApi('productRecommendations', { persona, brandUrl });
};

// 4. ANALYZE PRODUCT DNA
export const analyzeProductDna = async (
  imageBase64: string,
  mimeType: string,
  price: number
): Promise<ProductDNA> => {
  return callApi('analyzeDna', { imageBase64, mimeType, price });
};

// 5. GENERATE MOOD BOARD
export const generateMoodBoard = async (
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  // aspectRatio passed through for potential future server-side use
  return callApi('generateMoodBoard', { prompt, aspectRatio });
};
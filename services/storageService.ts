
import { AnalysisResult, StoreProfile, SegmentType } from '../types';

const STORAGE_KEY = 'retailgeo_stores_db';

export const saveStoreToDatabase = (result: AnalysisResult): StoreProfile => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  const stores: StoreProfile[] = existingData ? JSON.parse(existingData) : [];

  // Check for duplicates based on address (simple check)
  const exists = stores.find(s => s.address.toLowerCase() === result.locationName.toLowerCase());
  
  if (exists) {
    // Update existing
    const updatedStore: StoreProfile = {
      ...exists,
      segment: result.metrics.dominantSegment,
      metrics: result.metrics,
      analyzedAt: new Date().toISOString()
    };
    const updatedList = stores.map(s => s.id === exists.id ? updatedStore : s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    return updatedStore;
  } else {
    // Create new
    const newStore: StoreProfile = {
      id: crypto.randomUUID(),
      name: result.locationName.split(',')[0], // Simple name extraction
      address: result.locationName,
      segment: result.metrics.dominantSegment,
      metrics: result.metrics,
      analyzedAt: new Date().toISOString()
    };
    stores.push(newStore);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
    return newStore;
  }
};

export const getStoredStores = (): StoreProfile[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearDatabase = () => {
  localStorage.removeItem(STORAGE_KEY);
};

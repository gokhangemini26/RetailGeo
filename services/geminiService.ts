import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, SegmentType, RecommendedProduct, ProductDNA, AspectRatio } from "../types";

// Helper to ensure API key exists
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Anahtarı bulunamadı. Lütfen hosting panelinizde (Vercel/Netlify/vb.) 'API_KEY' adında bir Environment Variable tanımladığınızdan emin olun.");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. GATHER DATA: Robust Fallback Strategy
export const gatherLocationData = async (address: string, customCriteria?: string): Promise<{ text: string; chunks: any[] }> => {
  const ai = getClient();
  
  // Default criteria if not provided
  const criteriaText = customCriteria || `
    1km yarıçapındaki ticari ve sosyal çevrenin detaylı bir envanterini çıkar.
    
    ÖZELLİKLE ŞU "İŞARETÇİ" (PROXY) KATEGORİLERİ ARA:
    
    1. Lüks ve Premium Tüketim: Macro Center, Vakko, Beymen, Godiva gibi markalar VEYA "Gurme Market", "Lüks Giyim", "Fine Dining" kategorileri.
    2. Orta-Üst & Trend Tüketim: Starbucks, Migros (M/MM), Mavi, Kahve Dünyası, Bağımsız (Artisan) Kahveciler, Suşiciler, Kokteyl Barlar.
    3. Standart & Aile Tüketimi: LC Waikiki, DeFacto, Şok, A101, Ziraat Bankası, Devlet Okulları, Parklar, Konut Siteleri.
    4. Uygun Fiyatlı Tüketim: BİM, Spotçular, Ucuzluk Pazarları, Outletler.
    5. Yaşam & Trafik: Özel Okullar / Kolejler, Metro İstasyonları, Spor Salonları (MacFit vb.), Üniversite Kampüsleri.

    Bu markaların veya KATEGORİLERİN varlığına dayalı olarak bölgenin ticari dokusunu özetle.
  `;

  const basePrompt = `
    Şu konumu analiz et: "${address}".
    ${criteriaText}
  `;

  // STRATEGY 1: TRY GOOGLE MAPS GROUNDING
  try {
    console.log("Attempting Strategy 1: Google Maps Grounding...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: basePrompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });
    return {
      text: response.text || "Veri bulunamadı.",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  } catch (mapError: any) {
    console.warn("Strategy 1 (Maps) failed:", mapError);

    // STRATEGY 2: TRY GOOGLE SEARCH GROUNDING
    try {
      console.log("Attempting Strategy 2: Google Search Grounding...");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: basePrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      return {
        text: response.text || "Veri bulunamadı.",
        chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
      };
    } catch (searchError: any) {
      console.warn("Strategy 2 (Search) failed:", searchError);

      // STRATEGY 3: FALLBACK TO INTERNAL KNOWLEDGE (NO TOOLS)
      try {
        console.log("Attempting Strategy 3: Internal Knowledge (No Tools)...");
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: basePrompt + "\n\n(Not: Harita araçlarına erişilemedi, lütfen kendi genel coğrafi bilginle bu bölgeyi, semti ve atmosferini analiz et.)",
          config: {
            // Explicitly no tools to avoid CORS/Network errors
          }
        });
        return {
          text: response.text || "Veri bulunamadı.",
          chunks: [],
        };
      } catch (finalError: any) {
        console.error("All strategies failed:", finalError);
        const msg = finalError.message || finalError.toString();
        
        let friendlyMsg = msg;
        if (msg.includes("403")) friendlyMsg = "API Anahtarı yetkisi reddedildi (403). Domain kısıtlamalarını kontrol edin.";
        if (msg.includes("Failed to fetch")) friendlyMsg = "İnternet bağlantısı veya Ağ hatası (CORS).";
        
        throw new Error(`Konum verileri toplanamadı. ${friendlyMsg}`);
      }
    }
  }
};

// 2. ANALYZE & THINK: Fallback Strategy for Pro Model
export const analyzeStrategicFit = async (locationData: string, customScoring?: string): Promise<AnalysisResult['metrics'] & { productStrategy: string }> => {
  const ai = getClient();

  const scoringLogic = customScoring || `
    GÖREV: Aşağıdaki "Puanlama Tablosunu" kullanarak bölgenin skorlarını hesapla.
    Başlangıç Puanı her kategori için 50'dir (Nötr). Bulduğun her işaretçi için puan ekle veya çıkar.
    Skorlar 0'ın altına düşemez, 100'ü geçemez.

    PUANLAMA TABLOSU (PROXY INDICATORS):
    ---------------------------------------------------------
    | İşaretçi (Varlık veya Kategori) | Etki | Hedef Kitle |
    | :--- | :--- | :--- |
    | **Lüks Markalar / Plaza / Rezidans** | **+10 Puan** | Refah (Affluence) |
    | **Starbucks / 3. Nesil Kahve / Sanat** | **+8 Puan** | Trend (Gençlik/Modern) |
    | **Özel Okul / Kolej / Site Yaşamı** | **+7 Puan** | Aile (Family) |
    | **Metro / AVM / İşlek Cadde** | **+5 Puan** | Genel Trafik (Hepsine +2) |
    | **Marketler (Migros, Carrefour)** | **+3 Puan** | Aile & Refah |
    | **İndirim Marketleri (BİM/A101)** | **-4 Puan** | Refah Skoru Düşer |
    ---------------------------------------------------------

    HESAPLAMA MANTIĞI:
    1. Refah Puanı (Affluence Score): 50 + (Lüks Göstergeler) - (Ucuzluk Göstergeleri).
    2. Trend Puanı (Trend Score): 50 + (Kahveciler) + (Gece Hayatı/Sanat) + (Üniversite).
    3. Aile Puanı (Family Score): 50 + (Okullar) + (Parklar) + (Konut/Marketler).

    BASKIN SEGMENT SEÇİMİ (ZORUNLU):
    Aşağıdaki kurallara göre EN UYGUN segmenti seçmek ZORUNDASIN. "Bilinmiyor" seçeneğini kullanma.
    
    1. "Şehirli Profesyonel": Eğer (Refah > 60) VE (Trend > 55). (Plaza, Lüks, Cadde).
    2. "Genç & Trend": Eğer (Trend > Refah) VE (Trend > Aile). (Öğrenci, Kafe, Eğlence).
    3. "Aile & Konut": Eğer (Aile > 60) VE (Aile > Trend). (Okul, Market, Park, Site).
  `;

  const prompt = `
    Sen "RetailGeo Hibrit Ölçüm Metodu"nu kullanan Kıdemli bir Stratejistisin.
    
    Aşağıdaki konum verilerini (Google Maps çıktısı) analiz et:
    ---
    ${locationData}
    ---

    ${scoringLogic}
    
    *Eğer puanlar birbirine çok yakınsa, metin içerisindeki "atmosfere" göre inisiyatif al ve birini seç.*

    ÇIKTI:
    JSON formatında yanıtla.
    dominantSegment alanı SADECE şunlardan biri olmalıdır: "Şehirli Profesyonel", "Genç & Trend", "Aile & Konut".
    
    Ürün Stratejisi (productStrategy):
    Belirlenen segmente göre Markdown formatında detaylı bir öneri yaz.
  `;

  const commonConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        affluenceScore: { type: Type.NUMBER },
        trendScore: { type: Type.NUMBER },
        familyScore: { type: Type.NUMBER },
        dominantSegment: { type: Type.STRING, enum: ["Şehirli Profesyonel", "Genç & Trend", "Aile & Konut"] },
        reasoning: { type: Type.STRING },
        productStrategy: { type: Type.STRING }
      },
      required: ["affluenceScore", "trendScore", "familyScore", "dominantSegment", "reasoning", "productStrategy"]
    }
  };

  // Helper to parse and validate result
  const parseResult = (text: string) => {
    try {
        const result = JSON.parse(text || "{}");
        let segment = SegmentType.UNKNOWN;
        const segments = Object.values(SegmentType);
        const normalizedResultSegment = result.dominantSegment?.trim();

        if (segments.includes(normalizedResultSegment as SegmentType)) {
          segment = normalizedResultSegment as SegmentType;
        } else {
            // Fallback logic if AI still sends something weird
            if (result.affluenceScore >= result.trendScore && result.affluenceScore >= result.familyScore) {
                segment = SegmentType.URBAN_PROFESSIONAL;
            } else if (result.trendScore >= result.familyScore) {
                segment = SegmentType.YOUNG_TRENDY;
            } else {
                segment = SegmentType.FAMILY_RESIDENTIAL;
            }
        }
        return {
          affluenceScore: result.affluenceScore,
          trendScore: result.trendScore,
          familyScore: result.familyScore,
          dominantSegment: segment,
          reasoning: result.reasoning,
          productStrategy: result.productStrategy
        };
    } catch (e) {
        throw new Error("JSON Parse Error");
    }
  };

  // PLAN A: Try Gemini 3 Pro (Thinking)
  try {
    console.log("Attempting Analysis with Gemini 3 Pro...");
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        ...commonConfig,
        thinkingConfig: { thinkingBudget: 1024 }, // Lower budget to be safer/faster
      }
    });
    return parseResult(response.text || "{}");
  } catch (proError: any) {
    console.warn("Gemini 3 Pro failed, falling back to Flash:", proError);
    
    // PLAN B: Fallback to Gemini 2.5 Flash
    try {
        console.log("Attempting Analysis with Gemini 2.5 Flash...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: commonConfig
        });
        return parseResult(response.text || "{}");
    } catch (flashError: any) {
        console.error("All analysis models failed:", flashError);
        throw new Error("Analiz modelleri yanıt vermedi. Lütfen daha sonra tekrar deneyin.");
    }
  }
};

// 3. STORE-PRODUCT OPTIMIZATION
export const generateProductRecommendations = async (persona: SegmentType, brandUrl: string): Promise<RecommendedProduct[]> => {
    const ai = getClient();

    const prompt = `
      Sen Dijital Merchandising uzmanısın.
      Hedef Mağaza Personası: "${persona}"
      Marka Web Sitesi/Koleksiyon Kaynağı: "${brandUrl}"
  
      Görevin:
      Bu web sitesindeki (veya markanın genel bilinirliğindeki) ürün koleksiyonunu simüle et.
      Bu spesifik persona için en yüksek dönüşüm oranına sahip olacak **EN AZ 25 ADET** ürün seç ve listele.
      
      Çok Önemli: Her bir ürünü şu 3 kategoriden birine ata: "Üst Giyim", "Alt Giyim", "Aksesuar".
      
      Örneğin "Şehirli Profesyonel" için "Slim Fit İtalyan Kesim Blazer" (Üst Giyim) seçmelisin.
      
      Her ürün için:
      - Ürün Adı
      - Kategori (SADECE şunlardan biri: 'Üst Giyim', 'Alt Giyim', 'Aksesuar')
      - Neden bu mağazaya ve personaya uygun olduğu (kısa ve net gerekçe)
      - Tahmini fiyat (TRY cinsinden)
      - Uyum Skoru (0-100)
      
      JSON formatında yanıtla. Listede en az 25 ürün olduğundan emin ol.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ["Üst Giyim", "Alt Giyim", "Aksesuar"] },
                    reason: { type: Type.STRING },
                    estimatedPrice: { type: Type.STRING },
                    matchScore: { type: Type.NUMBER }
                },
                required: ["name", "category", "reason", "estimatedPrice", "matchScore"]
            }
          }
        }
      });
  
      return JSON.parse(response.text || "[]");
    } catch (error: any) {
      console.error("Recommendation Error:", error);
      return [];
    }
  };

// 4. ANALYZE PRODUCT DNA
export const analyzeProductDna = async (imageBase64: string, mimeType: string, price: number): Promise<ProductDNA> => {
    const ai = getClient();
    
    // Explicitly listing the enum values for the model to choose from
    const segmentsList = Object.values(SegmentType).filter(v => v !== SegmentType.UNKNOWN).join(", ");

    const prompt = `
      Sen bir Moda Perakende ve Ürün Analistisin.
      
      Elimizde bir ürün görseli ve fiyat bilgisi var.
      Fiyat: ${price} TL
      
      Görevin bu ürünün DNA'sını çıkarmak ve aşağıdaki müşteri segmentlerinden hangisine en çok uyduğunu belirlemek:
      Segmentler: ${segmentsList}
      
      Lütfen şunları analiz et:
      1. En uygun Persona (Segment)
      2. Uyum Skoru (0-100)
      3. Analiz Gerekçesi (Neden bu segment?)
      4. Stil Etiketleri (örn: #minimal, #vintage, #streetwear)
      5. Algılanan Kalite (Düşük, Orta, Yüksek, Premium)
      6. Baskın Renk Paleti (Renk isimleri)
      
      JSON formatında yanıtla.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
                { text: prompt }
            ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                bestMatchPersona: { type: Type.STRING, enum: Object.values(SegmentType).filter(v => v !== SegmentType.UNKNOWN) },
                matchScore: { type: Type.NUMBER },
                analysisReasoning: { type: Type.STRING },
                styleTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                perceivedQuality: { type: Type.STRING },
                colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["bestMatchPersona", "matchScore", "analysisReasoning", "styleTags", "perceivedQuality", "colorPalette"]
        }
        }
      });
  
      const result = JSON.parse(response.text || "{}");
      
      // Map string to enum safely
      let segment = SegmentType.UNKNOWN;
      const segments = Object.values(SegmentType);
      if (segments.includes(result.bestMatchPersona)) {
        segment = result.bestMatchPersona as SegmentType;
      }
  
      return {
        bestMatchPersona: segment,
        matchScore: result.matchScore,
        analysisReasoning: result.analysisReasoning,
        styleTags: result.styleTags,
        perceivedQuality: result.perceivedQuality,
        colorPalette: result.colorPalette
      };
    } catch (error: any) {
      console.error("Product DNA Error:", error);
      const msg = error.message || error.toString();
      throw new Error(`Ürün analizi gerçekleştirilemedi: ${msg}`);
    }
  };

// 5. GENERATE MOOD BOARD
export const generateMoodBoard = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    const ai = getClient();
    
    // Gemini 2.5 Flash Image supports: "1:1", "3:4", "4:3", "9:16", "16:9"
    // We must fallback unsupported ratios from AspectRatio type.
    let validRatio = aspectRatio;
    const supportedRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    
    if (!supportedRatios.includes(aspectRatio)) {
        if (aspectRatio === "2:3") validRatio = "3:4";
        if (aspectRatio === "3:2") validRatio = "4:3";
        if (aspectRatio === "21:9") validRatio = "16:9";
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                parts: [
                    { text: `Create a high-quality, professional retail store mood board. Concept: ${prompt}` }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: validRatio as any
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64 = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
                return `data:${mimeType};base64,${base64}`;
            }
        }
        
        throw new Error("Görsel oluşturulamadı.");
    } catch (error: any) {
        console.error("Mood Board Generation Error:", error);
        throw new Error(`Mood Board oluşturulamadı: ${error.message}`);
    }
};
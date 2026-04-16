import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// Increase body size limit for base64 image uploads (Product DNA feature)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// SegmentType enum values (mirrored from types.ts)
const SegmentType = {
  URBAN_PROFESSIONAL: 'Şehirli Profesyonel',
  YOUNG_TRENDY: 'Genç & Trend',
  FAMILY_RESIDENTIAL: 'Aile & Konut',
  UNKNOWN: 'Bilinmiyor',
} as const;
type SegmentTypeValue = typeof SegmentType[keyof typeof SegmentType];

const getClient = (apiKey: string) => new GoogleGenAI({ apiKey });

// ─── ACTION HANDLERS ──────────────────────────────────────────────────────────

async function handleGatherLocation(ai: GoogleGenAI, body: any) {
  const { address, customCriteria } = body;

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

  const basePrompt = `Şu konumu analiz et: "${address}".\n${criteriaText}`;

  // Strategy 1: Google Search Grounding
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: basePrompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    return {
      text: response.text || 'Veri bulunamadı.',
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  } catch (searchError: any) {
    console.warn('Strategy 1 (Search) failed, using internal knowledge:', searchError.message);

    // Strategy 2: Internal knowledge fallback
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: basePrompt + '\n\n(Not: Arama araçlarına erişilemedi. Kendi genel coğrafi ve demografik bilginle bu bölgeyi, semti ve atmosferini analiz et.)',
    });
    return {
      text: response.text || 'Veri bulunamadı.',
      chunks: [],
    };
  }
}

async function handleAnalyzeFit(ai: GoogleGenAI, body: any) {
  const { locationData, customScoring } = body;

  const scoringLogic = customScoring || `
    GÖREV: Aşağıdaki "Puanlama Tablosunu" kullanarak bölgenin skorlarını hesapla.
    Başlangıç Puanı her kategori için 50'dir (Nötr). Bulduğun her işaretçi için puan ekle veya çıkar.
    Skorlar 0'ın altına düşemez, 100'ü geçemez.

    PUANLAMA TABLOSU (PROXY INDICATORS):
    | İşaretçi | Etki | Hedef Kitle |
    | Lüks Markalar / Plaza / Rezidans | +10 Puan | Refah |
    | Starbucks / 3. Nesil Kahve / Sanat | +8 Puan | Trend |
    | Özel Okul / Kolej / Site Yaşamı | +7 Puan | Aile |
    | Metro / AVM / İşlek Cadde | +5 Puan | Genel Trafik |
    | Marketler (Migros, Carrefour) | +3 Puan | Aile & Refah |
    | İndirim Marketleri (BİM/A101) | -4 Puan | Refah Skoru Düşer |

    BASKIN SEGMENT SEÇİMİ (ZORUNLU):
    1. "Şehirli Profesyonel": Eğer (Refah > 60) VE (Trend > 55).
    2. "Genç & Trend": Eğer (Trend > Refah) VE (Trend > Aile).
    3. "Aile & Konut": Eğer (Aile > 60) VE (Aile > Trend).
  `;

  const prompt = `
    Sen "RetailGeo Hibrit Ölçüm Metodu"nu kullanan Kıdemli bir Stratejistisin.
    Aşağıdaki konum verilerini analiz et:
    ---
    ${locationData}
    ---
    ${scoringLogic}
    *Eğer puanlar birbirine çok yakınsa, metin içerisindeki "atmosfere" göre inisiyatif al ve birini seç.*
    ÇIKTI: JSON formatında yanıtla.
    dominantSegment alanı SADECE şunlardan biri olmalıdır: "Şehirli Profesyonel", "Genç & Trend", "Aile & Konut".
    Ürün Stratejisi (productStrategy): Belirlenen segmente göre Markdown formatında detaylı bir öneri yaz.
  `;

  const commonConfig = {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        affluenceScore: { type: Type.NUMBER },
        trendScore: { type: Type.NUMBER },
        familyScore: { type: Type.NUMBER },
        dominantSegment: { type: Type.STRING, enum: ['Şehirli Profesyonel', 'Genç & Trend', 'Aile & Konut'] },
        reasoning: { type: Type.STRING },
        productStrategy: { type: Type.STRING },
      },
      required: ['affluenceScore', 'trendScore', 'familyScore', 'dominantSegment', 'reasoning', 'productStrategy'],
    },
  };

  const parseResult = (text: string) => {
    const result = JSON.parse(text || '{}');
    const allSegments = Object.values(SegmentType);
    let segment: SegmentTypeValue = SegmentType.UNKNOWN;
    if (allSegments.includes(result.dominantSegment?.trim())) {
      segment = result.dominantSegment.trim();
    } else if (result.affluenceScore >= result.trendScore && result.affluenceScore >= result.familyScore) {
      segment = SegmentType.URBAN_PROFESSIONAL;
    } else if (result.trendScore >= result.familyScore) {
      segment = SegmentType.YOUNG_TRENDY;
    } else {
      segment = SegmentType.FAMILY_RESIDENTIAL;
    }
    return { ...result, dominantSegment: segment };
  };

  // Plan A: gemini-3.0-flash
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: prompt,
      config: commonConfig,
    });
    return parseResult(response.text || '{}');
  } catch {
    // Plan B: gemini-3.0-flash fallback
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: prompt,
      config: commonConfig,
    });
    return parseResult(response.text || '{}');
  }
}

async function handleProductRecommendations(ai: GoogleGenAI, body: any) {
  const { persona, brandUrl } = body;

  const prompt = `
    Sen Dijital Merchandising uzmanısın.
    Hedef Mağaza Personası: "${persona}"
    Marka Web Sitesi/Koleksiyon Kaynağı: "${brandUrl}"

    Bu persona için en yüksek dönüşüm oranına sahip olacak EN AZ 25 ADET ürün seç ve listele.
    Her ürünü şu 3 kategoriden birine ata: "Üst Giyim", "Alt Giyim", "Aksesuar".
    Her ürün için: Ürün Adı, Kategori, Gerekçe, Tahmini fiyat (TRY), Uyum Skoru (0-100).
    JSON formatında yanıtla. Listede en az 25 ürün olduğundan emin ol.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['Üst Giyim', 'Alt Giyim', 'Aksesuar'] },
            reason: { type: Type.STRING },
            estimatedPrice: { type: Type.STRING },
            matchScore: { type: Type.NUMBER },
          },
          required: ['name', 'category', 'reason', 'estimatedPrice', 'matchScore'],
        },
      },
    },
  });

  return JSON.parse(response.text || '[]');
}

async function handleAnalyzeDna(ai: GoogleGenAI, body: any) {
  const { imageBase64, mimeType, price } = body;
  const segmentsList = Object.values(SegmentType).filter(v => v !== SegmentType.UNKNOWN).join(', ');

  const prompt = `
    Sen bir Moda Perakende ve Ürün Analistisin.
    Fiyat: ${price} TL
    Görevin bu ürünün DNA'sını çıkarmak ve şu segmentlerden hangisine uyduğunu belirlemek: ${segmentsList}
    JSON formatında yanıtla.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.0-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
        { text: prompt },
      ],
    } as any,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bestMatchPersona: { type: Type.STRING, enum: Object.values(SegmentType).filter(v => v !== SegmentType.UNKNOWN) },
          matchScore: { type: Type.NUMBER },
          analysisReasoning: { type: Type.STRING },
          styleTags: { type: Type.ARRAY, items: { type: Type.STRING } },
          perceivedQuality: { type: Type.STRING },
          colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['bestMatchPersona', 'matchScore', 'analysisReasoning', 'styleTags', 'perceivedQuality', 'colorPalette'],
      },
    },
  });

  const result = JSON.parse(response.text || '{}');
  const allSegments = Object.values(SegmentType);
  const segment = allSegments.includes(result.bestMatchPersona) ? result.bestMatchPersona : SegmentType.UNKNOWN;
  return { ...result, bestMatchPersona: segment };
}

async function handleGenerateMoodBoard(ai: GoogleGenAI, body: any) {
  const { prompt } = body;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-preview-image-generation',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Create a high-quality, professional retail store mood board image. Concept: ${prompt}. Style: editorial, fashion retail, modern design aesthetic.`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    } as any,
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if ((part as any).inlineData) {
      const inlineData = (part as any).inlineData;
      return `data:${inlineData.mimeType || 'image/png'};base64,${inlineData.data}`;
    }
  }

  throw new Error('Model görsel döndürmedi.');
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables.',
    });
  }

  const ai = getClient(apiKey);
  const { action, ...params } = req.body;

  try {
    let result: any;

    switch (action) {
      case 'gatherLocation':
        result = await handleGatherLocation(ai, params);
        break;
      case 'analyzeFit':
        result = await handleAnalyzeFit(ai, params);
        break;
      case 'productRecommendations':
        result = await handleProductRecommendations(ai, params);
        break;
      case 'analyzeDna':
        result = await handleAnalyzeDna(ai, params);
        break;
      case 'generateMoodBoard':
        result = await handleGenerateMoodBoard(ai, params);
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error(`[/api/gemini] action=${action} error:`, error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

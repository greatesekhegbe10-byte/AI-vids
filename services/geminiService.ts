import { GoogleGenAI, Type, Modality, VideoGenerationReferenceType, GenerateContentResponse } from "@google/genai";
import { GeneratedResult, VoiceName } from "../types";

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Enhanced retry wrapper with longer exponential backoff.
 * Veo and Search tools often require longer cooldowns during high load.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 10, delay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    const isRetryable = 
      errorStr.includes('503') || 
      errorStr.includes('overloaded') || 
      errorStr.includes('unavailable') || 
      errorStr.includes('429') || 
      errorStr.includes('rate limit') ||
      errorStr.includes('504') ||
      errorStr.includes('deadline') ||
      errorStr.includes('internal error');

    if (retries > 0 && isRetryable) {
      console.warn(`Gemini API busy/overloaded. Waiting ${delay}ms before retry ${11-retries}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Progressive backoff: Increase delay by 50% each time
      return withRetry(fn, retries - 1, Math.floor(delay * 1.5));
    }
    throw error;
  }
}

/**
 * Generates a WAV URL from raw PCM data.
 * Fixes alignment to ensure the browser can always decode the stream.
 */
const createWavUrl = (base64PCM: string): string => {
  try {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Ensure 16-bit alignment
    const alignedLength = Math.floor(bytes.byteLength / 2) * 2;
    const int16Data = new Int16Array(bytes.buffer, 0, alignedLength / 2);
    
    const sampleRate = 24000;
    const numChannels = 1;
    const totalSize = 44 + int16Data.byteLength;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.byteLength, true);
    new Uint8Array(buffer, 44).set(new Uint8Array(int16Data.buffer));

    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  } catch (e) {
    console.error("WAV creation failed:", e);
    return "";
  }
};

const enhancePromptWithSearch = async (
  name: string, 
  url: string, 
  description: string,
  introText?: string,
  outroText?: string
): Promise<{ visualPrompt: string; slogan: string; voiceoverScript: string }> => {
  const fallback = {
    visualPrompt: `High-end commercial for "${name}". ${introText ? `Start with: ${introText}.` : ''} Scene: Dynamic product close-ups with professional studio lighting. Atmosphere: Premium and detailed. Action: High-quality product demonstration. ${outroText ? `End with: ${outroText}.` : ''} 4k resolution, cinematic quality.`,
    slogan: `${name.toUpperCase()}: REDEFINED.`,
    voiceoverScript: `Discover the innovation behind ${name}. ${description}. The future is here.`
  };

  try {
    // ALWAYS create a fresh instance to use the latest API_KEY from the selection dialog
    const ai = new GoogleGenAI({ apiKey: (process.env.API_KEY || "").trim() });
    
    const prompt = `Task: Commercial Direction Specialist.
      Product: "${name}" ${url ? `(Website: ${url})` : ''}
      Details: "${description}"
      Specifics: Intro(${introText || 'none'}), Outro(${outroText || 'none'})

      ${url ? 'Use Google Search to find accurate product info and brand tone from the URL provided.' : 'Generate a creative direction using the product name and description.'}
      Output strictly JSON:
      - visualPrompt: Detailed cinematic scene description for video generator.
      - slogan: Catchy 3-5 word slogan.
      - voiceoverScript: Engaging 15-second script.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: url ? [{ googleSearch: {} }] : [],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualPrompt: { type: Type.STRING },
            slogan: { type: Type.STRING },
            voiceoverScript: { type: Type.STRING }
          },
          required: ["visualPrompt", "slogan", "voiceoverScript"]
        }
      }
    })) as GenerateContentResponse;

    const text = response.text;
    if (!text) return fallback;
    
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn("Creative JSON parse error, reverting to fallback logic.", parseError);
      return fallback;
    }
  } catch (error) {
    console.warn("Creative research (Search Tool) failed after retries. Proceeding with robust internal creative fallback.", error);
    return fallback;
  }
};

const generateVoiceover = async (script: string, voiceName: VoiceName): Promise<string | null> => {
  try {
    // ALWAYS create a fresh instance to use the latest API_KEY from the selection dialog
    const ai = new GoogleGenAI({ apiKey: (process.env.API_KEY || "").trim() });

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Professional commercial reading of this script: ${script}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    })) as GenerateContentResponse;
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;
    
    return createWavUrl(base64Audio);
  } catch (e) {
    console.warn("Voiceover generation failed. Proceeding with silent video.", e);
    return null;
  }
};

export const extendVideo = async (
  originalVideo: any, 
  prompt: string, 
  aspectRatio: '16:9' | '9:16'
): Promise<GeneratedResult> => {
  const apiKey = (process.env.API_KEY || "").trim();
  // ALWAYS create a fresh instance to use the latest API_KEY from the selection dialog
  const ai = new GoogleGenAI({ apiKey });

  let operation: any = await withRetry(() => ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: `Smoothly extend the previous sequence: ${prompt}`,
    video: originalVideo,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    }
  }));

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    // ALWAYS create a fresh instance for operations too
    const opAi = new GoogleGenAI({ apiKey: (process.env.API_KEY || "").trim() });
    operation = await withRetry(() => opAi.operations.getVideosOperation({ operation: operation }));
  }

  if (operation.error) {
    throw new Error(`Extension error: ${operation.error.message || "Failed to extend video."}`);
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Extension returned no data.");

  return {
    videoUrl: `${videoUri}&key=${apiKey}`,
    audioUrl: null, 
    videoOperation: operation.response?.generatedVideos?.[0]?.video
  };
};

export const generateVideoAd = async (
  name: string, 
  description: string, 
  images: File[], 
  aspectRatio: '16:9' | '9:16',
  websiteUrl: string,
  voice: VoiceName,
  introText?: string,
  outroText?: string
): Promise<GeneratedResult> => {
  const apiKey = (process.env.API_KEY || "").trim();
  if (!apiKey) throw new Error("Please select an API key to begin.");

  if (images.length === 0) {
    throw new Error("A product image is mandatory for high-quality ad generation.");
  }

  // 1. Process Reference Image
  const imageBase64 = await fileToBase64(images[0]);
  const mimeType = images[0].type;
  const imagePart = { imageBytes: imageBase64, mimeType };

  // 2. Research Phase (Search-Optional/Fail-Safe)
  const creative = await enhancePromptWithSearch(
    name, websiteUrl, description, introText, outroText
  );

  const finalPrompt = `${creative.visualPrompt} Feature a professional slogan overlay that says: "${creative.slogan}". Polished marketing aesthetics.`;

  // 3. Main Generation Loop
  const videoTask = (async () => {
    // Fast preview model has higher capacity/availability
    const model = 'veo-3.1-fast-generate-preview';
    
    const videoConfig: any = {
      model,
      prompt: finalPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    };

    // Fast preview supports starting image via the 'image' field directly
    videoConfig.image = imagePart;

    // ALWAYS create a fresh instance
    const ai = new GoogleGenAI({ apiKey: (process.env.API_KEY || "").trim() });
    let operation: any = await withRetry(() => ai.models.generateVideos(videoConfig));

    // Wait loop with safety threshold
    let attempts = 0;
    while (!operation.done && attempts < 90) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      // Re-instantiate for each poll just in case
      const pollAi = new GoogleGenAI({ apiKey: (process.env.API_KEY || "").trim() });
      operation = await withRetry(() => pollAi.operations.getVideosOperation({ operation: operation }));
      attempts++;
    }

    if (operation.error) {
      throw new Error(`Veo Engine: ${operation.error.message || "The generation was cancelled by the server."}`);
    }
    
    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video?.uri) throw new Error("Video render completed but no data URI was returned.");

    return { uri: `${video.uri}&key=${(process.env.API_KEY || "").trim()}`, raw: video };
  })();

  const audioTask = generateVoiceover(creative.voiceoverScript, voice);
  
  try {
    const [videoResult, audioUrl] = await Promise.all([videoTask, audioTask]);
    return {
      videoUrl: videoResult.uri,
      audioUrl,
      videoOperation: videoResult.raw
    };
  } catch (e: any) {
    console.error("Ad Genius Generation Error:", e);
    throw e;
  }
};
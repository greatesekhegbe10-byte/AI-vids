
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
 * Robust retry wrapper with exponential backoff.
 * Specifically targets 503 (Overloaded), 429 (Rate Limit), and 504 (Gateway Timeout)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> {
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
      errorStr.includes('deadline');

    if (retries > 0 && isRetryable) {
      console.warn(`Gemini API Busy/Overloaded. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Increase delay for next attempt (exponential backoff)
      return withRetry(fn, retries - 1, Math.floor(delay * 1.5));
    }
    throw error;
  }
}

/**
 * Generates a WAV URL from raw PCM data.
 * Ensures strict 16-bit alignment to prevent disturbed stream errors.
 */
const createWavUrl = (base64PCM: string): string => {
  try {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Ensure 16-bit alignment (2 bytes per sample)
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

const generateProductImage = async (ai: GoogleGenAI, name: string, description: string): Promise<{ data: string, mimeType: string }> => {
  const extractImage = (response: any) => {
    const candidates = response.candidates || [];
    if (candidates.length === 0) return null;
    const parts = candidates[0].content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }
    return null;
  };

  try {
    // Explicitly cast the response to GenerateContentResponse to fix 'unknown' type errors.
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `High-end professional studio photography of ${name}. ${description}. 4k, ultra-detailed.` }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
      }
    })) as GenerateContentResponse;
    
    const result = extractImage(response);
    if (result) return result;
  } catch (e) {
    console.warn("Pro image generation failed/overloaded, falling back to Flash image.", e);
  }

  try {
    // Explicitly cast the response to GenerateContentResponse to fix 'unknown' type errors.
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional product photography of ${name}. ${description}.` }]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    })) as GenerateContentResponse;

    const result = extractImage(response);
    if (result) return result;
  } catch (e) {
    console.error("Flash image generation failed:", e);
  }

  throw new Error("Unable to generate product imagery. Please check your API usage or try again.");
};

const enhancePromptWithSearch = async (
  ai: GoogleGenAI, 
  name: string, 
  url: string, 
  description: string,
  introText?: string,
  outroText?: string
): Promise<{ visualPrompt: string; slogan: string; voiceoverScript: string }> => {
  const fallback = {
    visualPrompt: `Professional commercial for "${name}". ${introText ? `Intro: ${introText}.` : ''} Highlighting: ${description}. ${outroText ? `Outro: ${outroText}.` : ''} Cinematic lighting, close-ups.`,
    slogan: name.toUpperCase(),
    voiceoverScript: `Meet the new ${name}. ${description}. Quality you can trust.`
  };

  try {
    // Explicitly cast the response to GenerateContentResponse to fix 'unknown' type errors.
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Expert commercial director task.
      Product: "${name}" (${url})
      Details: "${description}"
      Requirements: Intro(${introText || 'none'}), Outro(${outroText || 'none'})

      Research product via Google Search for accuracy. 
      Output ONLY a JSON object with:
      - visualPrompt: Detailed cinematic scene description for video generation.
      - slogan: Catchy 3-5 word slogan.
      - voiceoverScript: Engaging 15-second script.`,
      config: {
        tools: [{ googleSearch: {} }],
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
    
    // Clean potential markdown and whitespace
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn("JSON Parse Error in creative research, using fallback.", parseError);
      return fallback;
    }
  } catch (error) {
    console.warn("Creative research (enhancePromptWithSearch) failed after retries, using local fallback.", error);
    return fallback;
  }
};

const generateVoiceover = async (ai: GoogleGenAI, script: string, voiceName: VoiceName): Promise<string | null> => {
  try {
    // Explicitly cast the response to GenerateContentResponse to fix 'unknown' type errors.
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this script naturally and professionally: ${script}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    })) as GenerateContentResponse;
    
    const candidates = response.candidates || [];
    const base64Audio = candidates[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;
    
    return createWavUrl(base64Audio);
  } catch (e) {
    console.warn("Voiceover generation failed after retries.", e);
    return null;
  }
};

export const extendVideo = async (
  originalVideo: any, 
  prompt: string, 
  aspectRatio: '16:9' | '9:16'
): Promise<GeneratedResult> => {
  const apiKey = (process.env.API_KEY || "").trim();
  const ai = new GoogleGenAI({ apiKey });

  // Use 'any' type for operation to avoid 'unknown' type property access errors.
  let operation: any = await withRetry(() => ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: `Smoothly continue the video sequence: ${prompt}`,
    video: originalVideo,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    }
  }));

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await withRetry(() => ai.operations.getVideosOperation({ operation: operation }));
  }

  if (operation.error) {
    throw new Error(`Extension failed: ${operation.error.message || "Operation Error"}`);
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Extension failed: No video URI returned.");

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
  const ai = new GoogleGenAI({ apiKey });

  // 1. Image preparation (Resilient)
  let imageBase64: string;
  let mimeType = 'image/png';
  if (images.length > 0) {
    imageBase64 = await fileToBase64(images[0]);
    mimeType = images[0].type;
  } else {
    const genImage = await generateProductImage(ai, name, description);
    imageBase64 = genImage.data;
    mimeType = genImage.mimeType;
  }
  const imagePart = { imageBytes: imageBase64, mimeType };

  // 2. Creative Research (Resilient Fallback)
  const creative = await enhancePromptWithSearch(
    ai, name, websiteUrl, description, introText, outroText
  );

  const finalPrompt = `${creative.visualPrompt} Incorporate the slogan overlay: "${creative.slogan}". High-end production value.`;

  // 3. Parallel Task: Video and Voiceover (Voiceover failure is non-blocking)
  const videoTask = (async () => {
    const model = aspectRatio === '9:16' ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
    
    const videoConfig: any = {
      model,
      prompt: finalPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    };

    // Routing image reference based on model requirement
    if (aspectRatio === '9:16') {
      videoConfig.image = imagePart;
    } else {
      videoConfig.config.referenceImages = [{
        image: imagePart,
        referenceType: VideoGenerationReferenceType.ASSET
      }];
    }

    // Use 'any' type for operation to avoid 'unknown' type property access errors.
    let operation: any = await withRetry(() => ai.models.generateVideos(videoConfig));

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await withRetry(() => ai.operations.getVideosOperation({ operation: operation }));
    }

    if (operation.error) {
      throw new Error(`Veo Generation Error: ${operation.error.message || "Unknown error"}`);
    }
    
    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video?.uri) throw new Error("No video was returned from the AI model.");

    return { uri: `${video.uri}&key=${apiKey}`, raw: video };
  })();

  const audioTask = generateVoiceover(ai, creative.voiceoverScript, voice);
  
  // Await results
  try {
    const [videoResult, audioUrl] = await Promise.all([videoTask, audioTask]);
    return {
      videoUrl: videoResult.uri,
      audioUrl,
      videoOperation: videoResult.raw
    };
  } catch (e: any) {
    console.error("Critical Generation Error:", e);
    throw e;
  }
};

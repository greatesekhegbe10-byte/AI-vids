
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { GeneratedResult, VoiceName, CreativeConcept } from "../types";

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

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
 * Enhanced retry logic with specific backoff schedule for quota limits.
 * Schedule: 30s -> 60s -> 120s (max 3 retries) for 429 Errors.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, currentDelay = 30000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    const isQuotaError = errorStr.includes('429') || errorStr.includes('resource_exhausted');

    if (retries > 0 && isQuotaError) {
      console.warn(`Quota reached. Retrying in ${currentDelay / 1000}s... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      // Exponential backoff: 30s -> 60s -> 120s
      return withRetry(fn, retries - 1, currentDelay * 2);
    }
    
    // For other retryable server errors (5xx)
    const isRetryableServer = errorStr.includes('503') || errorStr.includes('504') || errorStr.includes('overloaded');
    if (retries > 0 && isRetryableServer) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return withRetry(fn, retries - 1, currentDelay);
    }
    
    throw error;
  }
}

/**
 * Manual polling via direct fetch to avoid "t._fromAPIResponse is not a function" SDK stability issues.
 */
const manualPollOperation = async (operationName: string) => {
  const apiKey = process.env.API_KEY;
  // operationName typically includes the prefix 'operations/'
  const url = `${API_BASE_URL}/${operationName}?key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 429) throw new Error("RESOURCE_EXHAUSTED");
    throw new Error(`Polling failed with status ${response.status}`);
  }
  return await response.json();
};

/**
 * STAGE 1 – TEXT GENERATION
 * Generates script, scene plan, and captions.
 * Uses gemini-3-flash-preview for speed and efficiency.
 */
export const generateCreativeConcept = async (
  name: string, 
  url: string, 
  description: string,
  targetAudience: string,
  slogan: string
): Promise<CreativeConcept> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = `Task: Professional Marketing Strategist.
    Product: "${name}". Slogan: "${slogan}". Target Audience: "${targetAudience}".
    Features: ${description}.
    
    Stage 1 Goal: Create a detailed high-information documentary ad structure.
    
    Output JSON Requirements:
    - visualPrompt: Detailed cinematic prompt for a video generator.
    - slogan: Final brand slogan.
    - voiceoverScript: A professional, informative narration script.
    - scenes: 4-6 scene segments including visual descriptions, timings, and technical text overlays.
    
    Return ONLY JSON.`;

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
          voiceoverScript: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                duration: { type: Type.STRING },
                textOverlay: { type: Type.STRING }
              },
              required: ["description", "duration", "textOverlay"]
            }
          }
        },
        required: ["visualPrompt", "slogan", "voiceoverScript", "scenes"]
      }
    }
  })) as GenerateContentResponse;
  
  const text = response.text || "{}";
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
};

/**
 * STAGE 2 – VOICEOVER (TTS)
 * Strictly requests AUDIO modality only to prevent 400 INVALID_ARGUMENT errors.
 */
export const generateVoiceover = async (script: string, voiceName: VoiceName): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        // MUST BE EXACTLY ONE MODALITY: AUDIO
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName } 
          } 
        },
      },
    })) as GenerateContentResponse;

    // TTS models return audio in the inlineData of the first candidate's first part
    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;
    
    return base64Audio ? createWavUrl(base64Audio) : null;
  } catch (e: any) {
    console.error("Stage 2 TTS Failed:", e);
    return null;
  }
};

const createWavUrl = (base64PCM: string): string => {
  try {
    const binaryString = atob(base64PCM);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const alignedLength = Math.floor(bytes.byteLength / 2) * 2;
    const int16Data = new Int16Array(bytes.buffer, 0, alignedLength / 2);
    const sampleRate = 24000;
    const buffer = new ArrayBuffer(44 + int16Data.byteLength);
    const view = new DataView(buffer);
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.byteLength, true);
    new Uint8Array(buffer, 44).set(new Uint8Array(int16Data.buffer));
    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  } catch (e) { return ""; }
};

export const initiateVideoRender = async (
  concept: CreativeConcept,
  images: File[],
  aspectRatio: '16:9' | '9:16'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  let imagePart: { imageBytes: string, mimeType: string } | undefined;
  if (images.length > 0) {
    const base64 = await fileToBase64(images[0]);
    imagePart = { imageBytes: base64, mimeType: images[0].type };
  }

  const response = await withRetry(() => ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `${concept.visualPrompt}. Information-dense documentary style. Ultra-HQ cinematic marketing.`,
    image: imagePart,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
  })) as any;
  
  if (!response || !response.name) {
    throw new Error("Video service did not return an operation name.");
  }
  
  return response.name;
};

export const pollVideoAdStatus = async (operationName: string): Promise<{ done: boolean, result?: GeneratedResult, error?: string, isQuotaExhausted?: boolean }> => {
  try {
    const operation = await manualPollOperation(operationName);
    if (operation && operation.done) {
      if (operation.error) return { done: true, error: operation.error.message };
      
      const res = operation.response;
      const video = res?.generatedVideos?.[0]?.video;
      if (!video || !video.uri) return { done: true, error: "Render completed but no video was produced." };
      
      return {
        done: true,
        result: { 
          videoUrl: `${video.uri}&key=${process.env.API_KEY}`, 
          audioUrl: null, 
          videoOperation: video 
        }
      };
    }
    return { done: false };
  } catch (error: any) {
    if (error.message === 'RESOURCE_EXHAUSTED') return { done: false, isQuotaExhausted: true };
    return { done: false };
  }
};

export const generatePlaceholderImage = async (
  name: string,
  description: string,
  targetAudience: string,
  aspectRatio: '16:9' | '9:16'
): Promise<{ imageBytes: string; mimeType: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{
      parts: [
        {
          text: `A professional commercial studio photograph of the product "${name}". Description: ${description}. Targeting: ${targetAudience}. Cinematic lighting, 8k resolution, minimalist aesthetic.`,
        },
      ],
    }],
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    },
  })) as GenerateContentResponse;

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return {
        imageBytes: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      };
    }
  }
  throw new Error("Placeholder image generation failed.");
};

export const extendVideo = async (
  previousVideo: any,
  prompt: string,
  aspectRatio: '16:9' | '9:16'
): Promise<GeneratedResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  let operation = await withRetry(() => ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: prompt || 'The scene continues with a slow, cinematic zoom.',
    video: previousVideo,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    }
  })) as any;

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 15000));
    operation = await manualPollOperation(operation.name);
  }

  if (operation.error) throw new Error(operation.error.message);
  const video = operation.response?.generatedVideos?.[0]?.video;
  
  return {
    videoUrl: `${video.uri}&key=${process.env.API_KEY}`,
    audioUrl: null,
    videoOperation: video
  };
};

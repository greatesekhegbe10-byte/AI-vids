
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { AdPlan, VoiceName, GeneratedResult } from "../types";

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

async function withRetry<T>(fn: () => Promise<T>, retries = 2, currentDelay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    const isQuotaError = errorStr.includes('429') || errorStr.includes('resource_exhausted');
    if (retries > 0 && isQuotaError) {
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      return withRetry(fn, retries - 1, currentDelay * 2);
    }
    throw error;
  }
}

export const generateAdPlan = async (
  name: string, 
  url: string, 
  description: string,
  targetAudience: string,
  slogan: string,
  goal: string,
  tone: string,
  platform: string,
  maxDuration: number,
  images: File[]
): Promise<AdPlan> => {
  const promptText = `AI VIDEO AD ENGINE: Generate a high-converting, modular ad plan based on the product description and attached images.
    Product: "${name}". Slogan: "${slogan}". Goal: ${goal}. Tone: ${tone}. Platform: ${platform}. Duration: ${maxDuration}min.
    Details: ${description}. Website: ${url}. Audience: ${targetAudience}.

    STRUCTURE RULES:
    - 10-15 independent scenes (30-60s each).
    - Modular rendering.
    - Scenes: Hook, Problem, Product Intro, Features, Social Proof, CTA.
    
    Return VALID JSON ONLY:
    {
      "scene_map": [
        {
          "scene_id": "string",
          "scene_goal": "hook | educate | persuade | convert",
          "duration_seconds": number,
          "scene_title": "string",
          "voiceover_text": "string (natural, persuasive)",
          "on_screen_text": "string (bold, mobile-readable)",
          "visual_instruction": "string (HIGH-LEVEL ONLY: e.g., 'Product close-up + floating icons')"
        }
      ],
      "audio_strategy": {
        "voice_style": "string",
        "music_suggestion": "string"
      },
      "cta_block": {
        "primary": "string",
        "urgency": "string",
        "variants": ["string"]
      },
      "derivatives": {
        "teaser_15s": ["scene_id"],
        "ad_30s": ["scene_id"],
        "ad_60s": ["scene_id"]
      }
    }`;

  const imageParts = await Promise.all(
    images.map(async (file) => ({
      inlineData: {
        data: await fileToBase64(file),
        mimeType: file.type
      }
    }))
  );

  const response = await withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    return await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: promptText },
          ...imageParts
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });
  }) as GenerateContentResponse;
  
  const text = response.text || "{}";
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
};

export const initiateVideoRender = async (
  prompt: string,
  images: File[],
  aspectRatio: '16:9' | '9:16'
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Missing API Key");

  // Veo 3.1 Fast usually takes one primary reference image
  let imagePart = undefined;
  if (images.length > 0) {
    const base64 = await fileToBase64(images[0]);
    imagePart = { imageBytes: base64, mimeType: images[0].type };
  }

  const model = 'veo-3.1-fast-generate-preview';
  const url = `${API_BASE_URL}/models/${model}:generateVideos?key=${apiKey}`;

  const payload = {
    prompt: `${prompt}, high-quality advertising style.`,
    image: imagePart,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Render failed to start");
  return data.name;
};

export const pollVideoAdStatus = async (operationName: string): Promise<{ done: boolean, result?: GeneratedResult, error?: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { done: true, error: "API Key missing" };

  const url = `${API_BASE_URL}/${operationName}?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) throw new Error(data.error?.message || "Polling error");

  if (data.done) {
    if (data.error) return { done: true, error: data.error.message };
    const video = data.response?.generatedVideos?.[0]?.video;
    if (!video?.uri) return { done: true, error: "Video URI missing" };
    return {
      done: true,
      result: { videoUrl: `${video.uri}${video.uri.includes('?') ? '&' : '?'}key=${apiKey}`, audioUrl: null, videoOperation: video }
    };
  }
  return { done: false };
};

export const generateVoiceover = async (script: string, voiceName: VoiceName): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart?.inlineData?.data) return null;
    return createWavUrl(audioPart.inlineData.data);
  } catch (e) { return null; }
};

const createWavUrl = (base64PCM: string): string => {
  const binaryString = atob(base64PCM);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const int16Data = new Int16Array(bytes.buffer);
  const buffer = new ArrayBuffer(44 + int16Data.byteLength);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF'); view.setUint32(4, 36 + int16Data.byteLength, true); writeString(8, 'WAVE');
  writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeString(36, 'data');
  view.setUint32(40, int16Data.byteLength, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(int16Data.buffer));
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

export const generatePlaceholderImage = async (name: string, description: string, aspectRatio: '16:9' | '9:16'): Promise<{ imageBytes: string; mimeType: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts: [{ text: `Professional commercial photography for ${name}. ${description}. Studio lighting.` }] }],
    config: { imageConfig: { aspectRatio } },
  });
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (part?.inlineData) return { imageBytes: part.inlineData.data, mimeType: part.inlineData.mimeType };
  throw new Error("Image generation failed");
};

export const extendVideo = async (
  previousVideo: any,
  prompt: string,
  aspectRatio: '16:9' | '9:16'
): Promise<GeneratedResult> => {
  return await withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
      video: previousVideo,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video?.uri) throw new Error("Video extension failed");

    return {
      videoUrl: `${video.uri}&key=${process.env.API_KEY}`,
      audioUrl: null,
      videoOperation: video
    };
  });
};

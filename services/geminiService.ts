
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { AdPlan, VoiceName, GeneratedResult, AdScene } from "../types";

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

export const base64ToFile = (base64Data: string, mimeType: string, filename: string): File => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
};

// Helper to strictly get the key or throw, ensuring we don't pass undefined to SDK
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key not found in environment.");
  return key;
};

// Trigger the AI Studio key selection dialog if available
const triggerKeySelection = () => {
  if ((window as any).aistudio?.openSelectKey) {
    (window as any).aistudio.openSelectKey();
  }
};

async function withRetry<T>(fn: () => Promise<T>, retries = 2, currentDelay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    
    // CRITICAL: Handle "Requested entity was not found" which usually means the project/key 
    // is not valid for Veo or the user hasn't selected a paid project key yet.
    if (errorStr.includes('requested entity was not found') || errorStr.includes('404')) {
      triggerKeySelection();
      // We throw here to stop the current execution. The user must select a key and retry.
      throw new Error("Project or API Key not found. Please select a valid key from a paid GCP project.");
    }

    const isQuotaError = errorStr.includes('429') || errorStr.includes('resource_exhausted');
    if (retries > 0 && isQuotaError) {
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      return withRetry(fn, retries - 1, currentDelay * 2);
    }
    throw error;
  }
}

// Generate Ad Plan strategy using Gemini 3 Flash
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
  
  const promptText = `AI CREATIVE ENGINE: Generate a robust, error-proof video ad strategy.
    Product: "${name}". Slogan: "${slogan}". Goal: ${goal}. Tone: ${tone}. Platform: ${platform}. 
    Target Duration: ${maxDuration} seconds.
    Details: ${description}. Website: ${url}. Audience: ${targetAudience}.

    CRITICAL RULES (MULTI-USER SAAS MODE):
    1. Modular Scenes: Break video into independent 30-60s scenes. If duration > 60s, ensure modularity for parallel rendering.
    2. Missing Assets: If product images are missing/poor, 'visual_guidance' must describe a generated product shot clearly.
    3. Payload Optimization: Output strict JSON. No markdown.
    4. Monetization: High retention hooks, clear CTA.

    OUTPUT FORMAT (JSON ONLY):
    {
      "job_id": "UUID_v4",
      "scene_map": [
        {
          "scene_id": "s1", 
          "title": "string", 
          "goal": "hook|educate|persuade|convert", 
          "duration_seconds": number
        }
      ],
      "voiceover_text": [ {"scene_id": "s1", "text": "Script..."} ],
      "onscreen_text": [ {"scene_id": "s1", "text": "Overlay..."} ],
      "visual_guidance": [ {"scene_id": "s1", "description": "Detailed prompt...", "image_url_if_generated": "null"} ],
      "subtitles": [ {"scene_id": "s1", "srt_text": "Subtitle text..."} ],
      "hooks": ["hook1", "hook2", "hook3"],
      "cta_variants": ["primary", "urgency"],
      "short_ad_cuts": [ {"duration": 15, "scene_ids": ["s1"]} ],
      "audio_strategy": { "voice_style": "string", "music_suggestion": "string" }
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
    // Always instantiate new client to get latest env key
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
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
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const rawData = JSON.parse(cleanText);

  // Map the raw backend-ready JSON to the frontend AdPlan interface
  const sceneMap = rawData.scene_map.map((scene: any) => {
    const vo = rawData.voiceover_text?.find((v: any) => v.scene_id === scene.scene_id)?.text || "";
    const os = rawData.onscreen_text?.find((o: any) => o.scene_id === scene.scene_id)?.text || "";
    const vis = rawData.visual_guidance?.find((v: any) => v.scene_id === scene.scene_id)?.description || "";
    const sub = rawData.subtitles?.find((s: any) => s.scene_id === scene.scene_id)?.srt_text || "";

    return {
      scene_id: scene.scene_id,
      scene_title: scene.title,
      scene_goal: scene.goal,
      duration_seconds: scene.duration_seconds,
      voiceover_text: vo,
      on_screen_text: os,
      visual_instruction: vis,
      subtitle_text: sub
    };
  });

  return {
    job_id: rawData.job_id || crypto.randomUUID(),
    scene_map: sceneMap,
    audio_strategy: rawData.audio_strategy || { voice_style: "Professional", music_suggestion: "Upbeat" },
    cta_block: {
      primary: rawData.cta_variants?.[0] || "Buy Now",
      urgency: rawData.cta_variants?.[1] || "Limited Time",
      variants: rawData.cta_variants || []
    },
    derivatives: {
      teaser_15s: rawData.short_ad_cuts?.find((c: any) => c.duration === 15)?.scene_ids || [],
      ad_30s: rawData.short_ad_cuts?.find((c: any) => c.duration === 30)?.scene_ids || [],
      ad_60s: rawData.short_ad_cuts?.find((c: any) => c.duration === 60)?.scene_ids || []
    },
    hooks: rawData.hooks || [],
    short_ad_cuts: rawData.short_ad_cuts || []
  };
};

// Generate high quality thumbnails using Gemini 2.5 Flash Image
export const generateSceneThumbnails = async (scenes: AdScene[], aspectRatio: '16:9' | '9:16'): Promise<Record<string, string>> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const thumbnails: Record<string, string> = {};

  const batchSize = 3;
  for (let i = 0; i < scenes.length; i += batchSize) {
    const batch = scenes.slice(i, i + batchSize);
    await Promise.all(batch.map(async (scene) => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ parts: [{ text: `Professional commercial ad shot, ultra-HD: ${scene.visual_instruction}. Cinematic lighting.` }] }],
          config: { imageConfig: { aspectRatio } },
        });
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) {
          thumbnails[scene.scene_id] = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      } catch (e) {
        console.warn(`Thumbnail failed for ${scene.scene_id}`);
      }
    }));
  }
  return thumbnails;
};

// Initiate video generation using the Google GenAI SDK
export const initiateVideoRender = async (
  prompt: string,
  images: File[],
  aspectRatio: '16:9' | '9:16'
): Promise<any> => {
  return withRetry(async () => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    let imagePart = undefined;
    if (images.length > 0) {
      const base64 = await fileToBase64(images[0]);
      imagePart = { imageBytes: base64, mimeType: images[0].type };
    }

    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `A high-end professional commercial video: ${prompt}. Cinematic lighting, 8k resolution, smooth motion.`,
      image: imagePart,
      config: { 
        numberOfVideos: 1, 
        resolution: '720p', 
        aspectRatio 
      }
    });

    return operation;
  });
};

// Poll for video generation progress using the Google GenAI SDK
export const pollVideoAdStatus = async (operation: any): Promise<{ done: boolean, videoUrl?: string, error?: string, operation?: any }> => {
  return withRetry(async () => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const updatedOperation = await ai.operations.getVideosOperation({ operation });

    if (updatedOperation.done) {
      if (updatedOperation.error) return { done: true, error: updatedOperation.error.message };
      const video = updatedOperation.response?.generatedVideos?.[0]?.video;
      if (!video?.uri) return { done: true, error: "Video URI missing" };
      
      // Append the API key to the URI to fetch the MP4 bytes as per instructions
      return {
        done: true,
        videoUrl: `${video.uri}${video.uri.includes('?') ? '&' : '?'}key=${apiKey}`,
        operation: updatedOperation
      };
    }
    return { done: false, operation: updatedOperation };
  });
};

// Robust helper to download video from the signed URL using fetch to avoid cross-origin API errors
export const fetchVideoBlob = async (videoUrl: string): Promise<string> => {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Check for 404 or specific error messages to trigger key selection
      if (response.status === 404 || (errorData.error?.message || '').toLowerCase().includes('requested entity was not found')) {
         triggerKeySelection();
         throw new Error("Project or API Key invalid. Please re-select key.");
      }
      throw new Error(errorData.error?.message || `Download failed with status ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    if (error.message.includes('Requested entity was not found')) {
       triggerKeySelection();
    }
    throw error;
  }
};

// Extend an existing video by adding 5 seconds of footage
export const extendVideo = async (previousOperation: any, prompt: string, aspectRatio: '16:9' | '9:16'): Promise<GeneratedResult> => {
  return withRetry(async () => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt || 'Continue the video naturally',
      video: previousOperation.response?.generatedVideos?.[0]?.video,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const videoUrl = `${downloadLink}&key=${apiKey}`;

    return {
      videoUrl,
      audioUrl: null,
      videoOperation: operation
    };
  });
};

// Generate high fidelity voiceover using Gemini 2.5 Flash TTS
export const generateVoiceover = async (script: string, voiceName: VoiceName): Promise<string | null> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
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

// Implementation of raw PCM to WAV conversion for browser playback
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

export const generatePlaceholderImage = async (
  name: string, 
  description: string, 
  websiteUrl: string,
  aspectRatio: '16:9' | '9:16'
): Promise<{ imageBytes: string; mimeType: string }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  // Use gemini-3-pro-image-preview for high quality product shots
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [{ 
      parts: [{ 
        text: `Create a high-end professional product photograph for: ${name}. 
               Description: ${description}. 
               Context/Website Reference: ${websiteUrl}.
               Style: Cinematic, commercial advertising standard, studio lighting, 8k resolution.
               Ensure the product is the central focus against a clean, premium background.` 
      }] 
    }],
    config: { 
      imageConfig: { 
        aspectRatio: aspectRatio,
        imageSize: '1K' 
      } 
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (part?.inlineData) {
    return { 
      imageBytes: part.inlineData.data, 
      mimeType: part.inlineData.mimeType 
    };
  }
  throw new Error("Image generation failed");
};

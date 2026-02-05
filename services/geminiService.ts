import { GoogleGenAI } from "@google/genai";

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateVideoAd = async (
  name: string, 
  description: string, 
  images: File[], 
  aspectRatio: '16:9' | '9:16'
): Promise<string> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select a key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Prepare Image (Fast model uses a single starting image)
  if (images.length === 0) {
    throw new Error("No image provided");
  }

  const primaryImage = images[0];
  const base64Data = await fileToBase64(primaryImage);
  
  const imagePart = {
    imageBytes: base64Data,
    mimeType: primaryImage.type,
  };

  // 2. Construct Prompt
  const prompt = `A professional, cinematic video advertisement for a product named "${name}". 
  Product Description: ${description}. 
  The video should start with the provided image and evolve into a dynamic commercial shot with elegant camera movements, commercial lighting, and a modern aesthetic. 
  Showcase the product clearly. Photorealistic, 4k look.`;

  // 3. Call API with Fast Model
  let operation;
  
  try {
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: imagePart,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });
  } catch (e: any) {
    console.error("Initial request failed", e);
    throw new Error(`Failed to start video generation: ${e.message}`);
  }

  // 4. Poll for completion (Reduced interval for fast model)
  const POLLING_INTERVAL = 5000; // 5 seconds
  
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    try {
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log("Polling Veo operation status...", operation);
    } catch (e) {
      console.error("Polling failed", e);
      throw new Error("Lost connection to video generation service.");
    }
  }

  // 5. Extract Result
  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  
  if (!videoUri) {
    throw new Error("Video generation completed but no video URI was returned.");
  }

  // 6. Append Key for Download
  return `${videoUri}&key=${apiKey}`;
};
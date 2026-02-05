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
  aspectRatio: '16:9' | '9:16',
  websiteUrl: string
): Promise<string> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select a key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Prepare Image (if provided)
  let imagePart = undefined;
  if (images.length > 0) {
    const primaryImage = images[0];
    const base64Data = await fileToBase64(primaryImage);
    
    imagePart = {
      imageBytes: base64Data,
      mimeType: primaryImage.type,
    };
  }

  // 2. Construct Prompt
  // Ensure we emphasize the website URL in the overlay
  const urlInstruction = `Include a clear text overlay showing: "${websiteUrl}".`;
  
  // Refine prompt based on presence of image
  let prompt = "";
  if (imagePart) {
     prompt = `Commercial for "${name}". ${description}. ${urlInstruction} Cinematic lighting, 4k. Start with the product image and transform it dynamically.`;
  } else {
     prompt = `Commercial for "${name}". ${description}. ${urlInstruction} High quality photorealistic product visualization. Cinematic lighting, 4k.`;
  }

  // 3. Call API with Fast Model
  let operation;
  
  try {
    const requestOptions: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p', // API only supports 720p or 1080p. 720p is the fastest/lowest.
        aspectRatio: aspectRatio
      }
    };

    // Only add image property if it exists
    if (imagePart) {
      requestOptions.image = imagePart;
    }

    operation = await ai.models.generateVideos(requestOptions);
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

  // 5. Check for errors in the operation result
  if (operation.error) {
    console.error("Video generation failed:", operation.error);
    throw new Error(`Generation failed: ${operation.error.message || "Unknown error"}`);
  }

  // 6. Extract Result
  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  
  if (!videoUri) {
    // This happens if done=true but no video and no error message. 
    // Usually implies content safety filtering if no specific error was returned.
    throw new Error("Video generation completed but no video was returned. The content may have been filtered for safety.");
  }

  // 7. Append Key for Download
  return `${videoUri}&key=${apiKey}`;
};
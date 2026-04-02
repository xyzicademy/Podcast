import { GoogleGenAI } from "@google/genai";
import fs from "fs";

async function generate() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          text: 'A sleek, modern podcast studio setup with a professional microphone, glowing orange and dark grey neon lights, high quality, 8k resolution, cinematic lighting, dark mode aesthetic.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "2K"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64Data = part.inlineData.data;
      fs.writeFileSync('public/splash.jpg', Buffer.from(base64Data, 'base64'));
      console.log('Image saved to public/splash.jpg');
      break;
    }
  }
}

generate().catch(console.error);

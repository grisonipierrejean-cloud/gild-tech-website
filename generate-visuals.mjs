import { GoogleGenAI } from '/Users/pierrejeqn/.gemini/extensions/nanobanana/mcp-server/node_modules/@google/genai/dist/index.mjs';
import { writeFileSync } from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.NANOBANANA_API_KEY });

async function generateImage(prompt, filename) {
  console.log(`Generating: ${filename}...`);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        writeFileSync(`assets/${filename}`, buffer);
        console.log(`Saved: assets/${filename} (${Math.round(buffer.length/1024)}KB)`);
        return true;
      }
    }
    console.log(`No image data in response for ${filename}`);
    return false;
  } catch (err) {
    console.error(`Error generating ${filename}:`, err.message);
    return false;
  }
}

// Generate visuals for the site
const visuals = [
  {
    prompt: "Abstract dark futuristic technology background, deep navy blue #0b0b14 base color with vibrant hot pink #E91E8C energy streams and glowing neural network connections, flowing data particles, cinematic lighting, ultra wide 21:9 aspect ratio, 4K quality, no text, no people, ethereal and premium feel, subtle grid pattern fading into darkness",
    file: "hero-bg.png"
  },
  {
    prompt: "Abstract geometric 3D shapes floating in dark space, deep navy #0b0b14 background, hot pink #E91E8C and magenta glowing edges on translucent glass-like polyhedra, light refractions, bokeh particles, premium tech aesthetic, no text, minimalist and elegant, cinematic depth of field",
    file: "abstract-shapes.png"
  },
  {
    prompt: "Futuristic holographic dashboard interface floating in dark void, deep navy blue #0b0b14 background, hot pink #E91E8C accent highlights on graphs and data visualizations, AI automation concept, glowing connection lines between nodes, premium and clean, no text readable, blurred slightly for background use, cinematic",
    file: "dashboard-hologram.png"
  }
];

console.log("Starting image generation...\n");

for (const v of visuals) {
  await generateImage(v.prompt, v.file);
  console.log("");
}

console.log("Done!");

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type { SVGStyle, SVGSize, GeminiConfig } from "./types";

/**
 * Extracts and cleans the SVG code from LLM response text.
 */
export function extractSVG(text: string): string {
  const cleaned = text.trim();
  
  // Try to find code block formatting like ```xml or ```svg
  const markdownRegex = /```(?:xml|svg|html)?\s*(<svg[\s\S]*?<\/svg>)\s*```/i;
  const match = cleaned.match(markdownRegex);
  if (match) {
    return match[1].trim();
  }

  // Fallback: find the first <svg and last </svg> tag
  const firstIndex = cleaned.indexOf("<svg");
  const lastIndex = cleaned.lastIndexOf("</svg>");
  if (firstIndex !== -1 && lastIndex !== -1 && lastIndex > firstIndex) {
    return cleaned.substring(firstIndex, lastIndex + 6).trim();
  }

  return cleaned;
}

/**
 * Generates an SVG logo using Gemini API and Vercel AI SDK.
 */
export async function generateSVG(
  prompt: string,
  style: SVGStyle,
  size: SVGSize,
  config: GeminiConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new Error("Gemini API key is required. Please set it in the configuration settings.");
  }

  const google = createGoogleGenerativeAI({
    apiKey: config.apiKey,
  });

  const modelName = config.model || "gemini-2.5-flash";
  const modelInstance = google(modelName);

  // Tailor style prompts
  let styleInstruction = "";
  switch (style) {
    case "outline":
      styleInstruction = 
        "Style: Minimalist outline / line-art vector logo. Use thin-to-medium strokes, clear lines, and transparent/empty fills. The design should be clean, modern, and easily adaptable to dark or light backgrounds. Avoid complex color fields, solid blocks of color, or fine 3D gradients.";
      break;
    case "color":
      styleInstruction = 
        "Style: Vibrant vector art logo with rich colors and gradients. Use bold solid colors, harmonic palettes, clean shapes, and professional fills. It should have a clean, modern aesthetic with bright visual presence.";
      break;
    case "real":
      styleInstruction = 
        "Style: Detailed vector logo. Include subtle shading, lighting effects, gradients, and layered shapes for visual depth and premium corporate look. Ensure it remains a clean, high-quality scalable vector illustration.";
      break;
    case "cartoon":
      styleInstruction = 
        "Style: Playful, cartoon-style logo. Use thick, bold dark borders/outlines, cheerful and exaggerated shapes, high-contrast flat colors, and a clean mascot, emblem, or character feel.";
      break;
  }

  const systemPrompt = `You are an expert SVG designer and developer. Your task is to generate valid, clean, and highly professional SVG logo code.
Guidelines:
- Return ONLY valid SVG code. Do NOT wrap it in markdown code blocks like \`\`\`xml or \`\`\`svg. Start directly with "<svg" and end with "</svg>". Do NOT include explanations, markdown, or chat text outside the SVG.
- Ensure the SVG has viewBox="0 0 ${size.width} ${size.height}", width="${size.width}", and height="${size.height}".
- Use clean semantic SVG elements: <path>, <rect>, <circle>, <ellipse>, <g>, etc. Avoid using base64 embedded raster images (<image>).
- Ensure it is responsive, scalable, and looks professional.
- Color palettes should be curated and modern. For logos that might be used on dark backgrounds, use colors that stand out.
- Ensure all tags are correctly closed, paths have valid syntax, and the SVG is well-formed.

${styleInstruction}`;

  const userPrompt = `Create an SVG logo representing the following prompt: "${prompt}".
Dimension: Width = ${size.width}px, Height = ${size.height}px.
Ensure the design matches the requested style instructions. Generate only the SVG code, nothing else.`;

  const response = await generateText({
    model: modelInstance,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.2, // low temperature for structured SVG generation
  });

  const rawText = response.text;
  const svgOutput = extractSVG(rawText);

  if (!svgOutput.startsWith("<svg") || !svgOutput.endsWith("</svg>")) {
    throw new Error("Failed to generate a valid SVG. The model response was not recognized as SVG code.");
  }

  return svgOutput;
}

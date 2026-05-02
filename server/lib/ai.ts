import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const geminiKey = process.env.MY_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!geminiKey) {
  console.warn('[AI] GEMINI_API_KEY not found in environment variables');
}

export const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
export const aiBeta = geminiKey ? new GoogleGenerativeAI(geminiKey) : null; // Beta might need different config but for now we use standard

/**
 * Resolves the AI client instance, handling potential module wrapping issues at runtime.
 */
export function getAIClient(client: any) {
  if (!client) return null;
  // If the client is wrapped in a module object, unwrap it
  return client.genAI || client.aiBeta || client;
}

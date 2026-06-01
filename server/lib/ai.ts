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
 * Model names — read from .env, fall back to sensible defaults.
 *
 * GEMINI_MODEL        — model dùng cho summarize & generate template settings (default: gemini-2.0-flash)
 * GEMINI_HTML_MODEL   — model dùng cho generate AI dynamic HTML (default: same as GEMINI_MODEL)
 * GEMINI_TTS_MODEL    — model dùng cho Gemini TTS (default: gemini-2.5-flash-preview-tts)
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const GEMINI_HTML_MODEL = process.env.GEMINI_HTML_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';

/**
 * Resolves the AI client instance, handling potential module wrapping issues at runtime.
 */
export function getAIClient(client: any) {
  if (!client) return null;
  // If the client is wrapped in a module object, unwrap it
  return client.genAI || client.aiBeta || client;
}

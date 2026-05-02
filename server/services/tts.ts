import fetch from 'node-fetch';
import { aiBeta, getAIClient } from '../lib/ai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import prisma from '../lib/prisma';

export interface AudioResult {
  buffer: Buffer;
  ext: 'mp3' | 'wav';
  mimeType: 'audio/mpeg' | 'audio/wav';
  durationSeconds: number;
  provider: 'elevenlabs' | 'edge' | 'gemini';
}

function createWavHeader(dataLength: number, sampleRate: number): Buffer {
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  return buffer;
}

export async function generateAudio(text: string): Promise<AudioResult> {
  // 1. Get TTS Priority from Settings
  let priority = ['elevenlabs', 'edge', 'gemini'];
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'tts_priority' } });
    if (setting && setting.value) {
      priority = setting.value.split(',').map(p => p.trim());
      console.log(`[TTS] Loaded priority from DB: ${priority.join(' -> ')}`);
    } else {
      console.log(`[TTS] Using default priority: ${priority.join(' -> ')}`);
    }
  } catch (e: any) {
    console.warn(`[TTS] Could not load settings: ${e.message}`);
  }

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

  for (const provider of priority) {
    if (provider === 'elevenlabs') {
      if (elevenLabsKey && elevenLabsKey.trim() !== '') {
        try {
          console.log(`[TTS] Trying ElevenLabs | voice: ${voiceId}`);
          const elevenRes = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': elevenLabsKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
              },
              body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
              }),
            }
          );
          if (elevenRes.ok) {
            const mp3Buffer = Buffer.from(await elevenRes.arrayBuffer());
            const estimatedDuration = Math.max(mp3Buffer.length / 16000, 3.1);
            console.log(`[TTS] ElevenLabs OK — ${mp3Buffer.length}b`);
            return { buffer: mp3Buffer, ext: 'mp3', mimeType: 'audio/mpeg', durationSeconds: estimatedDuration, provider: 'elevenlabs' };
          }
          const errBody = await elevenRes.text();
          console.warn(`[TTS] ElevenLabs status ${elevenRes.status}: ${errBody}`);
        } catch (err: any) {
          console.warn(`[TTS] ElevenLabs error: ${err.message}`);
        }
      }
    } else if (provider === 'edge') {
      try {
        const edgeVoice = process.env.EDGE_TTS_VOICE || 'vi-VN-HoaiMyNeural';
        console.log(`[TTS] Trying Edge TTS | voice: ${edgeVoice}`);
        const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
        const tts = new MsEdgeTTS();
        await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        
        const tempDir = path.join(os.tmpdir(), `tts_dir_${Date.now()}`);
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        await tts.toFile(tempDir, text);
        const filePath = path.join(tempDir, 'audio.mp3');
        if (!fs.existsSync(filePath)) throw new Error('Edge TTS did not create audio.mp3');
        const buffer = fs.readFileSync(filePath);
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        
        const estimatedDuration = Math.max(buffer.length / 6000, 2.5); 
        console.log(`[TTS] Edge TTS OK — ${buffer.length}b`);
        return { buffer, ext: 'mp3', mimeType: 'audio/mpeg', durationSeconds: estimatedDuration, provider: 'edge' };
      } catch (err: any) {
        console.warn(`[TTS] Edge TTS failed: ${err.message}`);
      }
    } else if (provider === 'gemini') {
      const ai = getAIClient(aiBeta);
      if (ai) {
        try {
          console.log('[TTS] Trying Gemini TTS (2.5 Flash)');
          const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });
          const prompt = `Convert this exact text to audio and do not generate any other text or response:\n\n${text}`;
          const response = await model.generateContent({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
          });

          const base64Audio = (response.response as any).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const pcmBuffer = Buffer.from(base64Audio, 'base64');
            const wavHeader = createWavHeader(pcmBuffer.length, 24000);
            const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
            const durationSeconds = Math.max(pcmBuffer.length / (24000 * 2), 3.1);
            console.log(`[TTS] Gemini TTS OK — ${wavBuffer.length}b`);
            return { buffer: wavBuffer, ext: 'wav', mimeType: 'audio/wav', durationSeconds, provider: 'gemini' };
          }
        } catch (err: any) {
          console.warn(`[TTS] Gemini TTS error: ${err.message}`);
        }
      }
    }
  }

  throw new Error('All TTS providers failed or were not configured.');
}

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
  provider: 'elevenlabs' | 'edge' | 'gemini' | 'lucylab' | 'ohfree';
}

type TTSHandler = (text: string, voiceId?: string) => Promise<AudioResult>;

/**
 * Utility to create WAV header for PCM data from Gemini
 */
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

/**
 * TTS Handlers Implementation
 */
const handlers: Record<string, TTSHandler> = {
  elevenlabs: async (text, customVoiceId) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = customVoiceId || process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

    if (!apiKey) throw new Error('ElevenLabs API Key missing');

    console.log(`[TTS] Requesting ElevenLabs | voice: ${voiceId}`);
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      }),
    });

    if (!res.ok) throw new Error(`ElevenLabs failed: ${res.status} ${await res.text()}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, ext: 'mp3', mimeType: 'audio/mpeg', durationSeconds: Math.max(buffer.length / 16000, 3.1), provider: 'elevenlabs' };
  },

  edge: async (text, customVoiceId) => {
    const voice = customVoiceId || process.env.EDGE_TTS_VOICE || 'vi-VN-HoaiMyNeural';
    console.log(`[TTS] Requesting Edge TTS | voice: ${voice}`);

    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(text);
    const audioChunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => {
        audioChunks.push(chunk);
      });

      audioStream.on('end', () => {
        const buffer = Buffer.concat(audioChunks);
        if (buffer.length === 0) return reject(new Error('No audio data received from Edge TTS'));
        resolve({
          buffer,
          ext: 'mp3',
          mimeType: 'audio/mpeg',
          durationSeconds: Math.max(buffer.length / 16000, 3.1),
          provider: 'edge'
        });
      });

      audioStream.on('error', reject);
    });
  },

  gemini: async (text, customVoiceId) => {
    const ai = getAIClient(aiBeta);
    if (!ai) throw new Error('Gemini AI not configured');

    console.log('[TTS] Requesting Gemini TTS (2.5 Flash)');
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
    if (!base64Audio) throw new Error('Gemini returned no audio data');

    const pcmBuffer = Buffer.from(base64Audio, 'base64');
    const wavHeader = createWavHeader(pcmBuffer.length, 24000);
    const buffer = Buffer.concat([wavHeader, pcmBuffer]);

    return { buffer, ext: 'wav', mimeType: 'audio/wav', durationSeconds: Math.max(pcmBuffer.length / (24000 * 2), 3.1), provider: 'gemini' };
  },

  lucylab: async (text, customVoiceId) => {
    const apiKey = process.env.LUCYLAB_API_KEY;
    const voiceId = customVoiceId || process.env.LUCYLAB_VOICE_ID;

    if (!apiKey || !voiceId) throw new Error('LucyLab credentials missing');

    console.log(`[TTS] Requesting LucyLab | voice: ${voiceId}`);

    // Create Job
    const createRes = await fetch('https://api.lucylab.io/json-rpc', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'ttsLongText', input: { text, userVoiceId: voiceId, speed: 1.0 } })
    });

    const createData: any = await createRes.json();
    const exportId = createData.result?.projectExportId;
    if (!exportId) throw new Error(`LucyLab job creation failed: ${JSON.stringify(createData)}`);

    // Polling
    let audioUrl = null;
    for (let i = 0; i < 30; i++) {
      const statusRes = await fetch('https://api.lucylab.io/json-rpc', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getExportStatus', input: { projectExportId: exportId } })
      });

      const statusData: any = await statusRes.json();
      if (statusData.result?.state === 'completed') {
        audioUrl = statusData.result.url;
        break;
      }
      if (statusData.result?.state === 'failed') throw new Error('LucyLab job failed');
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!audioUrl) throw new Error('LucyLab polling timed out');

    const audioRes = await fetch(audioUrl);
    const buffer = Buffer.from(await audioRes.arrayBuffer());
    return { buffer, ext: 'mp3', mimeType: 'audio/mpeg', durationSeconds: Math.max(buffer.length / 16000, 3.1), provider: 'lucylab' };
  },

  ohfree: async (text, customVoiceId) => {
    const voiceId = customVoiceId || process.env.OHFREE_VOICE_ID || '1402';
    console.log(`[TTS] Requesting OhFree | voiceId: ${voiceId} | text length: ${text.length}`);

    // Tùy chỉnh HTTPS Agent để thay đổi TLS Fingerprint, cố gắng bypass Cloudflare
    const https = await import('https');
    const crypto = await import('crypto');
    const agent = new https.Agent({
      ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
      secureOptions: crypto.constants.SSL_OP_NO_TICKET | crypto.constants.SSL_OP_NO_RENEGOTIATION,
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3'
    });

    const res = await fetch('https://tts.ohfree.me/api/tts', {
      method: 'POST',
      agent,
      headers: {
        'authority': 'tts.ohfree.me',
        'accept': '*/*',
        'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://tts.ohfree.me',
        'referer': 'https://tts.ohfree.me/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        ...(process.env.OHFREE_COOKIE ? { 'Cookie': process.env.OHFREE_COOKIE } : {}),
      },
      body: JSON.stringify({
        text,
        id: parseInt(voiceId),
        rate: 1,
        pitch: 1
      }),
    });

    // Fetch one single segment from OhFree
    const fetchSegment = async (segmentText: string): Promise<Buffer> => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch('https://tts.ohfree.me/api/tts', {
          method: 'POST',
          agent,
          headers: {
            'authority': 'tts.ohfree.me',
            'accept': '*/*',
            'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'content-type': 'application/json',
            'origin': 'https://tts.ohfree.me',
            'referer': 'https://tts.ohfree.me/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            ...(process.env.OHFREE_COOKIE ? { 'Cookie': process.env.OHFREE_COOKIE } : {}),
          },
          body: JSON.stringify({ text: segmentText, id: parseInt(voiceId), rate: 1, pitch: 1 }),
        });

        if (!res.ok) throw new Error(`OhFree failed: ${res.status}`);
        if (!res.body) throw new Error('No response body');

        const reader = res.body;
        let audioChunks: Buffer[] = [];
        let bufferStr = '';
        const decoder = new TextDecoder();

        try {
          await new Promise<void>((resolve, reject) => {
            reader.on('data', (chunk: Buffer) => {
              bufferStr += decoder.decode(chunk, { stream: true });
              let startIdx;
              while ((startIdx = bufferStr.indexOf('{')) !== -1) {
                let endIdx = -1;
                let depth = 0;
                for (let i = startIdx; i < bufferStr.length; i++) {
                  if (bufferStr[i] === '{') depth++;
                  else if (bufferStr[i] === '}') {
                    depth--;
                    if (depth === 0) { endIdx = i; break; }
                  }
                }
                if (endIdx === -1) break;
                const jsonStr = bufferStr.substring(startIdx, endIdx + 1);
                bufferStr = bufferStr.substring(endIdx + 1);
                try {
                  const data = JSON.parse(jsonStr);
                  if (data.status === 'audio_chunk' && data.chunk) {
                    audioChunks.push(Buffer.from(data.chunk, 'base64'));
                  } else if (data.status === 'error') {
                    return reject(new Error(data.message || 'Unknown'));
                  }
                } catch (e: any) { }
              }
            });
            reader.on('end', () => resolve());
            reader.on('error', reject);
          });
          
          if (audioChunks.length === 0) throw new Error('No audio chunks returned');
          return Buffer.concat(audioChunks);
          
        } catch (err: any) {
          const msg = err.message || '';
          if (msg.includes('Too many requests') || msg.includes('10 seconds') || msg.includes('5 minutes')) {
            console.log(`[TTS] OhFree rate limit hit, waiting 11 seconds before retry (Attempt ${attempt}/3)...`);
            await new Promise(r => setTimeout(r, 11000));
            continue;
          }
          throw err;
        }
      }
      throw new Error('OhFree rate limit timeout after 3 retries');
    };

    // 1. Chunking text to bypass `req_login` (Guest limit is strictly ~200 chars)
    const MAX_CHUNK_LENGTH = 180;
    const segments: string[] = [];
    let remainingText = text;
    
    while (remainingText.length > MAX_CHUNK_LENGTH) {
      let splitIdx = remainingText.lastIndexOf('.', MAX_CHUNK_LENGTH);
      if (splitIdx === -1 || splitIdx < MAX_CHUNK_LENGTH * 0.5) {
        splitIdx = remainingText.lastIndexOf(' ', MAX_CHUNK_LENGTH);
        if (splitIdx === -1) splitIdx = MAX_CHUNK_LENGTH;
      } else {
        splitIdx += 1;
      }
      segments.push(remainingText.substring(0, splitIdx).trim());
      remainingText = remainingText.substring(splitIdx).trim();
    }
    if (remainingText) segments.push(remainingText);

    console.log(`[TTS] OhFree -> Split ${text.length} chars into ${segments.length} segments to bypass guest limits.`);

    // 2. Fetch sequentially to avoid rate limits
    const allBuffers: Buffer[] = [];
    for (let i = 0; i < segments.length; i++) {
      if (i > 0) {
        // Mandatory delay between segments to respect OhFree's 10s rate limit for guests
        console.log(`[TTS] OhFree -> Waiting 10s before segment ${i+1}/${segments.length}...`);
        await new Promise(r => setTimeout(r, 10500));
      }
      console.log(`[TTS] OhFree -> Fetching segment ${i+1}/${segments.length}...`);
      const segmentBuf = await fetchSegment(segments[i]);
      allBuffers.push(segmentBuf);
    }

    const finalBuffer = Buffer.concat(allBuffers);
    console.log(`[TTS] OhFree success: ${finalBuffer.length} bytes audio across ${segments.length} segments`);

    return {
      buffer: finalBuffer,
      ext: 'mp3',
      mimeType: 'audio/mpeg',
      durationSeconds: Math.max(finalBuffer.length / 16000, 3.1),
      provider: 'ohfree'
    };
  }
};

/**
 * Resolve the order of TTS providers based on settings
 */
async function resolvePriority(templateId?: string): Promise<{ priority: string[], voiceConfig: Record<string, string> }> {
  const defaultPriority = ['elevenlabs', 'lucylab', 'ohfree', 'edge', 'gemini'];
  let priority = defaultPriority;
  let voiceConfig: Record<string, string> = {};

  try {
    // 1. Check Template Settings
    if (templateId) {
      const templateSetting = await prisma.setting.findUnique({ where: { key: `video_template_${templateId}` } });
      if (templateSetting?.value) {
        const config = JSON.parse(templateSetting.value);
        if (config.ttsPriority?.length) priority = config.ttsPriority;
        if (config.ttsVoices) voiceConfig = config.ttsVoices;
      }
    }

    // 2. Check Global Settings (if priority not yet overridden by template)
    if (priority === defaultPriority) {
      const globalSetting = await prisma.setting.findUnique({ where: { key: 'tts_priority' } });
      if (globalSetting?.value) {
        try {
          const parsed = JSON.parse(globalSetting.value);
          if (Array.isArray(parsed)) {
            priority = parsed;
          } else {
            priority = String(globalSetting.value).split(',').map(p => p.trim());
          }
        } catch (e) {
          priority = String(globalSetting.value).split(',').map(p => p.trim());
        }
      }
    }
  } catch (e) {
    console.warn('[TTS] Failed to load custom settings, falling back to default.');
  }

  return { priority, voiceConfig };
}

/**
 * Main entry point for audio generation
 */
export async function generateAudio(
  text: string,
  templateId?: string,
  override?: { provider?: string, voiceId?: string, noFallback?: boolean }
): Promise<AudioResult> {
  const { priority, voiceConfig } = await resolvePriority(templateId);

  // If manual override is provided, prioritize that provider
  const effectivePriority = (override?.noFallback && override?.provider)
    ? [override.provider]
    : override?.provider
      ? [override.provider, ...priority.filter(p => p !== override.provider)]
      : priority;

  console.log(`[TTS] Mode: ${override?.provider ? 'Manual Override' : 'Auto'} | Priority: ${effectivePriority.join(' -> ')}`);

  for (const provider of effectivePriority) {
    const handler = handlers[provider];
    if (!handler) continue;

    try {
      // Use override voiceId ONLY if it's the provider we are currently trying
      // AND it was the one originally requested as override.
      // Otherwise, use the default config for this fallback provider.
      const voiceId = (provider === override?.provider && override?.voiceId)
        ? override.voiceId
        : voiceConfig[provider];

      return await handler(text, voiceId);
    } catch (err: any) {
      console.warn(`[TTS] Provider '${provider}' failed: ${err.message}. ${effectivePriority.indexOf(provider) < effectivePriority.length - 1 ? 'Trying next...' : ''}`);
    }
  }

  throw new Error('All configured TTS providers failed to generate audio.');
}

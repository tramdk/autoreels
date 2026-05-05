import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET || 'autoreels-super-secret-key',
  databaseUrl: process.env.DATABASE_URL,
  
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    redirectUri: process.env.TIKTOK_REDIRECT_URI,
  },
  
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  
  ai: {
    geminiKey: process.env.GEMINI_API_KEY,
  },
  
  tts: {
    elevenLabsKey: process.env.ELEVENLABS_API_KEY,
    elevenLabsVoice: process.env.ELEVENLABS_VOICE_ID,
    lucyLabKey: process.env.LUCYLAB_API_KEY,
    lucyLabVoice: process.env.LUCYLAB_VOICE_ID,
    ohFreeVoice: process.env.OHFREE_VOICE_ID,
  }
};

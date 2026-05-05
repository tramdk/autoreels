import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default voices...');

  const voices = [
    // OhFree Voices
    { voiceId: '1402', name: 'Thế Hào (Nam - OhFree)', provider: 'ohfree' },
    { voiceId: '510', name: 'Nguyễn Ngân (Nữ - OhFree)', provider: 'ohfree' },
    { voiceId: '1403', name: 'Lê Minh (Nam - OhFree)', provider: 'ohfree' },
    { voiceId: '511', name: 'Thanh Nhàn (Nữ - OhFree)', provider: 'ohfree' },
    { voiceId: '294', name: 'Tùng Duy (Nam - OhFree)', provider: 'ohfree' },

    // Edge TTS Voices
    { voiceId: 'vi-VN-HoaiMyNeural', name: 'Hoài My (Nữ - Edge)', provider: 'edge' },
    { voiceId: 'vi-VN-NamMinhNeural', name: 'Nam Minh (Nam - Edge)', provider: 'edge' },

    // LucyLab (ViVibe)
    { voiceId: 'vuthao', name: 'Vũ Thảo (LucyLab)', provider: 'lucylab' },
    { voiceId: 'thanhha', name: 'Thanh Hà (LucyLab)', provider: 'lucylab' },
    { voiceId: 'ngocha', name: 'Ngọc Hà (LucyLab)', provider: 'lucylab' },

    // ElevenLabs (Example)
    { voiceId: 'Th3H4oV1et', name: 'Thế Hào Pro (ElevenLabs)', provider: 'elevenlabs' }
  ];

  for (const voice of voices) {
    await prisma.voice.upsert({
      where: { id: voice.voiceId }, // This won't work as id is UUID, using findFirst instead
      update: {},
      create: voice,
    }).catch(async () => {
      // Fallback for simple unique check
      const exists = await prisma.voice.findFirst({
        where: { voiceId: voice.voiceId, provider: voice.provider }
      });
      if (!exists) {
        await prisma.voice.create({ data: voice });
      }
    });
  }

  // Default Settings
  const defaultSettings = [
    { key: 'tts_priority', value: JSON.stringify(['ohfree', 'edge', 'gemini']) },
    { key: 'ohfree_voice_id', value: '1402' },
    { key: 'edge_tts_voice', value: 'vi-VN-HoaiMyNeural' },
    {
      key: 'video_template', value: JSON.stringify({
        logoText: 'AUTOREELS',
        logoColor: '#ffffff',
        tagText: 'HOT NEWS',
        tagBg: '#ff0000',
        backgroundBrightness: 0.4,
        dividerColor: '#00f2ff'
      })
    }
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

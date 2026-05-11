import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Default Admin User
  const adminPassword = await bcrypt.hash('Admin!23', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      mustChangePassword: false
    }
  });
  console.log('✔ Admin user created (admin / Admin!23)');

  // 2. Default RSS Sources
  const sources = [
    { name: 'VNExpress - Tin mới nhất', url: 'https://vnexpress.net/rss/tin-moi-nhat.rss', type: 'rss' },
    { name: 'Tuổi Trẻ - Tin mới nhất', url: 'https://tuoitre.vn/rss/tin-moi-nhat.rss', type: 'rss' },
    { name: 'Thanh Niên - Tin mới nhất', url: 'https://thanhnien.vn/rss/home.rss', type: 'rss' },
    { name: 'Zing News - Tin mới', url: 'https://zingnews.vn/rss/index.rss', type: 'rss' }
  ];

  for (const s of sources) {
    await prisma.source.upsert({
      where: { url: s.url },
      update: { name: s.name },
      create: s
    });
  }
  console.log('✔ RSS Sources seeded');

  // 3. Voices
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
    { voiceId: 'mhsL3CPLxmLYdSTKp3GANj', name: 'Nam Đỹ (LucyLab)', provider: 'lucylab' },
    { voiceId: '7Tb4dvGZyJMPjnnfxVBgik', name: 'CD Team (LucyLab)', provider: 'lucylab' },
    { voiceId: '24oEtXGic7NhDjXzmDbDvt', name: 'Thời sự (LucyLab)', provider: 'lucylab' },


    // ElevenLabs
    { voiceId: 'f966mdF5njWREvreUG07', name: 'Thế Hào Pro (ElevenLabs)', provider: 'elevenlabs' }
  ];

  for (const v of voices) {
    await prisma.voice.upsert({
      where: { voiceId_provider: { voiceId: v.voiceId, provider: v.provider } },
      update: { name: v.name },
      create: v
    });
  }
  console.log('✔ TTS Voices seeded');

  // 4. BGM Assets (Metadata for public/bgm files)
  const bgmPresets = [
    { name: 'Nhe-nhang.mp3', url: '/bgm/nhe-nhang.mp3', type: 'audio', size: 0, hash: 'preset_1' },
    { name: 'Kich-tinh.mp3', url: '/bgm/kich-tinh.mp3', type: 'audio', size: 0, hash: 'preset_2' },
  ];

  for (const b of bgmPresets) {
    await prisma.asset.upsert({
      where: { hash: b.hash },
      update: { name: b.name, url: b.url },
      create: b
    });
  }
  console.log('✔ BGM Presets seeded');

  // 5. Default Settings
  const defaultSettings = [
    { key: 'tts_priority', value: JSON.stringify(['edge', 'ohfree', 'lucylab', 'elevenlabs', 'gemini']) },
    { key: 'ohfree_voice_id', value: '294' },
    { key: 'edge_tts_voice', value: 'vi-VN-NamMinhNeural' },
    {
      key: 'video_template', value: JSON.stringify({
        logoText: 'TDK',
        logoColor: '#ffffff',
        tagText: '',
        tagBg: '#ff0000',
        backgroundBrightness: 0.4,
        dividerColor: '#00f2ff'
      })
    },
    { key: 'video_template_cinematic', value: JSON.stringify({ logoText: 'CINEMATIC', logoColor: '#ffcc00', backgroundBrightness: 0.5, dividerColor: '#ffcc00' }) },
    { key: 'video_template_cyberpunk', value: JSON.stringify({ logoText: 'CYBER_REEL', logoColor: '#22d3ee', backgroundBrightness: 0.3, dividerColor: '#d946ef' }) },
    { key: 'video_template_glassmorphism', value: JSON.stringify({ logoText: 'GLASS_STUDIO', logoColor: '#ffffff', backgroundBrightness: 0.6, dividerColor: '#8b5cf6' }) },
    { key: 'video_template_minimal', value: JSON.stringify({ logoText: 'MINIMAL', logoColor: '#ffffff', backgroundBrightness: 0.5, dividerColor: '#ffffff' }) },
    { key: 'video_template_y2k', value: JSON.stringify({ logoText: 'RETRO_Y2K', logoColor: '#00f2ff', backgroundBrightness: 0.4, dividerColor: '#ff00ff' }) }
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s
    });
  }
  console.log('✔ Default Settings seeded');

  console.log('\n🚀 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

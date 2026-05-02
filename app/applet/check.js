const fs = require('fs');
const os = require('os');
const path = require('path');
const tmpDir = os.tmpdir();
const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp4'));
if (files.length > 0) {
  const videoPath = path.join(tmpDir, files[files.length - 1]);
  console.log('Video size:', fs.statSync(videoPath).size);
} else {
  console.log('No videos found');
}

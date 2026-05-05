import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'autoreels-super-secret-key';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.json({ user: { id: user.id, username: user.username, mustChangePassword: user.mustChangePassword } });
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user: { id: user.id, username: user.username, mustChangePassword: user.mustChangePassword } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid session' });
  }
});

router.get('/tiktok/url', (req, res) => {
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Store codeVerifier in cookie for callback verification
  res.cookie('tiktok_code_verifier', codeVerifier, { httpOnly: true, maxAge: 600000 });

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const redirect_uri = process.env.TIKTOK_REDIRECT_URI || `${protocol}://${host}/api/auth/tiktok/callback`;

  const url = `https://www.tiktok.com/v2/auth/authorize/`;
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || 'test_client_key',
    scope: 'user.info.basic,video.publish',
    response_type: 'code',
    redirect_uri,
    state: Math.random().toString(36).substring(7),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  res.json({ url: `${url}?${params.toString()}` });
});

router.get('/tiktok/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.send(`<script>alert("TikTok OAuth failed: ${error}"); window.close();</script>`);
  }

  try {
    const client_key = process.env.TIKTOK_CLIENT_KEY || 'test_client_key';
    const client_secret = process.env.TIKTOK_CLIENT_SECRET || '';
    const codeVerifier = req.cookies.tiktok_code_verifier;

    if (!codeVerifier) {
      throw new Error('Code verifier not found in session/cookies');
    }
    
    // 1. Exchange code for real access_token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key,
        client_secret,
        code: code as string,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}/api/auth/tiktok/callback`
      }).toString()
    });

    const tokenData = await tokenRes.json() as any;
    
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token');
    }

    await prisma.account.upsert({
      where: { platform: 'tiktok' },
      update: { 
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
      },
      create: { 
        platform: 'tiktok', 
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
      }
    });
    
    res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: 'tiktok' }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script>
    `);
  } catch (err: any) {
    console.error('[TikTok OAuth Callback Error]', err);
    res.send(`<script>alert("TikTok OAuth failed: ${err.message}"); window.close();</script>`);
  }
});

export default router;

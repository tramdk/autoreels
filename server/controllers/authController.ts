import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import crypto from 'crypto';
import { config } from '../config';

const JWT_SECRET = config.jwtSecret;

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    // Support for iframes (HF Spaces) requires SameSite=None and Secure
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' || config.isProd;
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isSecure, 
      path: '/',
      sameSite: isSecure ? 'none' : 'lax'
    });
    
    res.json({ user: { id: user.id, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword } });
  } catch (err) {
    next(err);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { username, password: hashedPassword }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user: { id: user.id, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword } });
  } catch (err) {
    console.error('[getMe Error]', err);
    res.status(500).json({ error: 'Internal server error during auth check' });
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: decoded.id },
      data: { 
        password: hashedPassword,
        mustChangePassword: false
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid session' });
  }
};

export const getTikTokAuthUrl = (req: Request, res: Response) => {
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' || config.isProd;
  res.cookie('tiktok_code_verifier', codeVerifier, { 
    httpOnly: true, 
    maxAge: 600000,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/'
  });

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const redirect_uri = config.tiktok.redirectUri || `${protocol}://${host}/api/auth/tiktok/callback`;

  const url = `https://www.tiktok.com/v2/auth/authorize/`;
  const params = new URLSearchParams({
    client_key: config.tiktok.clientKey || 'test_client_key',
    scope: 'user.info.basic,video.upload,video.info',
    response_type: 'code',
    redirect_uri,
    state: Math.random().toString(36).substring(7),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  res.json({ url: `${url}?${params.toString()}` });
};

export const tiktokCallback = async (req: Request, res: Response, next: NextFunction) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.send(`<script>alert("TikTok OAuth failed: ${error}"); window.close();</script>`);
  }

  try {
    const client_key = config.tiktok.clientKey || 'test_client_key';
    const client_secret = config.tiktok.clientSecret || '';
    const codeVerifier = req.cookies.tiktok_code_verifier;

    if (!codeVerifier) {
      throw new Error('Code verifier not found in session/cookies');
    }
    
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key,
        client_secret,
        code: code as string,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: config.tiktok.redirectUri || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}/api/auth/tiktok/callback`
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
};

export const disconnectTikTok = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.account.deleteMany({ where: { platform: 'tiktok' } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

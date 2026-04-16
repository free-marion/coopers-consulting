// NOBA Portal — Cloudflare Worker
// Deploy this in Cloudflare Dashboard → Workers & Pages → Create Worker
// Then add a route: coopersconsulting.com/noba-portal/* → this worker

const COMMON_PASS  = 'SubvertNormality';
const GROUP_PASS   = 'NOBA2026';
const COOKIE_NAME  = 'noba_auth';
const COOKIE_AGE   = 60 * 60 * 24 * 7; // 7 days

const GROUP_SLUGS = [
  'zeta', 'bad-batch', 'crimson-aces', 'dragon-shields',
  'storm-wardens', 'phoenix-wing', 'knights-raven'
];

function isGroupPath(pathname) {
  return GROUP_SLUGS.some(slug =>
    pathname.startsWith(`/noba-portal/${slug}/`) ||
    pathname === `/noba-portal/${slug}`
  );
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match  = header.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : null;
}

function loginHTML(path, error = false) {
  const groupPath = isGroupPath(path);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NOBA Portal</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0f0d0a;color:#e8d5b7;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#1c1a16;border:1px solid #2e2b24;border-radius:8px;padding:40px 36px;width:100%;max-width:340px;text-align:center}
  .logo{font-size:2rem;font-weight:800;letter-spacing:.08em;color:#B07D4B;margin-bottom:4px}
  .sub{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#8a7560;margin-bottom:32px}
  label{display:block;text-align:left;font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8a7560;margin-bottom:6px}
  input[type=password]{width:100%;background:#0f0d0a;border:1px solid #3a3630;border-radius:4px;color:#e8d5b7;padding:10px 14px;font-size:.95rem;margin-bottom:16px;outline:none;-webkit-appearance:none}
  input:focus{border-color:#B07D4B}
  button{width:100%;background:#B07D4B;color:#0f0d0a;border:none;border-radius:4px;padding:11px;font-weight:800;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:background .15s}
  button:hover{background:#d4a06a}
  .err{color:#b91c1c;font-size:.78rem;margin-bottom:12px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">NOBA</div>
  <div class="sub">Member Portal</div>
  ${error ? '<p class="err">Incorrect password — try again.</p>' : ''}
  <form method="POST" action="/noba-portal/__auth">
    <input type="hidden" name="redirect" value="${path}">
    <label>${groupPath ? 'Group Password' : 'Member Password'}</label>
    <input type="password" name="password" autofocus autocomplete="current-password">
    <button type="submit">Enter</button>
  </form>
</div>
</body>
</html>`;
}

export default {
  async fetch(request) {
    const url      = new URL(request.url);
    const pathname = url.pathname;

    // Only handle /noba-portal paths
    if (!pathname.startsWith('/noba-portal')) {
      return fetch(request);
    }

    // ── Handle auth form POST ──────────────────────────────────────────────
    if (request.method === 'POST' && pathname === '/noba-portal/__auth') {
      const form     = await request.formData();
      const password = (form.get('password') || '').trim();
      const redirect = form.get('redirect') || '/noba-portal/';

      const groupPath    = isGroupPath(redirect);
      const correctPass  = groupPath ? GROUP_PASS : COMMON_PASS;

      if (password !== correctPass) {
        return new Response(loginHTML(redirect, true), {
          status: 401,
          headers: { 'Content-Type': 'text/html' }
        });
      }

      const level = groupPath ? 'group' : 'common';
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirect,
          'Set-Cookie': `${COOKIE_NAME}=${level}:${password}; Path=/noba-portal; Max-Age=${COOKIE_AGE}; HttpOnly; SameSite=Lax; Secure`
        }
      });
    }

    // ── Check existing cookie ──────────────────────────────────────────────
    const cookie    = getCookie(request, COOKIE_NAME) || '';
    const [level, pass] = cookie.split(':');
    const groupPath = isGroupPath(pathname);

    let authorized = false;

    if (groupPath) {
      // Group paths need the group password
      authorized = level === 'group' && pass === GROUP_PASS;
    } else {
      // Common area accepts either password
      authorized = (level === 'common' && pass === COMMON_PASS) ||
                   (level === 'group'  && pass === GROUP_PASS);
    }

    if (authorized) {
      return fetch(request);
    }

    // ── Show login page ────────────────────────────────────────────────────
    return new Response(loginHTML(pathname), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

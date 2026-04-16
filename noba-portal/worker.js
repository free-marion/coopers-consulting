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
  body{font-family:'DM Sans',system-ui,sans-serif;background:#1E2D33;color:#F5F0E8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#2B3F47;border:1px solid #3A5560;border-radius:4px;padding:40px 36px;width:100%;max-width:340px;text-align:center;border-top:3px solid #B07D4B}
  .logo{font-family:Georgia,serif;font-size:2rem;font-weight:700;letter-spacing:.08em;color:#B07D4B;margin-bottom:4px}
  .sub{font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#8A9AA0;margin-bottom:32px;font-style:italic}
  label{display:block;text-align:left;font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8A9AA0;margin-bottom:6px}
  input[type=password]{width:100%;background:#1E2D33;border:1px solid #3A5560;border-radius:3px;color:#F5F0E8;padding:10px 14px;font-size:.95rem;margin-bottom:16px;outline:none;-webkit-appearance:none;font-family:inherit}
  input:focus{border-color:#B07D4B}
  button{width:100%;background:#B07D4B;color:#F5F0E8;border:none;border-radius:3px;padding:11px;font-weight:800;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:opacity .15s;font-family:inherit}
  button:hover{opacity:.85}
  .err{color:#c0392b;font-size:.78rem;margin-bottom:12px;font-style:italic}
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

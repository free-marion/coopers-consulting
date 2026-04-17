export default {
  async fetch(request) {
    const url      = new URL(request.url);
    const pathname = url.pathname;

    if (!pathname.startsWith('/noba-portal')) return fetch(request);

    const POD_PASSWORDS = {
      'zeta':           '1',
      'bad-batch':      '2',
      'crimson-aces':   '3',
      'dragon-shields': '4',
      'storm-wardens':  '5',
      'phoenix-wing':   '6',
      'knights-raven':  '7',
    };
    const COOKIE_NAME = 'noba_auth';
    const COOKIE_AGE  = 604800;

    function getSlug(path) {
      for (const slug of Object.keys(POD_PASSWORDS)) {
        if (path === '/noba-portal/' + slug || path.startsWith('/noba-portal/' + slug + '/')) return slug;
      }
      return null;
    }

    function getCookie(req) {
      const h = req.headers.get('Cookie') || '';
      const m = h.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE_NAME + '='));
      return m ? m.slice(COOKIE_NAME.length + 1) : '';
    }

    function loginPage(path, err) {
      const errMsg = err ? '<p style="color:#c0392b;font-size:.78rem;margin-bottom:12px">Incorrect password.</p>' : '';
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NOBA</title>'
        + '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#1E2D33;color:#F5F0E8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.c{background:#2B3F47;border:1px solid #3A5560;border-radius:4px;padding:40px 36px;width:100%;max-width:340px;text-align:center;border-top:3px solid #B07D4B}.logo{font-family:Georgia,serif;font-size:2rem;font-weight:700;color:#B07D4B;letter-spacing:.08em;margin-bottom:4px}.sub{font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#8A9AA0;margin-bottom:32px}label{display:block;text-align:left;font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8A9AA0;margin-bottom:6px}input{width:100%;background:#1E2D33;border:1px solid #3A5560;border-radius:3px;color:#F5F0E8;padding:10px 14px;font-size:.95rem;margin-bottom:16px;outline:none}input:focus{border-color:#B07D4B}button{width:100%;background:#B07D4B;color:#F5F0E8;border:none;border-radius:3px;padding:11px;font-weight:800;font-size:.85rem;cursor:pointer}</style>'
        + '</head><body><div class="c"><div class="logo">NOBA</div><div class="sub">Group Access</div>'
        + errMsg
        + '<form method="POST" action="/noba-portal/__auth"><input type="hidden" name="redirect" value="' + path + '"><label>Group Password</label><input type="password" name="password" autofocus><button type="submit">Enter</button></form>'
        + '</div></body></html>',
        { status: err ? 401 : 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const podSlug = getSlug(pathname);

    // Portal level — no auth required
    if (!podSlug) return fetch(request);

    // Auth POST for pod
    if (request.method === 'POST' && pathname === '/noba-portal/__auth') {
      const form    = await request.formData();
      const entered = (form.get('password') || '').trim().toLowerCase();
      const redirect = form.get('redirect') || '/noba-portal/';
      const slug    = getSlug(redirect);

      if (!slug || entered !== POD_PASSWORDS[slug]) return loginPage(redirect, true);
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirect, 'Set-Cookie': COOKIE_NAME + '=pod:' + slug + ':' + entered + '; Path=/noba-portal; Max-Age=' + COOKIE_AGE + '; HttpOnly; SameSite=Lax; Secure' }
      });
    }

    // Check pod cookie
    const parts = getCookie(request).split(':');
    const ok    = parts[0] === 'pod' && parts[1] === podSlug && parts[2] === POD_PASSWORDS[podSlug];

    if (ok) return fetch(request);
    return loginPage(pathname, false);
  }
};

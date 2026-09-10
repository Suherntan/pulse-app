// Locks the whole site behind a username/password prompt (HTTP Basic Auth).
// Free on Vercel's Hobby plan — no paid "Password Protection" feature needed.
//
// Set these two Environment Variables in your Vercel project settings
// (Project → Settings → Environment Variables), then redeploy:
//   SITE_USER = the username you want to log in with
//   SITE_PASS = the password you want to log in with

export const config = {
  matcher: '/((?!favicon).*)',
};

export default function middleware(request) {
  const expectedUser = process.env.SITE_USER;
  const expectedPass = process.env.SITE_PASS;

  // If no credentials are configured yet, don't lock everyone out by accident.
  if (!expectedUser || !expectedPass) {
    return;
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6));
    const separatorIndex = decoded.indexOf(':');
    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);

    if (user === expectedUser && pass === expectedPass) {
      return;
    }
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="PULSE Dashboard", charset="UTF-8"',
    },
  });
}

/**
 * Generates a branded "site not found" HTML page for subdomain routing.
 * Displayed when a user visits slug.pipilot.dev but no deployed site exists.
 */
export function generateSiteNotFoundHTML(slug: string): string {
  // Sanitize slug for safe HTML embedding
  const safeSlug = slug.replace(/[<>"'&]/g, '')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSlug} - Coming Soon | PiPilot</title>
  <link rel="icon" href="https://pipilot.dev/favicon.ico">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:.35}50%{opacity:.7}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    body{
      min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
      background:#030305;color:#e5e5e5;overflow:hidden;position:relative;
    }
    /* Subtle radial glow behind card */
    body::before{
      content:'';position:fixed;top:40%;left:50%;width:600px;height:600px;
      transform:translate(-50%,-50%);
      background:radial-gradient(circle,rgba(234,88,12,.08) 0%,transparent 70%);
      pointer-events:none;z-index:0;
    }
    .container{
      position:relative;z-index:1;text-align:center;padding:2rem 1.5rem;
      max-width:480px;width:100%;animation:fadeUp .7s ease-out both;
    }
    /* PiPilot logo mark */
    .logo-mark{
      width:56px;height:56px;border-radius:16px;margin:0 auto 2rem;
      background:linear-gradient(135deg,#ea580c,#f97316);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 40px rgba(234,88,12,.25),0 0 80px rgba(234,88,12,.08);
      animation:float 4s ease-in-out infinite;
    }
    .logo-mark svg{width:28px;height:28px;color:#fff}
    .slug-badge{
      display:inline-flex;align-items:center;gap:6px;
      padding:6px 16px;border-radius:999px;
      background:rgba(234,88,12,.1);border:1px solid rgba(234,88,12,.2);
      font-size:13px;font-weight:600;color:#fb923c;
      margin-bottom:1.5rem;letter-spacing:.02em;
    }
    .slug-badge .dot{
      width:6px;height:6px;border-radius:50%;background:#f97316;
      animation:pulse 2s ease-in-out infinite;
    }
    h1{
      font-size:1.75rem;font-weight:700;color:#f5f5f5;
      margin-bottom:.625rem;line-height:1.2;letter-spacing:-.02em;
    }
    .subtitle{
      font-size:.9375rem;color:#737373;line-height:1.6;
      margin-bottom:2rem;max-width:380px;margin-left:auto;margin-right:auto;
    }
    .subtitle strong{color:#a3a3a3;font-weight:500}
    .cta-row{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
    .btn{
      display:inline-flex;align-items:center;gap:6px;
      padding:10px 22px;border-radius:10px;font-size:.8125rem;font-weight:600;
      text-decoration:none;transition:all .2s ease;cursor:pointer;border:none;
    }
    .btn-primary{
      background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;
      box-shadow:0 2px 12px rgba(234,88,12,.3);
    }
    .btn-primary:hover{box-shadow:0 4px 20px rgba(234,88,12,.45);transform:translateY(-1px)}
    .btn-ghost{
      background:rgba(255,255,255,.05);color:#a3a3a3;
      border:1px solid rgba(255,255,255,.08);
    }
    .btn-ghost:hover{background:rgba(255,255,255,.08);color:#d4d4d4;border-color:rgba(255,255,255,.12)}
    .divider{
      width:48px;height:1px;margin:2rem auto;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);
    }
    .footer-text{font-size:.75rem;color:#525252;line-height:1.6}
    .footer-text a{color:#ea580c;text-decoration:none;font-weight:500}
    .footer-text a:hover{text-decoration:underline}
    /* Shimmer bar */
    .shimmer-bar{
      width:120px;height:3px;border-radius:99px;margin:0 auto 2rem;
      background:linear-gradient(90deg,transparent,rgba(234,88,12,.4),transparent);
      background-size:200% 100%;animation:shimmer 2.5s linear infinite;
    }
    @media(max-width:480px){
      h1{font-size:1.375rem}
      .subtitle{font-size:.875rem}
      .cta-row{flex-direction:column;align-items:center}
      .btn{width:100%;justify-content:center}
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    </div>
    <div class="shimmer-bar"></div>
    <div class="slug-badge">
      <span class="dot"></span>
      ${safeSlug}.pipilot.dev
    </div>
    <h1>Launching Soon</h1>
    <p class="subtitle">
      This PiPilot project is being built and hasn't been published yet.
      <strong>Check back shortly</strong> &mdash; it could go live any moment.
    </p>
    <div class="cta-row">
      <a href="https://pipilot.dev" class="btn btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        Build with PiPilot
      </a>
      <a href="https://pipilot.dev/docs" class="btn btn-ghost">
        Learn more
      </a>
    </div>
    <div class="divider"></div>
    <p class="footer-text">
      Powered by <a href="https://pipilot.dev">PiPilot</a> &mdash; Canada's Agentic Vibe Coding Platform
    </p>
  </div>
</body>
</html>`
}

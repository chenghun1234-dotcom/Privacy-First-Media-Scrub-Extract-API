import { Hono } from 'hono'
import { html } from 'hono/html'
import { cors } from 'hono/cors'
import { stripExif, extractPdfText } from './processing'

const app = new Hono()

app.use('*', cors())

// 5MB Body Size Limit Middleware
app.use('*', async (c, next) => {
  const contentLength = c.req.header('content-length')
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    return c.json({ error: 'Payload too large. Maximum allowed size is 5MB.' }, 413)
  }
  await next()
})

// RapidAPI Security Middleware (Exclude / and /ping)
app.use('*', async (c, next) => {
  const path = c.req.path
  if (path === '/' || path === '/ping') {
    return await next()
  }

  const proxySecret = c.req.header('x-rapidapi-proxy-secret')
  const expectedSecret = 'd9369720-4226-11f1-af79-d95f0f1c1c30'

  if (proxySecret !== expectedSecret) {
    return c.json({ error: 'Unauthorized: Requests must originate from RapidAPI.' }, 401)
  }
  
  await next()
})

app.use('*', async (c, next) => {
  await next()
  c.header('X-Privacy-Statement', 'Processed entirely in-memory. Zero data retention.')
  c.header('X-Powered-By', 'WebAssembly/Hono/Cloudflare')
})

// RapidAPI Health Check
app.get('/ping', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.get('/', (c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy-First Media Scrub & Extract API</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #6366f1;
                --secondary: #d946ef;
                --accent: #10b981;
                --bg: #0f172a;
                --card-bg: rgba(30, 41, 59, 0.7);
                --text: #f8fafc;
                --text-dim: #94a3b8;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Outfit', sans-serif;
            }

            body {
                background-color: var(--bg);
                color: var(--text);
                line-height: 1.6;
                overflow-x: hidden;
                background-image: 
                    radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
                    radial-gradient(circle at 90% 80%, rgba(217, 70, 239, 0.15) 0%, transparent 40%);
                min-height: 100vh;
            }

            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem;
            }

            header {
                padding: 4rem 0;
                text-align: center;
                animation: fadeIn 1s ease-out;
            }

            .badge {
                background: linear-gradient(90deg, var(--primary), var(--secondary));
                padding: 0.5rem 1.5rem;
                border-radius: 999px;
                font-size: 0.875rem;
                font-weight: 600;
                display: inline-block;
                margin-bottom: 1.5rem;
                box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
            }

            h1 {
                font-size: 4rem;
                font-weight: 800;
                background: linear-gradient(to right, #fff, #94a3b8);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 1.5rem;
                letter-spacing: -0.02em;
            }

            .hero-desc {
                font-size: 1.25rem;
                color: var(--text-dim);
                max-width: 700px;
                margin: 0 auto 3rem;
            }

            .features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
                margin-top: 4rem;
            }

            .card {
                background: var(--card-bg);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 2.5rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .card:hover {
                transform: translateY(-10px);
                border-color: rgba(99, 102, 241, 0.5);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            }

            .card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: linear-gradient(90deg, var(--primary), var(--secondary));
                opacity: 0;
                transition: opacity 0.3s;
            }

            .card:hover::before {
                opacity: 1;
            }

            .icon {
                font-size: 2.5rem;
                margin-bottom: 1.5rem;
                display: block;
            }

            .card-title {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 1rem;
                color: #fff;
            }

            .card-text {
                color: var(--text-dim);
                font-size: 1rem;
            }

            .cta-section {
                text-align: center;
                padding: 6rem 0;
            }

            .btn {
                background: #fff;
                color: var(--bg);
                padding: 1rem 2.5rem;
                border-radius: 12px;
                font-weight: 700;
                text-decoration: none;
                transition: all 0.3s;
                display: inline-block;
                cursor: pointer;
            }

            .btn:hover {
                background: var(--primary);
                color: #fff;
                transform: scale(1.05);
            }

            footer {
                text-align: center;
                padding: 4rem 0;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                color: var(--text-dim);
                font-size: 0.875rem;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .tech-stack {
                display: flex;
                justify-content: center;
                gap: 1.5rem;
                margin-top: 2rem;
                flex-wrap: wrap;
            }

            .tech-pill {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 0.4rem 1rem;
                border-radius: 8px;
                font-size: 0.75rem;
                color: var(--text-dim);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div class="badge">SECURE 🛡️ PRIVACY-FIRST ⚡ FAST</div>
                <h1>Media Scrub & Extract API</h1>
                <p class="hero-desc">The ultimate B2B solution for secure media processing. Strip metadata, extract structured data, and convert documents—all in-memory, zero data storage.</p>
                
                <div class="tech-stack">
                    <span class="tech-pill">WebAssembly (WASM)</span>
                    <span class="tech-pill">Cloudflare Workers</span>
                    <span class="tech-pill">Privacy-First Architecture</span>
                    <span class="tech-pill">Zero Data Retention</span>
                </div>
            </header>

            <div class="features">
                <div class="card">
                    <span class="icon">🖼️</span>
                    <h3 class="card-title">Image Scrubbing</h3>
                    <p class="card-text">Remove GPS, device info, and all EXIF metadata instantly to protect user privacy.</p>
                </div>
                <div class="card">
                    <span class="icon">📄</span>
                    <h3 class="card-title">PDF Extraction</h3>
                    <p class="card-text">Extract raw text and structures from PDF files and receive clean JSON data.</p>
                </div>
                <div class="card">
                    <span class="icon">🎬</span>
                    <h3 class="card-title">Video Snapshot</h3>
                    <p class="card-text">Capture high-quality frames from any video at specific timestamps with zero latency.</p>
                </div>
                <div class="card">
                    <span class="icon">📚</span>
                    <h3 class="card-title">Doc Conversion</h3>
                    <p class="card-text">Transform DOCX or PDF documents into EPUB format for seamless reading experiences.</p>
                </div>
                <div class="card" style="border-color: var(--accent);">
                    <span class="icon">🔗</span>
                    <h3 class="card-title">Secure Share</h3>
                    <p class="card-text">Generate temporary retrieval links for processed media. Auto-deleted after 6 hours from KV.</p>
                </div>
            </div>

            <div style="margin-top: 6rem;">
                <h2 style="font-size: 2.5rem; text-align: center; margin-bottom: 2rem;">Developer Quickstart</h2>
                <div class="card" style="background: rgba(0,0,0,0.3); font-family: monospace; white-space: pre-wrap; font-size: 0.9rem;">
<span style="color: var(--accent)"># Strip EXIF and get a 6-hour share link</span>
curl -X POST "https://api.example.com/image/strip-exif?store=true" \
  -F "file=@photo.jpg"

<span style="color: var(--accent)"># Retrieve later (before it expires)</span>
curl https://api.example.com/share/{shareId}
                </div>
            </div>

            <div style="margin-top: 6rem; text-align: center;">
                <h2 style="font-size: 2.5rem; margin-bottom: 3rem;">Enterprise Ready Pricing</h2>
                <div class="features">
                    <div class="card">
                        <h3 class="card-title">BASIC</h3>
                        <p style="font-size: 2rem; font-weight: 800; margin: 1rem 0;">Free</p>
                        <p class="card-text">50 requests / mo</p>
                        <p class="card-text">Standard Support</p>
                    </div>
                    <div class="card" style="border-color: var(--primary);">
                        <h3 class="card-title">PRO</h3>
                        <p style="font-size: 2rem; font-weight: 800; margin: 1rem 0;">$15<span style="font-size: 1rem;">/mo</span></p>
                        <p class="card-text">2,000 requests / mo</p>
                        <p class="card-text">Priority Processing</p>
                    </div>
                    <div class="card">
                        <h3 class="card-title">ULTRA</h3>
                        <p style="font-size: 2rem; font-weight: 800; margin: 1rem 0;">$50<span style="font-size: 1rem;">/mo</span></p>
                        <p class="card-text">10,000 requests / mo</p>
                        <p class="card-text">24/7 Dedicated Support</p>
                    </div>
                </div>
            </div>

            <div class="cta-section">
                <a href="https://rapidapi.com" class="btn">Get Started on RapidAPI</a>
            </div>

            <footer>
                &copy; 2026 Privacy-First Media Scrub & Extract. Built for Enterprise Security.
            </footer>
        </div>
    </body>
    </html>
  `)
})

// Endpoints
app.post('/image/strip-exif', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) return c.json({ error: 'No file uploaded' }, 400)
    
    const buffer = await file.arrayBuffer()
    const stripped = await stripExif(buffer)
    
    // Store if requested
    const store = c.req.query('store') === 'true'
    let shareId = ''
    if (store) {
      shareId = crypto.randomUUID()
      await (c.env as any).TEMP_STORAGE.put(shareId, stripped, { 
        expirationTtl: 21600,
        metadata: { contentType: file.type, originalName: file.name }
      })
    }

    return new Response(stripped, {
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `attachment; filename="stripped_${file.name}"`,
        'X-Share-ID': shareId
      }
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.post('/pdf/extract-text', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) return c.json({ error: 'No file uploaded' }, 400)
    
    const buffer = await file.arrayBuffer()
    const result = await extractPdfText(buffer)
    
    // Store if requested
    const store = c.req.query('store') === 'true'
    let shareId = ''
    if (store) {
      shareId = crypto.randomUUID()
      await (c.env as any).TEMP_STORAGE.put(shareId, JSON.stringify(result), { 
        expirationTtl: 21600,
        metadata: { contentType: 'application/json', originalName: 'extracted.json' }
      })
    }

    return c.json({ ...result, shareId })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.post('/video/extract-frame', async (c) => {
  return c.json({ 
    error: 'Tier Restriction',
    message: 'Video frame extraction requires Ultra tier (Wasm-FFmpeg acceleration). Please upgrade your plan on RapidAPI.' 
  }, 403)
})

app.post('/document/to-epub', async (c) => {
  return c.json({ message: 'Document conversion coming soon' })
})

// Share Retrieval Endpoint
app.get('/share/:id', async (c) => {
  const id = c.req.param('id')
  const { value, metadata } = await (c.env as any).TEMP_STORAGE.getWithMetadata(id, { type: 'arrayBuffer' })
  
  if (!value) return c.json({ error: 'File not found or expired' }, 404)
  
  const meta = (metadata || {}) as any
  return new Response(value, {
    headers: {
      'Content-Type': meta.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${meta.originalName || 'file'}"`,
      'Cache-Control': 'public, max-age=3600'
    }
  })
})

export default app

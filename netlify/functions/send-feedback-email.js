// netlify/functions/send-feedback-email.js
// Triggered by EzBrewDay feedback form submissions
// Sends a formatted email notification to support@ezbrewday.com via Resend

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://app.ezbrewday.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const payload = JSON.parse(event.body || '{}');
    const { type, message, email, brew_data } = payload;

    if (!type || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Email service not configured' }) };
    }

    // Emoji and label for each type
    const typeInfo = {
      bug:    { emoji: '🐛', label: 'Bug Report',     color: '#ef4444' },
      idea:   { emoji: '💡', label: 'Feature Idea',   color: '#f59e0b' },
      help:   { emoji: '🙏', label: 'Help Request',   color: '#3b82f6' },
      thanks: { emoji: '⭐', label: 'User Thanks',    color: '#14b8a6' },
    };
    const info = typeInfo[type] || { emoji: '📬', label: type, color: '#6b7280' };

    // Build brew data section for bug reports
    let brewDataHtml = '';
    if (type === 'bug' && brew_data) {
      brewDataHtml = `
        <div style="margin-top:20px;background:#f3f4f6;border-radius:8px;padding:16px">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:10px">🔧 Brew Session Data (Auto-attached)</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            ${brew_data.beerName  ? `<tr><td style="padding:3px 0;color:#6b7280;width:130px">Beer Name</td><td style="color:#111">${brew_data.beerName}</td></tr>` : ''}
            ${brew_data.style     ? `<tr><td style="padding:3px 0;color:#6b7280">Style</td><td style="color:#111">${brew_data.style}</td></tr>` : ''}
            ${brew_data.og        ? `<tr><td style="padding:3px 0;color:#6b7280">OG</td><td style="color:#111">${brew_data.og}</td></tr>` : ''}
            ${brew_data.fg        ? `<tr><td style="padding:3px 0;color:#6b7280">FG</td><td style="color:#111">${brew_data.fg}</td></tr>` : ''}
            ${brew_data.ibu       ? `<tr><td style="padding:3px 0;color:#6b7280">IBU</td><td style="color:#111">${brew_data.ibu}</td></tr>` : ''}
            ${brew_data.batch     ? `<tr><td style="padding:3px 0;color:#6b7280">Batch Size</td><td style="color:#111">${brew_data.batch} gal</td></tr>` : ''}
            ${brew_data.browser   ? `<tr><td style="padding:3px 0;color:#6b7280">Browser</td><td style="color:#111;font-size:11px">${brew_data.browser.substring(0,80)}</td></tr>` : ''}
            ${brew_data.screen    ? `<tr><td style="padding:3px 0;color:#6b7280">Screen</td><td style="color:#111">${brew_data.screen}</td></tr>` : ''}
            ${brew_data.timestamp ? `<tr><td style="padding:3px 0;color:#6b7280">Timestamp</td><td style="color:#111">${new Date(brew_data.timestamp).toLocaleString()}</td></tr>` : ''}
          </table>
        </div>`;
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08)">
    
    <!-- Header -->
    <div style="background:#0e1117;padding:20px 24px;display:flex;align-items:center">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.02em">EzBrew<span style="color:#14b8a6">Day</span></div>
      <div style="margin-left:auto;background:${info.color};color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px">${info.emoji} ${info.label}</div>
    </div>

    <!-- Body -->
    <div style="padding:24px">
      <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px">${info.emoji} New ${info.label}</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:20px">From: <strong style="color:#111">${email || 'Anonymous'}</strong></div>
      
      <div style="background:#f9fafb;border-left:4px solid ${info.color};border-radius:0 8px 8px 0;padding:16px;font-size:14px;color:#111;line-height:1.6">
        ${message.replace(/\n/g, '<br>')}
      </div>

      ${brewDataHtml}

      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;color:#9ca3af">Reply to: <a href="mailto:${email}" style="color:#14b8a6">${email || 'no email provided'}</a></div>
        <a href="https://supabase.com/dashboard" style="font-size:12px;color:#14b8a6;text-decoration:none">View in Supabase →</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;padding:12px 24px;font-size:11px;color:#9ca3af;text-align:center">
      EzBrewDay Feedback System · <a href="https://app.ezbrewday.com" style="color:#14b8a6">app.ezbrewday.com</a>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'EzBrewDay Feedback <brett@ezbrewday.com>',
        to: ['support@ezbrewday.com'],
        reply_to: email || 'support@ezbrewday.com',
        subject: `${info.emoji} [${info.label}] ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`,
        html: htmlBody
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', result);
      return { statusCode: 500, headers, body: JSON.stringify({ error: result.message || 'Email send failed' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: result.id }) };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

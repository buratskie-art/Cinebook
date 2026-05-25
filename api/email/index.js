const { Resend } = require('resend');
const { send, readBody, setCors, handleOptions } = require('../_lib/http');

const DEFAULT_FROM = 'CineBook <onboarding@resend.dev>';

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    send(res, 500, { ok: false, error: 'RESEND_API_KEY is not configured' });
    return;
  }

  try {
    const body = await readBody(req);
    const to = body.to;
    const subject = String(body.subject || '').trim();
    const html = body.html ? String(body.html) : undefined;
    const text = body.text ? String(body.text) : stripTags(html || body.body || '');

    if (!to || !subject || (!html && !text)) {
      send(res, 400, { ok: false, error: 'Email to, subject, and content are required' });
      return;
    }

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to,
      subject,
      html,
      text
    });

    if (result.error) {
      send(res, 502, { ok: false, error: result.error.message || 'Resend failed' });
      return;
    }

    send(res, 200, {
      ok: true,
      id: result.data && result.data.id ? result.data.id : result.id
    });
  } catch (error) {
    send(res, 500, { ok: false, error: error.message || 'Email failed' });
  }
};

require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');   // ← add this

const app = express();
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Resend client

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'Aurascope <no-reply@example.com>';require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
Paste this at the very top of server.js, replacing everything from the first require('dotenv').config(); down through the second duplicated supabase block you showed.


require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Resend client
const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'Aurascope <no-reply@example.com>';

// ── Generate aura reading via Groq ────────────────────────────────────────────
app.post('/api/reading', async (req, res) => {
  const { birthDate, name } = req.body;
  if (!birthDate) return res.status(400).json({ error: 'Birth date required' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const dob = new Date(birthDate);
  const month = dob.toLocaleString('en-US', { month: 'long' });
  const day = dob.getDate();
  const year = dob.getFullYear();

  const prompt = `You are Aurascope, a mystical aura reading system. Generate a personalized 3-frequency color aura reading for someone born on ${month} ${day}, ${year}${name ? ` named ${name}` : ''}.

Respond ONLY with valid JSON, no other text:
{
  "hue_1": "hex color code",
  "hue_1_label": "color name (1-2
// ── Generate aura reading via Groq ────────────────────────────────────────────
app.post('/api/reading', async (req, res) => {
  const { birthDate, name } = req.body;
  if (!birthDate) return res.status(400).json({ error: 'Birth date required' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const dob = new Date(birthDate);
  const month = dob.toLocaleString('en-US', { month: 'long' });
  const day = dob.getDate();
  const year = dob.getFullYear();

  const prompt = `You are Aurascope, a mystical aura reading system. Generate a personalized 3-frequency color aura reading for someone born on ${month} ${day}, ${year}${name ? ` named ${name}` : ''}.

Respond ONLY with valid JSON, no other text:
{
  "hue_1": "hex color code",
  "hue_1_label": "color name (1-2 words)",
  "hue_1_strength": "1-2 sentence strength insight",
  "hue_1_shadow": "1-2 sentence shadow insight",
  "hue_2": "hex color code",
  "hue_2_label": "color name (1-2 words)",
  "hue_2_strength": "1-2 sentence strength insight",
  "hue_2_shadow": "1-2 sentence shadow insight",
  "hue_3": "hex color code",
  "hue_3_label": "color name (1-2 words)",
  "hue_3_strength": "1-2 sentence strength insight",
  "hue_3_shadow": "1-2 sentence shadow insight",
  "preview": "2-3 sentence teaser reading that feels eerily accurate — hint at deeper truths but don't reveal everything. Make it feel personal and specific to this birth date.",
  "full_reading": "5-6 sentence deep reading covering all three frequencies working together, their combined energy, life purpose alignment, and current energetic theme",
  "mantra": "A unique 6-10 word sacred mantra specific to this person's frequency signature"
}

Rules:
- Colors must feel mystical and rare (not basic red/blue/green — think: bismuth violet, abyssal teal, ember gold)
- The reading must feel uncannily specific to this birth date
- Tone: mystical, direct, slightly disbelieving in its accuracy`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || 'AI error' });
    }

    const result = await response.json();
    let text = result.choices[0].message.content.trim();
    text = text.replace(/```json|```/g, '').trim();
    const reading = JSON.parse(text);

    // Save to Supabase
    const { data, error } = await supabase.from('readings').insert([{
      birth_date: birthDate,
      name: name || null,
      hue_1: reading.hue_1,
      hue_2: reading.hue_2,
      hue_3: reading.hue_3,
      hue_1_label: reading.hue_1_label,
      hue_2_label: reading.hue_2_label,
      hue_3_label: reading.hue_3_label,
      reading_preview: reading.preview,
      reading_full: reading.full_reading,
      mantra: reading.mantra
    }]).select().single();

    if (error) console.error('Supabase error:', error);

    res.json({ ...reading, id: data?.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Unlock with email ─────────────────────────────────────────────────────────
app.post('/api/unlock', async (req, res) => {
  const { readingId, email, name } = req.body;
  if (!readingId || !email) return res.status(400).json({ error: 'Missing fields' });

  try {
    // 1) Update reading with email + fetch full record
    const { data: reading, error: updateError } = await supabase
      .from('readings')
      .update({
        email,
        email_unlocked: true,
        email_unlocked_at: new Date().toISOString(),
      })
      .eq('id', readingId)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ error: 'Failed to update reading' });
    }

    // 2) Upsert subscriber
    const subscriberName = name || reading?.name || null;

    const { error: upsertError } = await supabase.from('subscribers').upsert(
      [{
        email,
        name: subscriberName,
        birth_date: reading?.birth_date,
        primary_hue: reading?.hue_1_label,
        reading_id: readingId,
        source: 'app',
      }],
      { onConflict: 'email' }
    );

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      // don’t block the user, just log it
    }

    // 3) Send full reading email via Resend
    try {
      const personName = subscriberName || 'there';
      const subject = `Your Aurascope reading is ready, ${personName}`;

      const preview = reading?.reading_preview || '';
      const full = reading?.reading_full || '';
      const mantra = reading?.mantra || '';

      const hue1 = reading?.hue_1_label || '';
      const hue2 = reading?.hue_2_label || '';
      const hue3 = reading?.hue_3_label || '';

      const html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111;">
          <p>Hi ${personName},</p>

          <p>Here’s the full version of the Aurascope you just unlocked.</p>

          <h2 style="margin-top: 1.5rem;">Your three main hues</h2>
          <ul>
            <li><strong>${hue1}</strong></li>
            <li><strong>${hue2}</strong></li>
            <li><strong>${hue3}</strong></li>
          </ul>

          ${preview ? `<p><em>Teaser you saw on the site:</em> ${preview}</p>` : ''}

          <h2 style="margin-top: 1.5rem;">Your full Aurascope</h2>
          <p>${full.replace(/\n/g, '  
')}</p>

          ${mantra ? `
            <h3 style="margin-top: 1.5rem;">Mantra to keep nearby</h3>
            <p style="font-style: italic;">“${mantra}”</p>
          ` : ''}

          <p style="margin-top: 2rem;">If this reading feels accurate (or if something feels off), hit reply and tell me what landed. Both reactions are useful mirrors.</p>

          <p>— Aurascope</p>
        </div>
      `;

      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject,
        html,
      });
    } catch (emailErr) {
      console.error('Resend email error:', emailErr);
      // still return success to the user so the UI doesn’t break
    }

    // 4) Respond to frontend so it can show full reading on page if needed
    return res.json({
      success: true,
      full_reading: reading?.reading_full,
      mantra: reading?.mantra,
    });
  } catch (err) {
    console.error('Unlock route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

  // Upsert subscriber
  await supabase.from('subscribers').upsert([{
    email,
    name: name || reading?.name,
    birth_date: reading?.birth_date,
    primary_hue: reading?.hue_1_label,
    reading_id: readingId,
    source: 'app'
  }], { onConflict: 'email' });

  res.json({ success: true, full_reading: reading?.reading_full, mantra: reading?.mantra });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✨ Aurascope → http://localhost:${PORT}`));

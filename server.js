'use strict';

/*
|--------------------------------------------------------------------------
| AuraScope Server
|--------------------------------------------------------------------------
| Simple onboarding flow:
| 1. User enters birthdate
| 2. Zodiac is calculated
| 3. Strength / Balance / Weakness traits generated
| 4. Sub-hues combine into First Hue
| 5. Reading can be emailed
|--------------------------------------------------------------------------
*/

require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Resend } = require('resend');

const app = express();

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

/*
|--------------------------------------------------------------------------
| Zodiac Definitions
|--------------------------------------------------------------------------
*/

const ZODIACS = [
  {
    sign: 'Capricorn',
    start: '12-22',
    end: '01-19',
    strength: 'Discipline',
    balance: 'Restraint',
    weakness: 'Control',
    hues: {
      strength: '#5E4B3C',
      balance: '#7A7068',
      weakness: '#2B2B2B'
    }
  },

  {
    sign: 'Aquarius',
    start: '01-20',
    end: '02-18',
    strength: 'Innovation',
    balance: 'Detachment',
    weakness: 'Isolation',
    hues: {
      strength: '#00C2FF',
      balance: '#6EC5E9',
      weakness: '#55707A'
    }
  },

  {
    sign: 'Pisces',
    start: '02-19',
    end: '03-20',
    strength: 'Empathy',
    balance: 'Dreaming',
    weakness: 'Escapism',
    hues: {
      strength: '#6A5ACD',
      balance: '#8A7FFF',
      weakness: '#483D8B'
    }
  },

  {
    sign: 'Aries',
    start: '03-21',
    end: '04-19',
    strength: 'Courage',
    balance: 'Drive',
    weakness: 'Impulsiveness',
    hues: {
      strength: '#FF3B30',
      balance: '#FF7043',
      weakness: '#B22222'
    }
  },

  {
    sign: 'Taurus',
    start: '04-20',
    end: '05-20',
    strength: 'Loyalty',
    balance: 'Patience',
    weakness: 'Stubbornness',
    hues: {
      strength: '#228B22',
      balance: '#5A9E5A',
      weakness: '#556B2F'
    }
  },

  {
    sign: 'Gemini',
    start: '05-21',
    end: '06-20',
    strength: 'Adaptability',
    balance: 'Curiosity',
    weakness: 'Restlessness',
    hues: {
      strength: '#00CED1',
      balance: '#20B2AA',
      weakness: '#4682B4'
    }
  },

  {
    sign: 'Cancer',
    start: '06-21',
    end: '07-22',
    strength: 'Protection',
    balance: 'Sensitivity',
    weakness: 'Moodiness',
    hues: {
      strength: '#87CEFA',
      balance: '#B0E0E6',
      weakness: '#5F9EA0'
    }
  },

  {
    sign: 'Leo',
    start: '07-23',
    end: '08-22',
    strength: 'Confidence',
    balance: 'Expression',
    weakness: 'Pride',
    hues: {
      strength: '#FDB813',
      balance: '#FFB347',
      weakness: '#C97B00'
    }
  },

  {
    sign: 'Virgo',
    start: '08-23',
    end: '09-22',
    strength: 'Precision',
    balance: 'Practicality',
    weakness: 'Overthinking',
    hues: {
      strength: '#6B8E23',
      balance: '#9ACD32',
      weakness: '#556B2F'
    }
  },

  {
    sign: 'Libra',
    start: '09-23',
    end: '10-22',
    strength: 'Harmony',
    balance: 'Diplomacy',
    weakness: 'Indecision',
    hues: {
      strength: '#FF69B4',
      balance: '#FFC0CB',
      weakness: '#C08081'
    }
  },

  {
    sign: 'Scorpio',
    start: '10-23',
    end: '11-21',
    strength: 'Determination',
    balance: 'Intensity',
    weakness: 'Jealousy',
    hues: {
      strength: '#8B0000',
      balance: '#5C1A1B',
      weakness: '#556B2F'
    }
  },

  {
    sign: 'Sagittarius',
    start: '11-22',
    end: '12-21',
    strength: 'Adventure',
    balance: 'Optimism',
    weakness: 'Recklessness',
    hues: {
      strength: '#FF8C00',
      balance: '#FFA500',
      weakness: '#CD5C5C'
    }
  }
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getZodiac(month, day) {
  const md = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  for (const z of ZODIACS) {
    if (z.start <= z.end) {
      if (md >= z.start && md <= z.end) {
        return z;
      }
    } else {
      if (md >= z.start || md <= z.end) {
        return z;
      }
    }
  }

  return null;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');

  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map(v => {
        const h = v.toString(16);
        return h.length === 1 ? '0' + h : h;
      })
      .join('')
  );
}

function blendColors(colors) {
  let r = 0;
  let g = 0;
  let b = 0;

  colors.forEach(color => {
    const rgb = hexToRgb(color);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;
  });

  r = Math.floor(r / colors.length);
  g = Math.floor(g / colors.length);
  b = Math.floor(b / colors.length);

  return rgbToHex(r, g, b);
}

function applyTimeWeight(hex) {
  const now = new Date();

  const seconds =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds();

  const weight = seconds / 86400;

  const rgb = hexToRgb(hex);

  const adjusted = {
    r: Math.min(255, Math.floor(rgb.r * (0.8 + weight * 0.4))),
    g: Math.min(255, Math.floor(rgb.g * (0.8 + weight * 0.4))),
    b: Math.min(255, Math.floor(rgb.b * (0.8 + weight * 0.4)))
  };

  return rgbToHex(adjusted.r, adjusted.g, adjusted.b);
}

function generateHueName() {
  const prefixes = [
    'Burnt',
    'Solar',
    'Dust',
    'Molten',
    'Velvet',
    'Frost',
    'Eclipse',
    'Deep',
    'Silent',
    'Radiant'
  ];

  const suffixes = [
    'Indigo',
    'Crimson',
    'Amber',
    'Teal',
    'Violet',
    'Gold',
    'Blue',
    'Rose',
    'Emerald',
    'Obsidian'
  ];

  return (
    prefixes[Math.floor(Math.random() * prefixes.length)] +
    ' ' +
    suffixes[Math.floor(Math.random() * suffixes.length)]
  );
}

/*
|--------------------------------------------------------------------------
| Generate AuraScope
|--------------------------------------------------------------------------
*/

app.post('/generate', (req, res) => {
  try {
    const { birthdate } = req.body;

    if (!birthdate) {
      return res.status(400).json({
        error: 'Birthdate required'
      });
    }

    const date = new Date(birthdate);

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const zodiac = getZodiac(month, day);

    if (!zodiac) {
      return res.status(400).json({
        error: 'Unable to calculate zodiac'
      });
    }

    const combined = blendColors([
      zodiac.hues.strength,
      zodiac.hues.balance,
      zodiac.hues.weakness
    ]);

    const weightedHue = applyTimeWeight(combined);

    const hueName = generateHueName();

    const spectrumPosition = crypto.randomInt(0, 360);

    res.json({
      success: true,

      zodiac: zodiac.sign,

      traits: {
        strength: zodiac.strength,
        balance: zodiac.balance,
        weakness: zodiac.weakness
      },

      subHues: {
        strength: zodiac.hues.strength,
        balance: zodiac.hues.balance,
        weakness: zodiac.hues.weakness
      },

      firstHue: {
        name: hueName,
        hex: weightedHue,
        spectrumPosition
      },

      lore: {
        strength:
          `${zodiac.strength} forms the outward resonance of your spectrum.`,

        balance:
          `${zodiac.balance} stabilizes the emotional center of your hue.`,

        weakness:
          `${zodiac.weakness} creates shadow-frequency contrast within your spectrum.`
      }
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

/*
|--------------------------------------------------------------------------
| Email Reading
|--------------------------------------------------------------------------
*/

app.post('/email-reading', async (req, res) => {
  try {

    const {
      email,
      zodiac,
      firstHue,
      traits
    } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required'
      });
    }

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: `Your AuraScope Reading`,
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h1>Your AuraScope Reading</h1>

          <h2>${firstHue.name}</h2>

          <div
            style="
              width:120px;
              height:120px;
              border-radius:50%;
              background:${firstHue.hex};
              margin-bottom:20px;
            "
          ></div>

          <p><strong>Zodiac:</strong> ${zodiac}</p>

          <p><strong>Strength:</strong> ${traits.strength}</p>
          <p><strong>Balance:</strong> ${traits.balance}</p>
          <p><strong>Weakness:</strong> ${traits.weakness}</p>

          <hr>

          <p>
            Your First Hue emerged from the harmonic blend
            of your zodiac spectrum and temporal resonance.
          </p>

          <p>
            This reading reflects the opening position
            of your evolving AuraScope journey.
          </p>
        </div>
      `
    });

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Unable to send email'
    });
  }
});

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

app.get('/health', (req, res) => {
  res.json({
    ok: true
  });
});

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log(`AuraScope running on port ${PORT}`);
});

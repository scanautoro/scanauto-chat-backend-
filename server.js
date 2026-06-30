// server.js - Backend pentru chat-ul scanauto.ro cu Gemini
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// CORS - permite cereri DOAR de pe scanauto.ro (schimbă dacă ai alt domeniu/subdomeniu)
app.use(cors({
  origin: ['https://scanauto.ro', 'https://www.scanauto.ro'],
}));

// Cheia API stă AICI, pe server, ascunsă (vezi pasul de configurare .env / variabile de mediu)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash'; // poți schimba modelul dacă vrei

// Mesaj de sistem - personalizează-l cu informații despre scanauto.ro
const SYSTEM_PROMPT = `Ești asistentul virtual al scanauto.ro, un site/service auto.
Răspunde scurt, prietenos și la obiect, în limba română.
Dacă nu știi un răspuns specific despre prețuri, programări sau servicii exacte,
recomandă vizitatorului să sune sau să trimită un mesaj direct prin formularul de contact.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mesaj lipsă sau invalid.' });
    }

    // Construim istoricul conversației (opțional, trimis de pe frontend)
    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.text }],
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Eroare Gemini:', data);
      return res.status(502).json({ error: 'Eroare la comunicarea cu Gemini.' });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Îmi pare rău, nu am putut genera un răspuns. Încercați din nou.';

    res.json({ reply });
  } catch (err) {
    console.error('Eroare server:', err);
    res.status(500).json({ error: 'Eroare internă a serverului.' });
  }
});

app.get('/', (req, res) => res.send('Scanauto chat backend funcționează ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server pornit pe portul ${PORT}`));

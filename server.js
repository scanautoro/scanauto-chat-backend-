// server.js - Backend pentru chat-ul scanauto.ro cu Gemini
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// CORS - permite cereri de pe scanauto.ro si subdomeniul asistent.scanauto.ro
app.use(cors({
  origin: ['https://scanauto.ro', 'https://www.scanauto.ro', 'https://asistent.scanauto.ro'],
}));

// Cheia API sta AICI, pe server, ascunsa (vezi pasul de configurare .env / variabile de mediu)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash'; // poti schimba modelul daca vrei

// Mesaj de sistem - personalizeaza-l cu informatii despre scanauto.ro
const SYSTEM_PROMPT = `Esti asistentul virtual al scanauto.ro, un site/service auto.
Raspunde scurt, prietenos si la obiect, in limba romana.
Daca nu stii un raspuns specific despre preturi, programari sau servicii exacte,
recomanda vizitatorului sa sune sau sa trimita un mesaj direct prin formularul de contact.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mesaj lipsa sau invalid.' });
    }

    // Construim istoricul conversatiei (optional, trimis de pe frontend)
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
      'Imi pare rau, nu am putut genera un raspuns. Incercati din nou.';

    res.json({ reply });
  } catch (err) {
    console.error('Eroare server:', err);
    res.status(500).json({ error: 'Eroare interna a serverului.' });
  }
});

app.get('/', (req, res) => res.send('Scanauto chat backend functioneaza'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server pornit pe portul ${PORT}`));

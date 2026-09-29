import express from 'express';
import { generateAndCompileFullEbook } from './scriptSmithCore.js';
import fs from 'fs';

const app = express();
app.use(express.json());

app.post('/api/create-full-ebook', async (req, res) => {
  try {
    const { title, topic, options } = req.body;
    if (!title || !topic) {
      return res.status(400).json({ status: 'error', message: 'Título e tópico são obrigatórios.' });
    }
    const result = await generateAndCompileFullEbook(title, topic, options || {});
    res.json({ status: 'success', message: 'E-book gerado e compilado com sucesso!', pdfPath: result.pdfPath });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/download-ebook', (req, res) => {
  const pdfPath = './ebook_output.pdf';
  if (fs.existsSync(pdfPath)) {
    res.download(pdfPath, 'ebook_output.pdf');
  } else {
    res.status(404).json({ status: 'error', message: 'Nenhum PDF encontrado. Gere um e-book primeiro.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✍️ ScriptSmith-AI rodando na porta ${PORT} com pipeline completo e download ativados`);
});

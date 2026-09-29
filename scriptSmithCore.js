import { GoogleGenAI } from '@google/genai';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';

const execPromise = util.promisify(exec);

// Sistema de rotação/múltiplas chaves (lê da env KEYS ou usa a principal)
const getAiClient = () => {
  const keysEnv = process.env.GEMINI_KEYS || process.env.GEMINI_API_KEY || "";
  const keys = keysEnv.split(',').map(k => k.trim()).filter(Boolean);
  const activeKey = keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : undefined;
  return new GoogleGenAI({ apiKey: activeKey });
};

export async function generateBookContent(title, topic, customPrompt) {
  const ai = getAiClient();
  try {
    const prompt = customPrompt || `Crie o conteúdo completo para um e-book técnico intitulado "${title}" sobre o tópico "${topic}". Forneça uma estrutura detalhada dividida em capítulos.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return response.text;
  } catch (err) {
    console.warn("Aviso: Quota excedida ou erro na IA. A usar conteúdo de contingência local.", err.message);
    return `# Capítulo 1: Introdução ao ${title}\n\nConteúdo gerado por contingência local devido a limite de API.\n\n# Capítulo 2: Desenvolvimento Avançado de ${topic}\n\nConceitos práticos executados diretamente no ecossistema Termux.`;
  }
}

export async function generateAndCompileFullEbook(title, topic, options = {}) {
  const textContent = await generateBookContent(title, topic, options.customPrompt);
  const mdPath = './ebook_content.md';
  const pdfPath = './ebook_output.pdf';
  fs.writeFileSync(mdPath, `# ${title}\n\n${topic}\n\n${textContent}`);

  const margin = options.margin || 72;
  const fontSize = options.fontSize || 10;

  const pyScript = `
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

doc = SimpleDocTemplate("${pdfPath}", pagesize=letter, rightMargin=${margin}, leftMargin=${margin}, topMargin=${margin}, bottomMargin=${margin})
story = []
styles = getSampleStyleSheet()

custom_normal = ParagraphStyle(
    'CustomNormal',
    parent=styles['Normal'],
    fontSize=${fontSize},
    leading=${fontSize + 4}
)

with open("${mdPath}", "r", encoding="utf-8") as f:
    text = f.read()

for line in text.split('\\n'):
    if line.startswith('# '):
        story.append(Paragraph(line[2:], styles['Title']))
        story.append(Spacer(1, 12))
    elif line.strip():
        story.append(Paragraph(line, custom_normal))
        story.append(Spacer(1, 8))

doc.build(story)
`;

  const pyPath = './build_pdf.py';
  fs.writeFileSync(pyPath, pyScript);
  await execPromise(`python ${pyPath}`);

  return { success: true, pdfPath };
}

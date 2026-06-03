/**
 * Detect when the user is asking the chat agents to generate an image.
 * The chat agents can't do this — we route them to /generate-image instead
 * of letting all 7 agents reply with "I can't generate images".
 */

// Multilingual verbs + image nouns. Kept intentionally broad but anchored.
const IMAGE_VERBS = [
  // English
  'generate', 'create', 'make', 'draw', 'paint', 'render', 'design', 'produce',
  // French
  'génère', 'genere', 'crée', 'cree', 'dessine', 'fais', 'fais-moi', 'fabrique',
  // Spanish
  'genera', 'crea', 'dibuja', 'haz', 'pinta',
  // German
  'erstelle', 'erzeuge', 'zeichne', 'male',
  // Italian
  'genera', 'crea', 'disegna', 'fai',
  // Portuguese
  'gere', 'crie', 'desenhe', 'faça',
  // Arabic (common phrasing)
  'أنشئ', 'ارسم', 'اصنع', 'انشئ',
  // Russian
  'создай', 'нарисуй', 'сгенерируй',
];

const IMAGE_NOUNS = [
  'image', 'images', 'picture', 'pictures', 'pic', 'photo', 'photos',
  'illustration', 'illustrations', 'drawing', 'painting', 'artwork', 'logo', 'icon',
  // French
  'imagen', 'imagenes', 'dessin', 'peinture', 'logo',
  // Spanish
  'imagen', 'imágenes', 'foto', 'dibujo',
  // German
  'bild', 'bilder', 'foto', 'zeichnung',
  // Italian
  'immagine', 'immagini', 'disegno', 'foto',
  // Portuguese
  'imagem', 'imagens', 'desenho', 'foto',
  // Arabic
  'صورة', 'صور', 'رسم',
  // Russian
  'картинку', 'картинка', 'изображение', 'фото',
];

export const isImageGenerationIntent = (text: string): boolean => {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  if (lower.length > 400) return false; // long prompts are unlikely "please generate X"

  const hasVerb = IMAGE_VERBS.some(v => lower.includes(v.toLowerCase()));
  const hasNoun = IMAGE_NOUNS.some(n => lower.includes(n.toLowerCase()));

  return hasVerb && hasNoun;
};

export const IMAGE_ROUTING_REPLY = `🎨 Image generation lives on a dedicated page — chat agents can't render images inline.

👉 **[Open the Image Generator](/generate-image)** to create images with DALL·E, Gemini, or Grok.

Paste your prompt there and you'll get an image in seconds.`;

export interface ImageModelOption {
  id: string;
  label: string;
  provider: string;
  cost: number;
  description: string;
}

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  { id: 'gemini-image', label: 'Gemini 2.5 Flash Image', provider: 'Google', cost: 15, description: 'Fast & cheap' },
  { id: 'grok-aurora', label: 'Grok Aurora', provider: 'xAI', cost: 25, description: 'Bold & playful' },
  { id: 'qwen-image', label: 'Qwen Wanx', provider: 'Alibaba', cost: 20, description: 'Vivid & detailed' },
  { id: 'gpt-image-1', label: 'GPT-Image-1', provider: 'OpenAI', cost: 30, description: 'Efficient OpenAI' },
  { id: 'gemini-pro-image', label: 'Gemini 3 Pro Image', provider: 'Google', cost: 35, description: 'Higher quality' },
  { id: 'dall-e-3', label: 'DALL·E 3', provider: 'OpenAI', cost: 40, description: 'Iconic & detailed' },
  { id: 'pollinations-flux', label: 'Pollinations FLUX', provider: 'Pollinations', cost: 10, description: 'Open-source FLUX' },
];

export const PROMPT_COLLAB_COST = 50;

export const IMAGE_PANEL_PLATFORM = 'image_panel';

export interface ImagePanelData {
  userPrompt: string;
  masterPrompt: string;
  proposals: Array<{ agent: string; name: string; proposal: string; error?: string }>;
  images: Array<{
    model: string;
    label: string;
    cost: number;
    url?: string;
    fileName?: string;
    success: boolean;
    error?: string;
  }>;
}

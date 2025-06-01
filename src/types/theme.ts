
export type ThemeVariant = 'amber-warm' | 'amber-cool' | 'amber-dark' | 'amber-minimal' | 'blue-cool';

export interface Theme {
  id: ThemeVariant;
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    background: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'amber-warm',
    name: 'Amber Warm',
    description: 'Rich golden ambers with warm undertones',
    preview: {
      primary: '#F59E0B',
      secondary: '#FED7AA',
      background: '#FFFBEB'
    }
  },
  {
    id: 'amber-cool',
    name: 'Amber Cool',
    description: 'Cool amber tones with blue-gray accents',
    preview: {
      primary: '#D97706',
      secondary: '#E5E7EB',
      background: '#F8FAFC'
    }
  },
  {
    id: 'amber-dark',
    name: 'Amber Dark',
    description: 'Deep amber palette for dark mode',
    preview: {
      primary: '#FBBF24',
      secondary: '#374151',
      background: '#111827'
    }
  },
  {
    id: 'amber-minimal',
    name: 'Amber Minimal',
    description: 'Clean minimal design with subtle amber accents',
    preview: {
      primary: '#F59E0B',
      secondary: '#F3F4F6',
      background: '#FFFFFF'
    }
  },
  {
    id: 'blue-cool',
    name: 'Blue Cool',
    description: 'Cool blue tones with modern aesthetics',
    preview: {
      primary: '#3B82F6',
      secondary: '#E0E7FF',
      background: '#F8FAFC'
    }
  }
];

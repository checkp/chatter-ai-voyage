
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'sans': ['Inter', 'system-ui', 'sans-serif'],
			},
			fontSize: {
				'xs': ['0.875rem', { lineHeight: '1.25rem' }],
				'sm': ['1rem', { lineHeight: '1.5rem' }],
				'base': ['1.125rem', { lineHeight: '1.75rem' }],
				'lg': ['1.25rem', { lineHeight: '1.875rem' }],
				'xl': ['1.375rem', { lineHeight: '2rem' }],
				'2xl': ['1.625rem', { lineHeight: '2.25rem' }],
				'3xl': ['2rem', { lineHeight: '2.5rem' }],
				'4xl': ['2.5rem', { lineHeight: '3rem' }],
			},
			colors: {
				// Pastel Amber-Green color palette
				pastel: {
					bg: '#FEFDF8',           // Very light amber-white
					surface: '#FBF9F0',      // Light amber surface
					primary: '#D4B886',      // Soft amber
					secondary: '#C8D4A3',    // Sage green
					accent: '#B8C99C',       // Muted green
					success: '#A8D4A8',      // Soft green
					warning: '#F5E6B8',      // Pale amber warning
					danger: '#E8C5C5',       // Soft pink-red
					text: '#3D4A2E',         // Dark green-brown
					muted: '#6B7A5C',        // Muted green-gray
				},
				// Agent-specific pastel amber-green colors
				agent: {
					openai: '#8FBC8F',       // Dark Sea Green
					anthropic: '#98D982',    // Light Green
					deepseek: '#87CEEB',     // Sky Blue with green tint
					grok: '#DDA0DD',         // Plum with green undertone
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pastel-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 10px rgba(179, 217, 242, 0.4), 0 0 20px rgba(179, 217, 242, 0.2)'
					},
					'50%': { 
						boxShadow: '0 0 20px rgba(179, 217, 242, 0.6), 0 0 40px rgba(179, 217, 242, 0.3)'
					}
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-4px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pastel-glow': 'pastel-glow 3s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

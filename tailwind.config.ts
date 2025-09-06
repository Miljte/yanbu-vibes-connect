
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
				'sans': ['Inter', 'Poppins', 'system-ui', '-apple-system', 'sans-serif'],
				'arabic': ['Noto Kufi Arabic', 'Tajawal', 'Cairo', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
				'display': ['Anton', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
				'body': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
				'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					light: 'hsl(var(--primary-light))',
					vibrant: 'hsl(var(--primary-vibrant))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					light: 'hsl(var(--secondary-light))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					light: 'hsl(var(--muted-light))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					vibrant: 'hsl(var(--accent-vibrant))',
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
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				// Modern gradient colors
				gradient: {
					from: '#667eea',
					via: '#764ba2',
					to: '#f093fb',
				},
				// Glass morphism colors
				glass: {
					light: 'rgba(255, 255, 255, 0.1)',
					dark: 'rgba(0, 0, 0, 0.1)',
					border: 'rgba(255, 255, 255, 0.18)',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: 'var(--radius-lg)',
				'2xl': 'var(--radius-xl)',
				'3xl': '2.5rem',
			},
			borderWidth: {
				'3': '3px',
				'5': '5px',
			},
			fontSize: {
				'2xs': ['0.625rem', { lineHeight: '0.75rem' }],
				'3xs': ['0.5rem', { lineHeight: '0.625rem' }],
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem',
				'144': '36rem',
			},
			backdropBlur: {
				xs: '2px',
				'4xl': '72px',
			},
			boxShadow: {
				'glass': '0 8px 32px rgba(31, 38, 135, 0.37)',
				'glass-lg': '0 15px 40px rgba(31, 38, 135, 0.45)',
				'modern': '0 4px 20px rgba(0, 0, 0, 0.1)',
				'modern-lg': '0 8px 30px rgba(0, 0, 0, 0.12)',
				'modern-xl': '0 12px 40px rgba(0, 0, 0, 0.15)',
				'glow': '0 0 20px rgba(99, 102, 241, 0.4)',
				'glow-lg': '0 0 40px rgba(99, 102, 241, 0.6)',
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
				'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
				'glass-gradient-dark': 'linear-gradient(135deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05))',
			},
			transitionTimingFunction: {
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
				'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
			},
			transitionDuration: {
				'400': '400ms',
				'600': '600ms',
				'800': '800ms',
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
				'fade-in-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-right': {
					'0%': {
						opacity: '0',
						transform: 'translateX(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'slide-in-left': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'slide-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-down': {
					'0%': {
						opacity: '0',
						transform: 'translateY(-30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.8)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'rotate-in': {
					'0%': {
						opacity: '0',
						transform: 'rotate(-10deg) scale(0.8)'
					},
					'100%': {
						opacity: '1',
						transform: 'rotate(0) scale(1)'
					}
				},
				'pulse-gps': {
					'0%, 100%': {
						opacity: '1',
						transform: 'scale(1)'
					},
					'50%': {
						opacity: '0.6',
						transform: 'scale(1.3)'
					}
				},
				'ripple': {
					'0%': {
						transform: 'scale(0.8)',
						opacity: '1'
					},
					'100%': {
						transform: 'scale(2.5)',
						opacity: '0'
					}
				},
				'bounce-soft': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-4px)'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-8px)'
					}
				},
				'shimmer': {
					'0%': {
						transform: 'translateX(-100%)'
					},
					'100%': {
						transform: 'translateX(100%)'
					}
				},
				'breath': {
					'0%, 100%': {
						transform: 'scale(1)',
						opacity: '1'
					},
					'50%': {
						transform: 'scale(1.05)',
						opacity: '0.8'
					}
				},
				'glow': {
					'0%, 100%': {
						boxShadow: '0 0 5px currentColor'
					},
					'50%': {
						boxShadow: '0 0 20px currentColor, 0 0 30px currentColor'
					}
				},
				'stripe': {
					'0%': {
						backgroundPosition: '0 0'
					},
					'100%': {
						backgroundPosition: '20px 0'
					}
				},
				'shine': {
					'0%': {
						transform: 'translateX(-100%) skewX(-12deg)'
					},
					'100%': {
						transform: 'translateX(200%) skewX(-12deg)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in-up': 'fade-in-up 0.5s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-in-left': 'slide-in-left 0.3s ease-out',
				'slide-up': 'slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-down': 'slide-down 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
				'scale-in': 'scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'rotate-in': 'rotate-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
				'pulse-gps': 'pulse-gps 2s infinite',
				'ripple': 'ripple 2s infinite',
				'bounce-soft': 'bounce-soft 1s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite',
				'shimmer': 'shimmer 2s infinite',
				'breath': 'breath 4s ease-in-out infinite',
				'glow': 'glow 2s ease-in-out infinite',
				'stripe': 'stripe 1s linear infinite',
				'shine': 'shine 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

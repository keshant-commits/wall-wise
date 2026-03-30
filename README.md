<div align="center">

# WallWise

### AI-Powered Floor Plan Intelligence

*Upload a floor plan. Get a 3D model, material recommendations, and structural analysis — instantly.*

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_AI-F55036?style=for-the-badge&logo=groq&logoColor=white)

</div>

---

## What is WallWise?

WallWise is an AI-powered web application built for the **Hackathon 2026 — Autonomous Structural Intelligence System** challenge. It takes a floor plan image, analyses it using computer vision and large language models, reconstructs it as an interactive 3D model, and recommends optimal construction materials — all in under 30 seconds.

---

## Live Demo

> Coming soon — deployment in progress

---

## The 5-Stage Pipeline

```
Floor Plan Image
       ↓
┌─────────────────────────────────────────────────────────────┐
│  Stage 1 — Floor Plan Parser                                │
│  OpenCV detects walls, rooms, and openings.                 │
│  Outputs precise coordinates in JSON format.                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Stage 2 — Geometry Reconstruction                          │
│  Wall segments converted into a graph structure.            │
│  Walls classified as load-bearing or partition.             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Stage 3 — 3D Model Generation                              │
│  Walls extruded to 3m height using Three.js.                │
│  Interactive browser viewer with OrbitControls.             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Stage 4 — Material Analysis                                │
│  AI recommends materials using weighted formula:            │
│  cost × strength × durability per wall type.                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Stage 5 — Explainability                                   │
│  LLM generates plain-English structural report              │
│  with cost estimates and span-length analysis.              │
└─────────────────────────────────────────────────────────────┘
                           ↓
          Clean Report + 3D Model + PDF Export
```

---

## Features

| Feature | Description |
|---|---|
| **AI Floor Plan Analysis** | Upload any floor plan image — Llama 3.2 Vision reads it and extracts all rooms with coordinates |
| **Interactive 3D Model** | Walls extruded to full height, colour-coded by room type, click-to-inspect any room |
| **Material Recommendations** | Ranked materials per wall type with cost/strength/durability scores |
| **Structural Report** | AI-generated analysis citing actual measurements, span lengths, and structural concerns |
| **Cost Estimation** | Itemised cost breakdown in INR for load-bearing walls, partitions, and floor slab |
| **PDF Export** | One-click download of the full analysis report |
| **AI Chatbot** | Ask construction questions or describe a floor plan and get it generated in real time |
| **Multi-format Support** | PNG, JPG, BMP, and PDF floor plans all supported |
| **Responsive Design** | Works on desktop, tablet, and mobile |

---

## Screenshots

> Add screenshots here after deployment

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.0 | Full-stack React framework |
| React | 19.2.4 | UI component library |
| TypeScript | 5.7.3 | Type-safe JavaScript |
| Tailwind CSS | 4.2.0 | Utility-first styling |
| shadcn/ui | latest | Pre-built UI components |
| Three.js | 0.170.0 | Interactive 3D floor plan viewer |
| Recharts | 2.15.0 | Material score charts |

### AI & Backend
| Technology | Purpose |
|---|---|
| Groq API | Ultra-fast LLM inference (10x faster than OpenAI) |
| Llama 3.2 90B Vision | Reads and analyses floor plan images |
| Llama 3.1 8B Instant | Powers the AI construction chatbot |
| Zod | Validates and enforces AI JSON output schema |

### Utilities
| Technology | Purpose |
|---|---|
| jsPDF + html2canvas | PDF report generation and download |
| React Hook Form | Upload form handling and validation |
| Sonner | Toast notification system |
| pnpm | Fast, efficient package manager |

---

## Project Structure

```
wall-wise/
├── app/
│   ├── page.tsx                          ← Main homepage
│   ├── layout.tsx                        ← App shell, fonts, theme
│   ├── globals.css                       ← Global styles
│   └── api/
│       ├── analyze-floorplan/
│       │   └── route.ts                  ← Llama Vision AI endpoint
│       └── chat/
│           └── route.ts                  ← Chatbot AI endpoint
│
├── components/
│   ├── ui/                               ← shadcn/ui components
│   └── wallwise/
│       ├── hero-section.tsx              ← Landing page hero
│       ├── pipeline-section.tsx          ← 5-stage pipeline display
│       ├── upload-section.tsx            ← File upload + AI analysis
│       ├── results-section.tsx           ← 4-tab results view
│       ├── floor-plan-svg.tsx            ← SVG floor plan renderer
│       ├── three-d-viewer.tsx            ← Three.js 3D model viewer
│       ├── materials-tab.tsx             ← Material recommendations
│       ├── ai-explanation-tab.tsx        ← Structural analysis report
│       ├── ai-chatbot.tsx                ← Floating AI assistant
│       ├── pdf-generator.tsx             ← PDF export
│       ├── stats-section.tsx             ← Animated counters
│       ├── technology-section.tsx        ← Tech stack display
│       ├── team-section.tsx              ← Team members
│       └── footer.tsx                    ← Footer
│
├── stage1_parser/                        ← Python floor plan parser
│   ├── floor_plan_parser.py              ← Main CV pipeline
│   ├── verify_stage1.py                  ← Output verifier
│   ├── check_json_accuracy.py            ← JSON accuracy checker
│   ├── requirements.txt                  ← Python dependencies
│   ├── sample_inputs/                    ← Test floor plan images
│   └── outputs/                          ← JSON + reconstructed maps
│
├── .env.local                            ← API keys (never committed)
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm
- A Groq API key — free at [console.groq.com](https://console.groq.com)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/keshant-commits/wall-wise.git
cd wall-wise
```

**2. Install dependencies**
```bash
pnpm install
# or
npm install
```

**3. Set up environment variables**

Create a `.env.local` file in the project root:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_KEY_CHAT=your_groq_api_key_here
```

Get your free API key at [console.groq.com](https://console.groq.com)

**4. Start the development server**
```bash
pnpm dev
# or
npm run dev
```

**5. Open in browser**
```
http://localhost:3000
```

---

## Python Parser Setup (Stage 1)

The Python floor plan parser runs independently from the web app.

```bash
cd stage1_parser

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run the parser on all 3 sample plans
python floor_plan_parser.py

# Verify output
python verify_stage1.py
python check_json_accuracy.py
```

### Python Requirements
```
opencv-python==4.9.0.80
numpy==1.26.4
matplotlib==3.8.4
shapely==2.0.3
```

---

## How It Works

### Uploading a Floor Plan

1. Drag and drop any floor plan image onto the upload zone
2. Enter your plot area and dimensions
3. Click Analyse — the AI processes the image in about 10 seconds
4. Results appear in 4 tabs: Floor Plan, 3D Model, Materials, AI Explanation

### Using the AI Chatbot

Click the chat bubble in the bottom-right corner. You can:
- Ask any construction or architecture question
- Say "Generate a 2BHK floor plan for 1000 sqft" and it will draw one live
- Ask about material costs, structural concerns, or building regulations

### Exporting Results

Click **Download PDF** in the AI Explanation tab to export the full structural analysis report.

---

## Material Scoring Formula

Materials are scored using a weighted formula that differs by wall type:

**Load-bearing walls:**
```
score = (0.3 × cost_score) + (0.5 × strength_score) + (0.2 × durability_score)
```

**Partition walls:**
```
score = (0.5 × cost_score) + (0.3 × strength_score) + (0.2 × durability_score)
```

Scores range from 0 to 1. Green badge = above 0.8, Amber = 0.6–0.8, Red = below 0.6.

---

## Available Scripts

```bash
pnpm dev        # Start development server at localhost:3000
pnpm build      # Build for production
pnpm start      # Run production build
pnpm lint       # Run ESLint
```

---

## Team

| Member | Role |
|---|---|
| Person A | Stage 1 — Floor Plan Parser (OpenCV + Python) |
| Person B | Stage 3 — 3D Model Generator (Three.js) |
| Person C | Stage 4 — Material Analysis Engine |
| Person D | Stage 5 — AI Explainer + Full Stack Integration |

---

## Hackathon

Built for **Hackathon 2026** — AI/ML Track  
Problem Statement: **Autonomous Structural Intelligence System**  
Duration: 36 Hours  

---

## License

This project was built for hackathon purposes. All rights reserved.

---

<div align="center">

Made with focus and caffeine in 36 hours

**WallWise — Autonomous Structural Intelligence System**

</div>

"use client"

import { useState, useRef } from "react"
import { HeroSection } from "@/components/wallwise/hero-section"
import { PipelineSection } from "@/components/wallwise/pipeline-section"
import { UploadSection, type PlotData, type RoomConfig } from "@/components/wallwise/upload-section"
import { ResultsSection } from "@/components/wallwise/results-section"
import { StatsSection } from "@/components/wallwise/stats-section"
import { TechnologySection } from "@/components/wallwise/technology-section"
import { TeamSection } from "@/components/wallwise/team-section"
import { Footer } from "@/components/wallwise/footer"
import { AIChatbot } from "@/components/wallwise/ai-chatbot"

export default function WallWisePage() {
  const [showResults, setShowResults] = useState(false)
  const [plotData, setPlotData] = useState<PlotData | null>(null)
  const [resetTrigger, setResetTrigger] = useState(0)
  const uploadRef = useRef<HTMLElement>(null)
  const resultsRef = useRef<HTMLElement>(null)

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  

  const handleProcessingComplete = (data: PlotData) => {
    setPlotData(data)
    setShowResults(true)
    // Scroll to results after a short delay
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleReset = () => {
    setShowResults(false)
    setPlotData(null)
    setResetTrigger(prev => prev + 1) // Trigger reset in UploadSection
    // Scroll to upload section
    setTimeout(() => {
      uploadRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Handle AI-generated floor plan
  const handleAIGenerateFloorPlan = (planType: string, rooms: RoomConfig[], area: number) => {
    // Calculate dimensions based on area (assuming square-ish plot)
    const aspectRatio = 1.2 // Slightly rectangular
    const width = Math.sqrt(area * aspectRatio)
    const length = area / width

    const newPlotData: PlotData = {
      area: area,
      unit: "sqft",
      width: width,
      length: length,
      displayUnit: "sq. ft",
      rooms: rooms,
      planType: planType,
      aiAnalyzed: true,
      confidence: 95
    }

    setPlotData(newPlotData)
    setShowResults(true)
    
    // Scroll to results after a short delay
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-[#2a2a35]/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#" className="text-xl font-bold">
            <span className="bg-gradient-to-r from-[#0F6E56] to-[#534AB7] bg-clip-text text-transparent">
              WallWise
            </span>
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-[#888780] hover:text-[#e8e6de] transition-colors">
              How it Works
            </a>
            <a href="#upload" className="text-sm text-[#888780] hover:text-[#e8e6de] transition-colors">
              Upload
            </a>
            {showResults && (
              <a href="#results" className="text-sm text-[#888780] hover:text-[#e8e6de] transition-colors">
                Results
              </a>
            )}
            <a href="#technology" className="text-sm text-[#888780] hover:text-[#e8e6de] transition-colors">
              Technology
            </a>
            <a href="#team" className="text-sm text-[#888780] hover:text-[#e8e6de] transition-colors">
              Team
            </a>
          </div>
          <button 
            onClick={scrollToUpload}
            className="px-4 py-2 bg-[#0F6E56] text-white rounded-lg text-sm font-medium hover:bg-[#0F6E56]/90 transition-all hover:shadow-lg hover:shadow-[#0F6E56]/25"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <HeroSection onUploadClick={scrollToUpload} />

      {/* Pipeline */}
      <PipelineSection />

      {/* Upload */}
      <UploadSection 
        uploadRef={uploadRef}
        onProcessingComplete={handleProcessingComplete}
        resetTrigger={resetTrigger}
      />

      {/* Results (shown after processing) */}
      {showResults && plotData && (
        <>
          <ResultsSection resultsRef={resultsRef} plotData={plotData} onReset={handleReset} />
          <StatsSection />
        </>
      )}

      {/* Technology */}
      <TechnologySection />

      {/* Team */}
      <TeamSection />

      {/* Footer */}
      <Footer />

      {/* AI Chatbot */}
      <AIChatbot onGenerateFloorPlan={handleAIGenerateFloorPlan} />
    </main>
  )
}

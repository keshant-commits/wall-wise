"use client"

import { useState, useEffect, useRef } from "react"
import { FloorPlanSVG } from "./floor-plan-svg"
import { ThreeDViewer } from "./three-d-viewer"
import { MaterialsTab } from "./materials-tab"
import { AIExplanationTab } from "./ai-explanation-tab"
import { FileText, Box, Layers, Sparkles, X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDFGenerator } from "./pdf-generator"
import type { PlotData } from "./upload-section"

const tabs = [
  { id: "floorplan", label: "Floor Plan", icon: FileText },
  { id: "3d", label: "3D Model", icon: Box },
  { id: "materials", label: "Materials", icon: Layers },
  { id: "ai", label: "AI Explanation", icon: Sparkles }
]

interface ResultsSectionProps {
  resultsRef: React.RefObject<HTMLElement | null>
  plotData: PlotData
  onReset: () => void
}

export function ResultsSection({ resultsRef, plotData, onReset }: ResultsSectionProps) {
  const [activeTab, setActiveTab] = useState("floorplan")
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Calculate room areas based on plot data
  const totalArea = plotData.area
  const livingRoomArea = Math.round(totalArea * 0.28 * 10) / 10
  const masterBedroomArea = Math.round(totalArea * 0.21 * 10) / 10
  const bedroom2Area = Math.round(totalArea * 0.19 * 10) / 10
  const kitchenArea = Math.round(totalArea * 0.12 * 10) / 10
  const bathroomArea = Math.round(totalArea * 0.06 * 10) / 10

  const roomAreas = {
    livingRoom: livingRoomArea,
    masterBedroom: masterBedroomArea,
    bedroom2: bedroom2Area,
    kitchen: kitchenArea,
    bathroom: bathroomArea,
    unit: plotData.displayUnit
  }

  return (
    <section 
      ref={(el) => {
        (sectionRef as React.MutableRefObject<HTMLElement | null>).current = el
        if (resultsRef && 'current' in resultsRef) {
          (resultsRef as React.MutableRefObject<HTMLElement | null>).current = el
        }
      }}
      className="py-24 px-4 bg-[#0a0a0f]" 
      id="results"
    >
      <div className={`max-w-6xl mx-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Section Header */}
        <div className="text-center mb-12 relative">
          {/* Action Buttons - Top Right */}
          <div className="absolute top-0 right-0 flex items-center gap-3">
            <PDFGenerator plotData={plotData} />
            <Button
              onClick={onReset}
              variant="outline"
              className="border-[#E07B54] text-[#E07B54] hover:bg-[#E07B54]/10 hover:text-[#E07B54] gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Analyse New Plan
            </Button>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0F6E56]/30 bg-[#0F6E56]/10 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#0F6E56] animate-pulse" />
            <span className="text-sm text-[#0F6E56] font-medium">ANALYSIS COMPLETE</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-[#e8e6de]">
            Results
          </h2>
          <p className="text-[#888780] text-lg">
            Plot Area: <span className="text-[#e8e6de] font-semibold">{plotData.area.toLocaleString()} {plotData.displayUnit}</span>
            <span className="mx-2">|</span>
            Dimensions: <span className="text-[#e8e6de] font-semibold">{plotData.width} x {plotData.length} ft</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-[#0F6E56] text-white shadow-lg shadow-[#0F6E56]/25' 
                    : 'bg-[#12121a] text-[#888780] hover:bg-[#1a1a24] hover:text-[#e8e6de] border border-[#2a2a35]'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-[#12121a] rounded-2xl p-6 border border-[#2a2a35]">
          {activeTab === "floorplan" && (
            <div className="animate-fade-in-up">
              <FloorPlanSVG plotData={plotData} roomAreas={roomAreas} />
            </div>
          )}
          {activeTab === "3d" && (
            <div className="animate-fade-in-up">
              <ThreeDViewer plotData={plotData} />
            </div>
          )}
          {activeTab === "materials" && (
            <div className="animate-fade-in-up">
              <MaterialsTab plotData={plotData} roomAreas={roomAreas} />
            </div>
          )}
          {activeTab === "ai" && (
            <div className="animate-fade-in-up">
              <AIExplanationTab plotData={plotData} roomAreas={roomAreas} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

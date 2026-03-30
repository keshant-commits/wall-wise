"use client"

import { useEffect, useRef, useState } from "react"
import { ScanLine, GitBranch, Box, Layers, FileText, ArrowRight } from "lucide-react"

const stages = [
  {
    id: 1,
    title: "Floor Plan Parser",
    icon: ScanLine,
    color: "#0F6E56",
    description: "OpenCV detects walls, rooms, and openings from your floor plan image. Outputs precise coordinates in JSON format."
  },
  {
    id: 2,
    title: "Geometry Reconstruction",
    icon: GitBranch,
    color: "#534AB7",
    description: "Wall segments are converted into a graph structure. Walls classified as load-bearing or partition."
  },
  {
    id: 3,
    title: "3D Model Generation",
    icon: Box,
    color: "#BA7517",
    description: "Walls extruded to 3m height using Three.js. Interactive browser-based 3D viewer with OrbitControls."
  },
  {
    id: 4,
    title: "Material Analysis",
    icon: Layers,
    color: "#E07B54",
    description: "AI recommends optimal materials per wall type using weighted cost × strength × durability formula."
  },
  {
    id: 5,
    title: "Explainability",
    icon: FileText,
    color: "#3B82F6",
    description: "LLM generates plain-English explanations citing actual span lengths and structural concerns."
  }
]

export function PipelineSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-[#0a0a0f]" id="how-it-works">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-[#e8e6de]">
            5-Stage AI Pipeline
          </h2>
          <p className="text-[#888780] text-lg max-w-2xl mx-auto">
            From floor plan to intelligent analysis in seconds
          </p>
        </div>

        {/* Pipeline Cards */}
        <div className="relative">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0F6E56] via-[#534AB7] to-[#3B82F6] transform -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
            {stages.map((stage, index) => {
              const Icon = stage.icon
              return (
                <div
                  key={stage.id}
                  className={`relative transition-all duration-700 ${
                    isVisible 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Arrow connector - Mobile/Tablet */}
                  {index < stages.length - 1 && (
                    <div className="lg:hidden flex justify-center my-4">
                      <ArrowRight className="w-6 h-6 text-[#888780] rotate-90 md:rotate-0" />
                    </div>
                  )}

                  {/* Card */}
                  <div 
                    className="relative bg-[#12121a] rounded-xl p-6 border border-[#2a2a35] hover:border-opacity-50 transition-all duration-300 hover:shadow-lg group h-full"
                    style={{ 
                      borderTopColor: stage.color,
                      borderTopWidth: '3px',
                      ['--hover-shadow' as string]: `0 10px 40px -10px ${stage.color}40`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 10px 40px -10px ${stage.color}40`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {/* Stage Number */}
                    <div 
                      className="absolute -top-3 left-6 px-2 py-0.5 rounded text-xs font-bold"
                      style={{ backgroundColor: stage.color, color: '#0a0a0f' }}
                    >
                      Stage {stage.id}
                    </div>

                    {/* Icon */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${stage.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: stage.color }} />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold mb-2 text-[#e8e6de]">{stage.title}</h3>

                    {/* Description */}
                    <p className="text-sm text-[#888780] leading-relaxed">
                      {stage.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

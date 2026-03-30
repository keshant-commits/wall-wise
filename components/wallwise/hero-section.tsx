"use client"

import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

interface HeroSectionProps {
  onUploadClick: () => void
}

export function HeroSection({ onUploadClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Blueprint Grid Background */}
      <div className="absolute inset-0 blueprint-grid opacity-50" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/50 to-[#0a0a0f]" />
      
      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-[#0F6E56]/20 rotate-45 animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 border border-[#534AB7]/20 rotate-12 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 border border-[#BA7517]/20 -rotate-12 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Logo/Brand */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0F6E56]/30 bg-[#0F6E56]/10">
          <div className="w-2 h-2 rounded-full bg-[#0F6E56] animate-pulse" />
          <span className="text-sm text-[#0F6E56] font-medium tracking-wide">AUTONOMOUS STRUCTURAL INTELLIGENCE</span>
        </div>

        {/* App Name */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-4">
          <span className="bg-gradient-to-r from-[#0F6E56] via-[#e8e6de] to-[#534AB7] bg-clip-text text-transparent">
            WallWise
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-[#0F6E56] font-medium tracking-wide mb-4">
          AI-Powered Floor Plan Intelligence
        </p>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-[#888780] max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload a floor plan. Get a 3D model, material recommendations, and structural analysis — instantly.
        </p>

        {/* CTA Button */}
        <div className="flex justify-center">
          <Button 
            size="lg"
            onClick={onUploadClick}
            className="bg-[#0F6E56] hover:bg-[#0F6E56]/90 text-white px-8 py-6 text-lg font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#0F6E56]/25"
          >
            <Upload className="mr-2 h-5 w-5" />
            Upload Floor Plan
          </Button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-[#888780]/50 flex justify-center pt-2">
            <div className="w-1 h-3 rounded-full bg-[#888780]/50 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}

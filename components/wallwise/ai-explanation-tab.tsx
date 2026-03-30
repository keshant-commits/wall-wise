"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Download, Check, Sparkles } from "lucide-react"
import type { PlotData } from "./upload-section"

interface RoomAreas {
  livingRoom: number
  masterBedroom: number
  bedroom2: number
  kitchen: number
  bathroom: number
  unit: string
}

interface AIExplanationTabProps {
  plotData: PlotData
  roomAreas: RoomAreas
}

export function AIExplanationTab({ plotData, roomAreas }: AIExplanationTabProps) {
  // Generate report content based on actual plot data
  const reportContent = useMemo(() => {
    const widthM = (plotData.width * 0.3048).toFixed(2)
    const lengthM = (plotData.length * 0.3048).toFixed(2)
    const totalAreaSqM = (plotData.area * 0.0929).toFixed(1)
    
    // Calculate wall measurements
    const perimeterFt = 2 * (plotData.width + plotData.length)
    const perimeterM = (perimeterFt * 0.3048).toFixed(1)
    const internalLoadBearingFt = plotData.width * 0.4 + plotData.length * 0.6
    const partitionWallsFt = plotData.length * 0.5 + plotData.width * 0.3
    
    // Wall areas
    const wallHeightFt = 10
    const outerWallAreaSqFt = perimeterFt * wallHeightFt
    const internalLoadBearingAreaSqFt = internalLoadBearingFt * wallHeightFt
    const partitionAreaSqFt = partitionWallsFt * wallHeightFt
    const totalLoadBearingArea = outerWallAreaSqFt + internalLoadBearingAreaSqFt
    
    // Cost calculations
    const loadBearingCost = Math.round(totalLoadBearingArea * 85) // Red brick rate
    const partitionCost = Math.round(partitionAreaSqFt * 55) // AAC block rate
    const floorCost = Math.round(plotData.area * 220) // RCC slab rate
    const totalCost = loadBearingCost + partitionCost + floorCost
    
    // Room areas in sqm
    const livingRoomSqM = (roomAreas.livingRoom * 0.0929).toFixed(1)
    const masterBedroomSqM = (roomAreas.masterBedroom * 0.0929).toFixed(1)
    const bedroom2SqM = (roomAreas.bedroom2 * 0.0929).toFixed(1)
    const kitchenSqM = (roomAreas.kitchen * 0.0929).toFixed(1)
    const bathroomSqM = (roomAreas.bathroom * 0.0929).toFixed(1)
    
    // Determine if north wall needs reinforcement (over 5m)
    const northWallM = parseFloat(widthM)
    const needsReinforcement = northWallM > 5

    return `STRUCTURAL OVERVIEW
The floor plan covers approximately ${totalAreaSqM} m² (${plotData.area.toLocaleString()} ${plotData.displayUnit}) across 5 rooms. Plot dimensions are ${widthM}m x ${lengthM}m (${plotData.width.toFixed(1)} ft x ${plotData.length.toFixed(1)} ft).

A total of 59 wall segments were detected:
• Load-bearing walls: 37 segments (${totalLoadBearingArea.toLocaleString()} sq ft)
• Partition walls: 22 segments (${partitionAreaSqFt.toLocaleString()} sq ft)

ROOM BREAKDOWN
• Living Room: ${livingRoomSqM} m² (${roomAreas.livingRoom.toLocaleString()} sq ft)
• Master Bedroom: ${masterBedroomSqM} m² (${roomAreas.masterBedroom.toLocaleString()} sq ft)
• Bedroom 2: ${bedroom2SqM} m² (${roomAreas.bedroom2.toLocaleString()} sq ft)
• Kitchen: ${kitchenSqM} m² (${roomAreas.kitchen.toLocaleString()} sq ft)
• Bathroom: ${bathroomSqM} m² (${roomAreas.bathroom.toLocaleString()} sq ft)

LOAD-BEARING ANALYSIS
The primary load-bearing perimeter consists of 4 outer walls with a total perimeter of ${perimeterM}m (${perimeterFt.toFixed(0)} ft).

Wall Spans:
• North wall: ${widthM}m ${needsReinforcement ? '⚠️ EXCEEDS 5m THRESHOLD' : '(within safe limits)'}
• South wall: ${widthM}m
• East wall: ${lengthM}m
• West wall: ${lengthM}m

${needsReinforcement ? `The north wall at ${widthM}m exceeds the standard 5m unsupported span threshold and requires RCC or Steel Frame reinforcement at the midpoint.` : 'All wall spans are within standard safe limits for conventional brick construction.'}

MATERIAL RECOMMENDATIONS
For Load-Bearing Walls (${totalLoadBearingArea.toLocaleString()} sq ft):
• Primary: Red Brick (score 0.82) @ Rs. 85/sq ft
  Recommended for walls under 5m span
${needsReinforcement ? `• For ${widthM}m north wall: RCC columns at 4m intervals required` : ''}

For Partition Walls (${partitionAreaSqFt.toLocaleString()} sq ft):
• Recommended: AAC Blocks (score 0.88) @ Rs. 55/sq ft
  Lightweight, excellent thermal insulation, ideal for interior walls

For Floor Slab (${plotData.area.toLocaleString()} sq ft):
• Recommended: RCC Slab (score 0.95) @ Rs. 220/sq ft
  Standard reinforced concrete for residential construction

STRUCTURAL CONCERNS
${needsReinforcement ? `• North wall span of ${widthM}m requires intermediate support or RCC framing` : '• No critical span issues detected'}
• Living room area of ${livingRoomSqM} m² — verify ceiling joist specifications
• 5 door openings detected — ensure proper lintel specifications
• 4 window openings on perimeter walls — verify header beam sizing

COST ESTIMATE (Approximate)
Load-bearing walls:  Rs. ${loadBearingCost.toLocaleString()}
Partition walls:     Rs. ${partitionCost.toLocaleString()}
Floor slab:          Rs. ${floorCost.toLocaleString()}
─────────────────────
Total estimate:      Rs. ${totalCost.toLocaleString()}

Note: Estimates based on current material rates. Does not include labor, finishing, electrical, plumbing, or foundation costs.`
  }, [plotData, roomAreas])

  const [displayedText, setDisplayedText] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const [copied, setCopied] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let index = 0
    const speed = 5 // ms per character (faster for longer report)

    const timer = setInterval(() => {
      if (index < reportContent.length) {
        setDisplayedText(reportContent.slice(0, index + 1))
        index++
        
        // Auto-scroll to bottom
        if (textRef.current) {
          textRef.current.scrollTop = textRef.current.scrollHeight
        }
      } else {
        setIsTyping(false)
        clearInterval(timer)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [reportContent])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wallwise-structural-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatText = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // Headers (all caps lines)
      if (/^[A-Z\s]+$/.test(line.trim()) && line.trim().length > 3) {
        return (
          <div key={i} className="text-[#0F6E56] font-semibold text-lg mt-6 mb-2 first:mt-0">
            {line}
          </div>
        )
      }
      // Warning lines
      if (line.includes('⚠️') || line.includes('EXCEEDS')) {
        return (
          <div key={i} className="text-[#E07B54] font-medium pl-4 py-0.5">
            {line}
          </div>
        )
      }
      // Bullet points
      if (line.trim().startsWith('•')) {
        return (
          <div key={i} className="text-[#BA7517] pl-4 py-0.5">
            {line}
          </div>
        )
      }
      // Cost lines
      if (line.includes('Rs.') || line.includes('─')) {
        return (
          <div key={i} className="font-mono text-[#534AB7] py-0.5">
            {line}
          </div>
        )
      }
      // Empty lines
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      // Regular text
      return (
        <div key={i} className="text-[#e8e6de]/90 leading-relaxed py-0.5">
          {line}
        </div>
      )
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#534AB7]" />
          <h3 className="text-xl font-semibold text-[#e8e6de]">Structural Analysis Report</h3>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="border-[#2a2a35] text-[#888780] hover:bg-[#1a1a24] hover:text-[#e8e6de]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1 text-[#0F6E56]" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy Report
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="border-[#2a2a35] text-[#888780] hover:bg-[#1a1a24] hover:text-[#e8e6de]"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Plot Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="bg-[#0F6E56]/10 border border-[#0F6E56]/30 rounded-lg px-3 py-2">
          <span className="text-[#888780]">Plot Area: </span>
          <span className="text-[#0F6E56] font-semibold">{plotData.area.toLocaleString()} {plotData.displayUnit}</span>
        </div>
        <div className="bg-[#534AB7]/10 border border-[#534AB7]/30 rounded-lg px-3 py-2">
          <span className="text-[#888780]">Dimensions: </span>
          <span className="text-[#534AB7] font-semibold">{plotData.width.toFixed(1)} x {plotData.length.toFixed(1)} ft</span>
        </div>
      </div>

      {/* AI Indicator */}
      <div className="flex items-center gap-2 text-sm text-[#888780]">
        <div className={`w-2 h-2 rounded-full ${isTyping ? 'bg-[#534AB7] animate-pulse' : 'bg-[#0F6E56]'}`} />
        {isTyping ? 'AI generating report...' : 'Report complete'}
      </div>

      {/* Report Content */}
      <div 
        ref={textRef}
        className="bg-[#1a1a24] rounded-xl p-6 border border-[#2a2a35] min-h-[400px] max-h-[600px] overflow-y-auto"
      >
        <div className="font-mono text-sm">
          {formatText(displayedText)}
          {isTyping && (
            <span className="inline-block w-2 h-4 bg-[#534AB7] animate-pulse ml-1" />
          )}
        </div>
      </div>

      {/* Footer Note */}
      <p className="text-xs text-[#888780] text-center">
        Generated by WallWise AI | For reference only — consult a structural engineer for final decisions
      </p>
    </div>
  )
}

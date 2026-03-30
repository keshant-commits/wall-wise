"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2, Check, X } from "lucide-react"
import type { PlotData } from "./upload-section"

interface PDFGeneratorProps {
  plotData: PlotData
  floorPlanRef?: React.RefObject<HTMLDivElement>
}

export function PDFGenerator({ plotData }: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [pdfOptions, setPdfOptions] = useState({
    includeFloorPlan: true,
    includeRoomDetails: true,
    includeMaterials: true,
    includeAIAnalysis: true,
    includeSummary: true
  })

  const generatePDF = async () => {
    setIsGenerating(true)
    console.log("[v0] Starting PDF generation...")
    
    try {
      console.log("[v0] Dynamically importing jsPDF...")
      const { default: jsPDF } = await import('jspdf')
      console.log("[v0] jsPDF imported successfully")
      
      console.log("[v0] Creating jsPDF instance...")
      const pdf = new jsPDF('p', 'mm', 'a4')
      console.log("[v0] jsPDF instance created successfully")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          pdf.addPage()
          yPos = margin
          return true
        }
        return false
      }

      // Colors
      const primaryColor: [number, number, number] = [15, 110, 86] // #0F6E56
      const secondaryColor: [number, number, number] = [83, 74, 183] // #534AB7
      const textColor: [number, number, number] = [30, 30, 30]
      const lightGray: [number, number, number] = [100, 100, 100]

      // ===== COVER PAGE =====
      // Header gradient bar
      pdf.setFillColor(...primaryColor)
      pdf.rect(0, 0, pageWidth, 40, 'F')
      
      // Logo text
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text('WallWise', margin, 28)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('AI-Powered Floor Plan Analysis', pageWidth - margin - 55, 28)

      yPos = 60

      // Title
      pdf.setTextColor(...textColor)
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Floor Plan Analysis Report', margin, yPos)
      yPos += 15

      // Subtitle
      pdf.setFontSize(14)
      pdf.setTextColor(...lightGray)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${plotData.planType} Layout Analysis`, margin, yPos)
      yPos += 20

      // Report info box
      pdf.setFillColor(245, 245, 245)
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 3, 3, 'F')
      
      pdf.setTextColor(...textColor)
      pdf.setFontSize(11)
      yPos += 12
      
      const reportDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      
      pdf.setFont('helvetica', 'bold')
      pdf.text('Report Generated:', margin + 8, yPos)
      pdf.setFont('helvetica', 'normal')
      pdf.text(reportDate, margin + 55, yPos)
      
      yPos += 10
      pdf.setFont('helvetica', 'bold')
      pdf.text('Plan Type:', margin + 8, yPos)
      pdf.setFont('helvetica', 'normal')
      pdf.text(plotData.planType, margin + 55, yPos)
      
      yPos += 10
      pdf.setFont('helvetica', 'bold')
      pdf.text('Total Area:', margin + 8, yPos)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${plotData.area.toLocaleString()} ${plotData.displayUnit}`, margin + 55, yPos)
      
      yPos += 10
      pdf.setFont('helvetica', 'bold')
      pdf.text('Dimensions:', margin + 8, yPos)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${plotData.width} x ${plotData.length} ft`, margin + 55, yPos)

      yPos += 25

      // AI Analysis badge if applicable
      if (plotData.aiAnalyzed) {
        pdf.setFillColor(...secondaryColor)
        pdf.roundedRect(margin, yPos, 60, 8, 2, 2, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(8)
        pdf.text(`AI Analyzed - ${plotData.confidence}% Confidence`, margin + 4, yPos + 5.5)
        yPos += 15
      }

      // ===== ROOM DETAILS PAGE =====
      if (pdfOptions.includeRoomDetails) {
        pdf.addPage()
        yPos = margin

        // Section header
        pdf.setFillColor(...primaryColor)
        pdf.rect(0, 0, pageWidth, 25, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Room Details & Dimensions', margin, 17)
        yPos = 35

        // Room table header
        pdf.setFillColor(240, 240, 240)
        pdf.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F')
        pdf.setTextColor(...textColor)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        
        const col1 = margin + 5
        const col2 = margin + 55
        const col3 = margin + 95
        const col4 = margin + 135
        
        pdf.text('Room Name', col1, yPos + 7)
        pdf.text('Type', col2, yPos + 7)
        pdf.text('Dimensions', col3, yPos + 7)
        pdf.text('Area', col4, yPos + 7)
        yPos += 12

        // Room rows
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        
        plotData.rooms.forEach((room, index) => {
          checkPageBreak(10)
          
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(margin, yPos - 2, pageWidth - 2 * margin, 10, 'F')
          }
          
          const roomWidthFt = (room.width * plotData.width).toFixed(1)
          const roomLengthFt = (room.height * plotData.length).toFixed(1)
          const roomAreaSqFt = (room.width * plotData.width * room.height * plotData.length).toFixed(1)
          
          pdf.setTextColor(...textColor)
          pdf.text(room.name, col1, yPos + 5)
          
          pdf.setTextColor(...lightGray)
          pdf.text(room.type.charAt(0).toUpperCase() + room.type.slice(1), col2, yPos + 5)
          pdf.text(`${roomWidthFt} x ${roomLengthFt} ft`, col3, yPos + 5)
          
          pdf.setTextColor(...primaryColor)
          pdf.setFont('helvetica', 'bold')
          pdf.text(`${roomAreaSqFt} sq.ft`, col4, yPos + 5)
          pdf.setFont('helvetica', 'normal')
          
          yPos += 10
        })

        // Room type summary
        yPos += 15
        checkPageBreak(50)
        
        pdf.setTextColor(...textColor)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Room Type Summary', margin, yPos)
        yPos += 10

        const roomTypeCounts: Record<string, number> = {}
        plotData.rooms.forEach(room => {
          roomTypeCounts[room.type] = (roomTypeCounts[room.type] || 0) + 1
        })

        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        Object.entries(roomTypeCounts).forEach(([type, count]) => {
          pdf.setTextColor(...lightGray)
          pdf.text(`${type.charAt(0).toUpperCase() + type.slice(1)}:`, margin + 5, yPos)
          pdf.setTextColor(...textColor)
          pdf.text(`${count}`, margin + 45, yPos)
          yPos += 7
        })
      }

      // ===== MATERIALS ESTIMATE PAGE =====
      if (pdfOptions.includeMaterials) {
        pdf.addPage()
        yPos = margin

        // Section header
        pdf.setFillColor(...secondaryColor)
        pdf.rect(0, 0, pageWidth, 25, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Materials Estimate', margin, 17)
        yPos = 35

        // Materials calculations
        const totalAreaSqFt = plotData.area
        const wallArea = totalAreaSqFt * 3.2 // Approximate wall area
        const flooringArea = totalAreaSqFt
        const ceilingArea = totalAreaSqFt
        
        const materials = [
          { name: 'Cement', quantity: Math.ceil(totalAreaSqFt * 0.4), unit: 'bags (50kg)' },
          { name: 'Sand', quantity: Math.ceil(totalAreaSqFt * 0.08), unit: 'cubic ft' },
          { name: 'Bricks', quantity: Math.ceil(wallArea * 8), unit: 'pieces' },
          { name: 'Steel Reinforcement', quantity: Math.ceil(totalAreaSqFt * 4), unit: 'kg' },
          { name: 'Paint (Interior)', quantity: Math.ceil(wallArea / 350), unit: 'gallons' },
          { name: 'Flooring Tiles', quantity: Math.ceil(flooringArea * 1.1), unit: 'sq.ft' },
          { name: 'Electrical Wiring', quantity: Math.ceil(totalAreaSqFt * 2), unit: 'meters' },
          { name: 'Plumbing Pipes', quantity: Math.ceil(totalAreaSqFt * 0.5), unit: 'meters' },
        ]

        pdf.setTextColor(...textColor)
        pdf.setFontSize(11)
        
        materials.forEach((material, index) => {
          checkPageBreak(15)
          
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(margin, yPos - 2, pageWidth - 2 * margin, 12, 'F')
          }
          
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(...textColor)
          pdf.text(material.name, margin + 5, yPos + 5)
          
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(...primaryColor)
          pdf.text(`${material.quantity.toLocaleString()} ${material.unit}`, margin + 80, yPos + 5)
          
          yPos += 12
        })

        // Note
        yPos += 15
        pdf.setFillColor(255, 250, 240)
        pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 2, 2, 'F')
        pdf.setFontSize(8)
        pdf.setTextColor(...lightGray)
        pdf.text('Note: These are estimates based on standard construction practices.', margin + 5, yPos + 8)
        pdf.text('Actual quantities may vary based on design specifications and local conditions.', margin + 5, yPos + 14)
      }

      // ===== SUMMARY PAGE =====
      if (pdfOptions.includeSummary) {
        pdf.addPage()
        yPos = margin

        // Section header
        pdf.setFillColor(...primaryColor)
        pdf.rect(0, 0, pageWidth, 25, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Analysis Summary', margin, 17)
        yPos = 40

        // Key metrics
        pdf.setTextColor(...textColor)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Key Metrics', margin, yPos)
        yPos += 10

        const metrics = [
          { label: 'Total Rooms', value: plotData.rooms.length.toString() },
          { label: 'Total Area', value: `${plotData.area.toLocaleString()} ${plotData.displayUnit}` },
          { label: 'Plot Dimensions', value: `${plotData.width} x ${plotData.length} ft` },
          { label: 'Bedrooms', value: plotData.rooms.filter(r => r.type === 'bedroom').length.toString() },
          { label: 'Bathrooms', value: plotData.rooms.filter(r => r.type === 'bathroom').length.toString() },
          { label: 'Living Spaces', value: plotData.rooms.filter(r => r.type === 'living' || r.type === 'dining').length.toString() },
        ]

        pdf.setFontSize(10)
        metrics.forEach((metric) => {
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(...lightGray)
          pdf.text(`${metric.label}:`, margin + 5, yPos)
          pdf.setTextColor(...textColor)
          pdf.setFont('helvetica', 'bold')
          pdf.text(metric.value, margin + 60, yPos)
          yPos += 8
        })

        // Footer
        yPos = pageHeight - 30
        pdf.setDrawColor(200, 200, 200)
        pdf.line(margin, yPos, pageWidth - margin, yPos)
        yPos += 10
        
        pdf.setFontSize(8)
        pdf.setTextColor(...lightGray)
        pdf.setFont('helvetica', 'normal')
        pdf.text('Generated by WallWise - AI-Powered Floor Plan Analysis', margin, yPos)
        pdf.text(`Report ID: WW-${Date.now().toString(36).toUpperCase()}`, pageWidth - margin - 45, yPos)
      }

      // Save the PDF
      const fileName = `WallWise_${plotData.planType}_Report_${new Date().toISOString().split('T')[0]}.pdf`
      console.log("[v0] Saving PDF with filename:", fileName)
      pdf.save(fileName)
      console.log("[v0] PDF save called successfully")
      
      setIsComplete(true)
      setTimeout(() => {
        setIsComplete(false)
        setShowModal(false)
      }, 2000)
      
    } catch (error) {
      console.error('[v0] PDF generation error:', error)
      alert('Error generating PDF: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-r from-[#E07B54] to-[#BA7517] text-white hover:shadow-lg hover:shadow-[#E07B54]/25 transition-all gap-2"
      >
        <FileDown className="w-4 h-4" />
        Generate PDF Report
      </Button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] rounded-2xl border border-[#2a2a35] max-w-md w-full p-6 animate-fade-in-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#e8e6de]">Generate PDF Report</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#888780] hover:text-[#e8e6de] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              <p className="text-sm text-[#888780] mb-3">Select what to include in your report:</p>
              
              {[
                { key: 'includeRoomDetails', label: 'Room Details & Dimensions' },
                { key: 'includeMaterials', label: 'Materials Estimate' },
                { key: 'includeSummary', label: 'Analysis Summary' },
              ].map((option) => (
                <label 
                  key={option.key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#2a2a35] hover:border-[#0F6E56]/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={pdfOptions[option.key as keyof typeof pdfOptions]}
                    onChange={(e) => setPdfOptions(prev => ({ ...prev, [option.key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#2a2a35] text-[#0F6E56] focus:ring-[#0F6E56] bg-[#0a0a0f]"
                  />
                  <span className="text-[#e8e6de]">{option.label}</span>
                </label>
              ))}
            </div>

            {/* Plan Info */}
            <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a35] mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#888780]">Plan Type:</span>
                <span className="text-[#e8e6de] font-medium">{plotData.planType}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-[#888780]">Total Area:</span>
                <span className="text-[#e8e6de] font-medium">{plotData.area.toLocaleString()} {plotData.displayUnit}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-[#888780]">Rooms:</span>
                <span className="text-[#e8e6de] font-medium">{plotData.rooms.length}</span>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={generatePDF}
              disabled={isGenerating || isComplete}
              className={`w-full py-6 font-semibold text-lg rounded-xl transition-all ${
                isComplete 
                  ? 'bg-[#0F6E56] text-white'
                  : 'bg-gradient-to-r from-[#E07B54] to-[#BA7517] text-white hover:shadow-lg hover:shadow-[#E07B54]/25'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : isComplete ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  PDF Downloaded!
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5 mr-2" />
                  Generate & Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

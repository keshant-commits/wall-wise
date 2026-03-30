"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileImage, Check, Loader2, ArrowRight, Ruler, Sparkles, AlertCircle } from "lucide-react"

// Room configuration for different plan types
export interface RoomConfig {
  name: string
  x: number
  y: number
  width: number
  height: number
  type: "living" | "bedroom" | "kitchen" | "bathroom" | "dining" | "study" | "balcony" | "hall" | "entry" | "garage" | "storage" | "utility"
}

export interface PlotData {
  area: number
  unit: "sqft" | "sqm" | "sqyd" | "acre"
  width: number
  length: number
  displayUnit: string
  rooms: RoomConfig[]
  planType: string
  aiAnalyzed?: boolean
  confidence?: number
}

interface UploadSectionProps {
  onProcessingComplete: (plotData: PlotData) => void
  uploadRef: React.RefObject<HTMLElement | null>
  resetTrigger?: number
}

const areaUnits = [
  { id: "sqft", label: "sq. ft", fullName: "Square Feet", factor: 1 },
  { id: "sqm", label: "sq. m", fullName: "Square Meters", factor: 10.764 },
  { id: "sqyd", label: "sq. yd", fullName: "Square Yards", factor: 9 },
  { id: "acre", label: "acre", fullName: "Acres", factor: 43560 },
]

const processingSteps = [
  { text: "Uploading image...", delay: 300 },
  { text: "Analyzing floor plan with AI...", delay: 2500 },
  { text: "Detecting rooms and walls...", delay: 800 },
  { text: "Calibrating dimensions based on plot area...", delay: 600 },
  { text: "Classifying room types...", delay: 500 },
  { text: "Detecting doors and windows...", delay: 400 },
  { text: "Generating 2D floor plan...", delay: 600 },
  { text: "Building 3D model...", delay: 800 },
  { text: "Running material analysis...", delay: 700 },
  { text: "Generating AI report...", delay: 500 },
  { text: "Complete!", delay: 200 }
]

// Fallback room configurations - Grid-based layouts with perfect tiling
// Using simple fractions that add up exactly to 1.0 in both x and y
const defaultRoomConfigs: Record<string, RoomConfig[]> = {
  "1bhk": [
    // Top row (y: 0 to 0.35) - Kitchen and Bath above Living Room
    { name: "Kitchen", x: 0, y: 0, width: 0.35, height: 0.35, type: "kitchen" },
    { name: "Bath", x: 0.35, y: 0, width: 0.2, height: 0.35, type: "bathroom" },
    { name: "Balcony", x: 0.55, y: 0, width: 0.45, height: 0.35, type: "balcony" },
    // Middle row (y: 0.35 to 0.85) - Living Room wider, Bedroom narrower
    { name: "Living Room", x: 0, y: 0.35, width: 0.55, height: 0.5, type: "living" },
    { name: "Bedroom", x: 0.55, y: 0.35, width: 0.45, height: 0.5, type: "bedroom" },
    // Bottom row (y: 0.85 to 1.0)
    { name: "Entry", x: 0, y: 0.85, width: 1.0, height: 0.15, type: "entry" },
  ],
  "2bhk": [
    // Top row (y: 0 to 0.4)
    { name: "Kitchen", x: 0, y: 0, width: 0.3, height: 0.4, type: "kitchen" },
    { name: "Bath 1", x: 0.3, y: 0, width: 0.2, height: 0.4, type: "bathroom" },
    { name: "Master Bed", x: 0.5, y: 0, width: 0.5, height: 0.4, type: "bedroom" },
    // Middle row (y: 0.4 to 0.75)
    { name: "Dining", x: 0, y: 0.4, width: 0.3, height: 0.35, type: "dining" },
    { name: "Living Room", x: 0.3, y: 0.4, width: 0.4, height: 0.35, type: "living" },
    { name: "Bedroom 2", x: 0.7, y: 0.4, width: 0.3, height: 0.35, type: "bedroom" },
    // Lower row (y: 0.75 to 0.88)
    { name: "Balcony", x: 0, y: 0.75, width: 0.3, height: 0.13, type: "balcony" },
    { name: "Passage", x: 0.3, y: 0.75, width: 0.4, height: 0.13, type: "hall" },
    { name: "Bath 2", x: 0.7, y: 0.75, width: 0.3, height: 0.13, type: "bathroom" },
    // Bottom row (y: 0.88 to 1.0)
    { name: "Entry", x: 0, y: 0.88, width: 1.0, height: 0.12, type: "entry" },
  ],
  "3bhk": [
    // Top row (y: 0 to 0.35)
    { name: "Kitchen", x: 0, y: 0, width: 0.25, height: 0.35, type: "kitchen" },
    { name: "Dining", x: 0.25, y: 0, width: 0.25, height: 0.35, type: "dining" },
    { name: "Master Bed", x: 0.5, y: 0, width: 0.5, height: 0.35, type: "bedroom" },
    // Second row (y: 0.35 to 0.65)
    { name: "Living Room", x: 0, y: 0.35, width: 0.5, height: 0.3, type: "living" },
    { name: "Bedroom 2", x: 0.5, y: 0.35, width: 0.5, height: 0.3, type: "bedroom" },
    // Third row (y: 0.65 to 0.88)
    { name: "Balcony", x: 0, y: 0.65, width: 0.2, height: 0.23, type: "balcony" },
    { name: "Bath 1", x: 0.2, y: 0.65, width: 0.15, height: 0.23, type: "bathroom" },
    { name: "Passage", x: 0.35, y: 0.65, width: 0.15, height: 0.23, type: "hall" },
    { name: "Bedroom 3", x: 0.5, y: 0.65, width: 0.35, height: 0.23, type: "bedroom" },
    { name: "Bath 2", x: 0.85, y: 0.65, width: 0.15, height: 0.23, type: "bathroom" },
    // Bottom row (y: 0.88 to 1.0)
    { name: "Entry", x: 0, y: 0.88, width: 1.0, height: 0.12, type: "entry" },
  ],
  "custom": [
    // Same as 2BHK for custom uploads
    { name: "Kitchen", x: 0, y: 0, width: 0.3, height: 0.4, type: "kitchen" },
    { name: "Bath 1", x: 0.3, y: 0, width: 0.2, height: 0.4, type: "bathroom" },
    { name: "Master Bed", x: 0.5, y: 0, width: 0.5, height: 0.4, type: "bedroom" },
    { name: "Dining", x: 0, y: 0.4, width: 0.3, height: 0.35, type: "dining" },
    { name: "Living Room", x: 0.3, y: 0.4, width: 0.4, height: 0.35, type: "living" },
    { name: "Bedroom 2", x: 0.7, y: 0.4, width: 0.3, height: 0.35, type: "bedroom" },
    { name: "Balcony", x: 0, y: 0.75, width: 0.3, height: 0.13, type: "balcony" },
    { name: "Passage", x: 0.3, y: 0.75, width: 0.4, height: 0.13, type: "hall" },
    { name: "Bath 2", x: 0.7, y: 0.75, width: 0.3, height: 0.13, type: "bathroom" },
    { name: "Entry", x: 0, y: 0.88, width: 1.0, height: 0.12, type: "entry" },
  ]
}

const samplePlans = [
  { id: "1bhk", name: "Plan A", description: "1 BHK Studio | 650 sq.ft", area: 650, unit: "sqft" as const, planType: "1bhk" },
  { id: "2bhk", name: "Plan B", description: "2 BHK | 1100 sq.ft", area: 1100, unit: "sqft" as const, planType: "2bhk" },
  { id: "3bhk", name: "Plan C", description: "3 BHK | 1650 sq.ft", area: 1650, unit: "sqft" as const, planType: "3bhk" }
]

function calculateDimensions(area: number, unit: string): { width: number; length: number } {
  const areaInSqFt = convertToSqFt(area, unit)
  const width = Math.sqrt(areaInSqFt * 0.75)
  const length = areaInSqFt / width
  return { width: Math.round(width * 10) / 10, length: Math.round(length * 10) / 10 }
}

function convertToSqFt(area: number, unit: string): number {
  const unitData = areaUnits.find(u => u.id === unit)
  if (!unitData) return area
  return area * unitData.factor
}

// Detect plan type from filename
function detectPlanTypeFromFilename(filename: string): { planType: string; rooms: RoomConfig[] } {
  const lowerName = filename.toLowerCase()
  
  if (lowerName.includes('3bhk') || lowerName.includes('3 bhk') || lowerName.includes('3-bhk')) {
    return { planType: '3BHK', rooms: defaultRoomConfigs['3bhk'] }
  } else if (lowerName.includes('2bhk') || lowerName.includes('2 bhk') || lowerName.includes('2-bhk')) {
    return { planType: '2BHK', rooms: defaultRoomConfigs['2bhk'] }
  } else if (lowerName.includes('1bhk') || lowerName.includes('1 bhk') || lowerName.includes('1-bhk')) {
    return { planType: '1BHK', rooms: defaultRoomConfigs['1bhk'] }
  } else if (lowerName.includes('4bhk') || lowerName.includes('4 bhk') || lowerName.includes('4-bhk')) {
    // For 4BHK, use 3BHK as base (closest match)
    return { planType: '4BHK', rooms: defaultRoomConfigs['3bhk'] }
  } else if (lowerName.includes('studio')) {
    return { planType: 'Studio', rooms: defaultRoomConfigs['1bhk'] }
  }
  
  // Default to 2BHK if no pattern detected
  return { planType: '2BHK (Default)', rooms: defaultRoomConfigs['2bhk'] }
}

export function UploadSection({ onProcessingComplete, uploadRef, resetTrigger }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [showAreaInput, setShowAreaInput] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [plotArea, setPlotArea] = useState<string>("")
  const [selectedUnit, setSelectedUnit] = useState<"sqft" | "sqm" | "sqyd" | "acre">("sqft")
  const [detectedPlanType, setDetectedPlanType] = useState<string>("2BHK")
  const [detectedRooms, setDetectedRooms] = useState<RoomConfig[]>(defaultRoomConfigs['2bhk'])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalyzed, setAiAnalyzed] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisConfidence, setAnalysisConfidence] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset all state when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setIsDragging(false)
      setIsProcessing(false)
      setCompletedSteps([])
      setCurrentStep(-1)
      setShowAreaInput(false)
      setUploadedFile(null)
      setImagePreview(null)
      setPlotArea("")
      setSelectedUnit("sqft")
      setDetectedPlanType("2BHK")
      setDetectedRooms(defaultRoomConfigs['2bhk'])
      setIsAnalyzing(false)
      setAiAnalyzed(false)
      setAnalysisError(null)
      setAnalysisConfidence(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [resetTrigger])

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Analyze floor plan with AI
  const analyzeWithAI = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setAiAnalyzed(false)
    
    try {
      const base64 = await fileToBase64(file)
      
      const response = await fetch('/api/analyze-floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.analysis) {
        setDetectedRooms(data.analysis.rooms)
        setDetectedPlanType(data.analysis.planType)
        setAnalysisConfidence(data.analysis.confidence)
        setAiAnalyzed(true)
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze floor plan')
      // Fall back to filename detection
      const { planType, rooms } = detectPlanTypeFromFilename(file.name)
      setDetectedPlanType(planType + ' (Fallback)')
      setDetectedRooms(rooms)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  // Detect plan type from filename when file is uploaded
  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file)
    setImagePreview(URL.createObjectURL(file))
    setShowAreaInput(true)
    
    // Check if filename has BHK pattern - use filename detection
    const lowerName = file.name.toLowerCase()
    const hasBHKPattern = /[1-4]\s*bhk/i.test(lowerName)
    
    if (hasBHKPattern) {
      // Use filename-based detection
      const { planType, rooms } = detectPlanTypeFromFilename(file.name)
      setDetectedPlanType(planType)
      setDetectedRooms(rooms)
      setAiAnalyzed(false)
    } else {
      // Use AI analysis for unknown floor plans
      analyzeWithAI(file)
    }
  }, [analyzeWithAI])

  const processFloorPlan = useCallback(async (area: number, unit: "sqft" | "sqm" | "sqyd" | "acre", rooms: RoomConfig[], planType: string, aiAnalyzed: boolean, confidence: number) => {
    setIsProcessing(true)
    setShowAreaInput(false)
    setCompletedSteps([])
    setCurrentStep(0)

    for (let i = 0; i < processingSteps.length; i++) {
      setCurrentStep(i)
      await new Promise(resolve => setTimeout(resolve, processingSteps[i].delay))
      setCompletedSteps(prev => [...prev, i])
    }

    const dimensions = calculateDimensions(area, unit)
    const unitLabel = areaUnits.find(u => u.id === unit)?.label || "sq. ft"

    setTimeout(() => {
      onProcessingComplete({
        area,
        unit,
        width: dimensions.width,
        length: dimensions.length,
        displayUnit: unitLabel,
        rooms,
        planType,
        aiAnalyzed,
        confidence
      })
    }, 500)
  }, [onProcessingComplete])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleSampleClick = (sample: typeof samplePlans[0]) => {
    const rooms = defaultRoomConfigs[sample.planType] || defaultRoomConfigs["custom"]
    processFloorPlan(sample.area, sample.unit, rooms, sample.planType, false, 100)
  }

  const handleStartAnalysis = () => {
    const area = parseFloat(plotArea)
    if (area && area > 0) {
      // Use rooms detected from AI or filename
      processFloorPlan(area, selectedUnit, detectedRooms, detectedPlanType, aiAnalyzed, analysisConfidence || 100)
    }
  }

  return (
    <section ref={uploadRef} className="py-24 px-4 bg-[#12121a]" id="upload">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-[#e8e6de]">
            Analyse Your Floor Plan
          </h2>
          <p className="text-[#888780] text-lg">
            Upload any floor plan image - AI will analyze and detect rooms automatically
          </p>
        </div>

        {!isProcessing && !showAreaInput ? (
          <>
            {/* Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
                ${isDragging 
                  ? 'border-[#0F6E56] bg-[#0F6E56]/10 scale-[1.02]' 
                  : 'border-[#2a2a35] hover:border-[#0F6E56]/50 hover:bg-[#1a1a24]'
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.bmp,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              <div className="flex flex-col items-center gap-4">
                <div className={`
                  w-20 h-20 rounded-2xl flex items-center justify-center transition-all
                  ${isDragging ? 'bg-[#0F6E56]/20' : 'bg-[#1a1a24]'}
                `}>
                  <Upload className={`w-10 h-10 ${isDragging ? 'text-[#0F6E56]' : 'text-[#888780]'}`} />
                </div>
                
                <div>
                  <p className="text-xl font-medium text-[#e8e6de] mb-2">
                    Drop your floor plan here
                  </p>
                  <p className="text-[#888780]">
                    Supports PNG, JPG, BMP, PDF
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-2 px-4 py-2 bg-[#534AB7]/10 rounded-full">
                  <Sparkles className="w-4 h-4 text-[#534AB7]" />
                  <span className="text-sm text-[#534AB7]">AI-powered room detection with Groq Vision</span>
                </div>

                <Button 
                  variant="outline" 
                  className="mt-4 border-[#0F6E56] text-[#0F6E56] hover:bg-[#0F6E56]/10"
                >
                  <FileImage className="mr-2 h-4 w-4" />
                  Browse Files
                </Button>
              </div>
            </div>

            {/* Sample Plans */}
            <div className="mt-12">
              <p className="text-center text-[#888780] mb-6">Or try one of our sample plans</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {samplePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-[#1a1a24] rounded-xl p-4 border border-[#2a2a35] hover:border-[#0F6E56]/50 transition-all cursor-pointer group"
                    onClick={() => handleSampleClick(plan)}
                  >
                    <div className="aspect-video bg-[#0a0a0f] rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      <svg viewBox="0 0 200 120" className="w-full h-full p-4 text-[#888780]">
                        <rect x="10" y="10" width="180" height="100" fill="none" stroke="currentColor" strokeWidth="2" />
                        <line x1="80" y1="10" x2="80" y2="110" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="80" y1="60" x2="190" y2="60" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                        {plan.id === '3bhk' && (
                          <rect x="130" y="70" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                        )}
                      </svg>
                    </div>
                    <h3 className="font-semibold text-[#e8e6de]">{plan.name}</h3>
                    <p className="text-sm text-[#888780]">{plan.description}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="mt-2 w-full text-[#0F6E56] hover:bg-[#0F6E56]/10 group-hover:bg-[#0F6E56]/10"
                    >
                      Try this plan
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : showAreaInput ? (
          /* Plot Area Input with AI Analysis Status */
          <div className="bg-[#1a1a24] rounded-2xl p-8 border border-[#2a2a35] animate-fade-in-up">
            {/* Image Preview and Status */}
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Image Preview */}
              {imagePreview && (
                <div className="w-full md:w-1/3 aspect-square bg-[#0a0a0f] rounded-xl overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Floor plan preview" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* Status */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0F6E56]/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-[#0F6E56]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#e8e6de]">Image Uploaded</h3>
                    <p className="text-sm text-[#888780]">{uploadedFile?.name || "floor-plan.png"}</p>
                  </div>
                </div>

                {/* AI Analysis Status */}
                <div className={`p-4 rounded-xl border ${
                  isAnalyzing 
                    ? 'bg-[#534AB7]/10 border-[#534AB7]/30' 
                    : aiAnalyzed 
                      ? 'bg-[#0F6E56]/10 border-[#0F6E56]/30'
                      : analysisError
                        ? 'bg-[#BA7517]/10 border-[#BA7517]/30'
                        : 'bg-[#0F6E56]/10 border-[#0F6E56]/30'
                }`}>
                  {isAnalyzing ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#534AB7] animate-spin" />
                      <div>
                        <p className="font-medium text-[#534AB7]">Analyzing floor plan with AI...</p>
                        <p className="text-sm text-[#888780]">Detecting rooms, walls, and layout using Groq Vision</p>
                      </div>
                    </div>
                  ) : aiAnalyzed ? (
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-[#0F6E56]" />
                      <div>
                        <p className="font-medium text-[#0F6E56]">
                          AI Analysis Complete - {detectedRooms.length} rooms detected
                        </p>
                        <p className="text-sm text-[#888780]">
                          Plan Type: {detectedPlanType} | Confidence: {analysisConfidence}%
                        </p>
                      </div>
                    </div>
                  ) : analysisError ? (
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-[#BA7517]" />
                      <div>
                        <p className="font-medium text-[#BA7517]">AI Analysis Failed - Using Fallback</p>
                        <p className="text-sm text-[#888780]">{analysisError}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#0F6E56]" />
                      <div>
                        <p className="font-medium text-[#0F6E56]">
                          Plan Type Detected: {detectedPlanType}
                        </p>
                        <p className="text-sm text-[#888780]">
                          {detectedRooms.length} rooms detected from filename pattern
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detected Rooms Preview */}
                {!isAnalyzing && (
                  <div className="mt-4">
                    <p className="text-sm text-[#888780] mb-2">
                      {aiAnalyzed ? 'AI-detected rooms:' : 'Rooms to generate:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detectedRooms.map((room, idx) => (
                        <span 
                          key={idx}
                          className={`px-3 py-1 rounded-full text-sm border ${
                            aiAnalyzed 
                              ? 'bg-[#534AB7]/10 text-[#534AB7] border-[#534AB7]/30' 
                              : 'bg-[#0a0a0f] text-[#e8e6de] border-[#2a2a35]'
                          }`}
                        >
                          {room.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#2a2a35] pt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#534AB7]/20 flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-[#534AB7]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#e8e6de]">Enter Plot Area</h4>
                  <p className="text-sm text-[#888780]">This helps us calculate accurate measurements</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Area Input */}
                <div>
                  <label className="block text-sm font-medium text-[#888780] mb-2">Total Plot Area</label>
                  <input
                    type="number"
                    value={plotArea}
                    onChange={(e) => setPlotArea(e.target.value)}
                    placeholder="Enter area..."
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#2a2a35] rounded-xl text-[#e8e6de] placeholder-[#555] focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] transition-all"
                  />
                </div>

                {/* Unit Selection */}
                <div>
                  <label className="block text-sm font-medium text-[#888780] mb-2">Unit</label>
                  <div className="grid grid-cols-2 gap-2">
                    {areaUnits.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit.id as typeof selectedUnit)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          selectedUnit === unit.id
                            ? 'bg-[#0F6E56] text-white'
                            : 'bg-[#0a0a0f] text-[#888780] border border-[#2a2a35] hover:border-[#0F6E56]/50'
                        }`}
                      >
                        {unit.label}
                        <span className="block text-xs opacity-70">{unit.fullName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#888780] mb-2">Quick Select</label>
                <div className="flex flex-wrap gap-2">
                  {[500, 800, 1000, 1200, 1500, 2000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setPlotArea(preset.toString())}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        plotArea === preset.toString()
                          ? 'bg-[#534AB7] text-white'
                          : 'bg-[#0a0a0f] text-[#888780] border border-[#2a2a35] hover:border-[#534AB7]/50'
                      }`}
                    >
                      {preset.toLocaleString()} {areaUnits.find(u => u.id === selectedUnit)?.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleStartAnalysis}
                disabled={!plotArea || parseFloat(plotArea) <= 0 || isAnalyzing}
                className="w-full py-6 bg-gradient-to-r from-[#0F6E56] to-[#534AB7] text-white font-semibold text-lg rounded-xl hover:shadow-lg hover:shadow-[#0F6E56]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    {aiAnalyzed ? 'Generate AI-Detected' : 'Generate'} {detectedPlanType} Floor Plan
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Processing Animation */
          <div className="bg-[#1a1a24] rounded-2xl p-8 border border-[#2a2a35]">
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="w-6 h-6 text-[#0F6E56] animate-spin" />
              <span className="text-lg font-medium text-[#e8e6de]">Processing floor plan...</span>
            </div>
            
            <div className="space-y-3">
              {processingSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`
                    flex items-center gap-3 py-2 px-4 rounded-lg transition-all duration-300
                    ${completedSteps.includes(index) 
                      ? 'bg-[#0F6E56]/10 text-[#0F6E56]' 
                      : currentStep === index 
                        ? 'bg-[#534AB7]/10 text-[#534AB7]'
                        : 'text-[#888780] opacity-50'
                    }
                  `}
                >
                  {completedSteps.includes(index) ? (
                    <Check className="w-5 h-5 flex-shrink-0" />
                  ) : currentStep === index ? (
                    <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="font-mono text-sm">{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import type { PlotData } from "./upload-section"

interface RoomAreas {
  livingRoom: number
  masterBedroom: number
  bedroom2: number
  kitchen: number
  bathroom: number
  unit: string
}

interface MaterialsTabProps {
  plotData: PlotData
  roomAreas: RoomAreas
}

interface MaterialRecommendation {
  rank: number
  name: string
  score: number
  cost: string
  strength: string
  durability: string
  note: string
  unitRate: number // Cost per unit (sq ft or running ft)
  rateUnit: string
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return "bg-[#0F6E56] text-white"
  if (score >= 0.6) return "bg-[#BA7517] text-white"
  return "bg-red-600 text-white"
}

function getCostBadgeColor(cost: string): string {
  if (cost === "Low") return "bg-[#0F6E56]/20 text-[#0F6E56] border-[#0F6E56]/30"
  if (cost === "Medium" || cost === "Low-Med") return "bg-[#BA7517]/20 text-[#BA7517] border-[#BA7517]/30"
  return "bg-[#E07B54]/20 text-[#E07B54] border-[#E07B54]/30"
}

function MaterialCard({ 
  material, 
  animationDelay,
  quantity,
  quantityUnit,
  totalCost
}: { 
  material: MaterialRecommendation
  animationDelay: number
  quantity: number
  quantityUnit: string
  totalCost: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay)
    return () => clearTimeout(timer)
  }, [animationDelay])

  return (
    <div 
      ref={cardRef}
      className={`bg-[#1a1a24] rounded-xl p-5 border border-[#2a2a35] hover:border-[#0F6E56]/30 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[#888780] text-sm">#{material.rank}</span>
          <h4 className="font-semibold text-[#e8e6de]">{material.name}</h4>
        </div>
        <span className={`px-2 py-1 rounded-md text-sm font-bold ${getScoreColor(material.score)}`}>
          {material.score.toFixed(2)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className={getCostBadgeColor(material.cost)}>
          Cost: {material.cost}
        </Badge>
        <Badge variant="outline" className="bg-[#534AB7]/20 text-[#534AB7] border-[#534AB7]/30">
          Strength: {material.strength}
        </Badge>
        <Badge variant="outline" className="bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30">
          Durability: {material.durability}
        </Badge>
      </div>

      {/* Quantity and Cost Estimate */}
      <div className="bg-[#0a0a0f] rounded-lg p-3 mb-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#888780]">Estimated Quantity:</span>
          <span className="text-[#e8e6de] font-medium">{quantity.toLocaleString()} {quantityUnit}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#888780]">Rate:</span>
          <span className="text-[#e8e6de] font-medium">Rs. {material.unitRate}/{material.rateUnit}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-[#2a2a35] pt-2">
          <span className="text-[#888780]">Estimated Cost:</span>
          <span className="text-[#0F6E56] font-bold">Rs. {totalCost.toLocaleString()}</span>
        </div>
      </div>

      <p className="text-sm text-[#888780] italic">{material.note}</p>
    </div>
  )
}

function ScoreChart({ materials, title, chartType }: { materials: MaterialRecommendation[]; title: string; chartType: 'load-bearing' | 'partition' | 'floor' }) {
  // Different color schemes for different chart types
  const getBarColor = (score: number) => {
    if (chartType === 'load-bearing') {
      // Red/Orange theme for load-bearing
      if (score >= 0.8) return 'bg-gradient-to-r from-[#DC2626] to-[#EF4444]'
      if (score >= 0.6) return 'bg-gradient-to-r from-[#EA580C] to-[#F97316]'
      return 'bg-gradient-to-r from-[#991B1B] to-[#B91C1C]'
    } else if (chartType === 'partition') {
      // Blue/Cyan theme for partition
      if (score >= 0.8) return 'bg-gradient-to-r from-[#0891B2] to-[#22D3EE]'
      if (score >= 0.6) return 'bg-gradient-to-r from-[#0E7490] to-[#06B6D4]'
      return 'bg-gradient-to-r from-[#164E63] to-[#155E75]'
    } else {
      // Amber/Yellow theme for floor
      if (score >= 0.8) return 'bg-gradient-to-r from-[#D97706] to-[#FBBF24]'
      if (score >= 0.6) return 'bg-gradient-to-r from-[#B45309] to-[#F59E0B]'
      return 'bg-gradient-to-r from-[#92400E] to-[#B45309]'
    }
  }

  const getTitleColor = () => {
    if (chartType === 'load-bearing') return 'text-[#EF4444]'
    if (chartType === 'partition') return 'text-[#22D3EE]'
    return 'text-[#FBBF24]'
  }

  return (
    <div className="bg-[#1a1a24] rounded-xl p-5 border border-[#2a2a35]">
      <h4 className={`text-sm font-medium mb-4 ${getTitleColor()}`}>{title} Score Comparison</h4>
      <div className="space-y-3">
        {materials.map((m) => (
          <div key={m.name} className="flex items-center gap-3">
            <span className="text-sm text-[#e8e6de] w-32 truncate">{m.name}</span>
            <div className="flex-1 h-6 bg-[#0a0a0f] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${getBarColor(m.score)}`}
                style={{ width: `${m.score * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-[#888780] w-12">{(m.score * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MaterialsTab({ plotData, roomAreas }: MaterialsTabProps) {
  // Calculate wall lengths and areas based on plot dimensions
  const widthFt = plotData.width
  const lengthFt = plotData.length
  
  // Perimeter for outer walls (load-bearing)
  const perimeterFt = 2 * (widthFt + lengthFt)
  
  // Internal wall lengths (estimated based on layout)
  const internalLoadBearingFt = widthFt * 0.4 + lengthFt * 0.6 // Vertical + horizontal dividers
  const partitionWallsFt = lengthFt * 0.5 + widthFt * 0.3 // Kitchen/bath partitions
  
  // Wall heights (standard 10 ft)
  const wallHeightFt = 10
  
  // Wall areas
  const outerWallAreaSqFt = perimeterFt * wallHeightFt
  const internalLoadBearingAreaSqFt = internalLoadBearingFt * wallHeightFt
  const partitionAreaSqFt = partitionWallsFt * wallHeightFt
  
  // Floor area
  const floorAreaSqFt = plotData.area

  // Materials with cost estimates
  const loadBearingMaterials: MaterialRecommendation[] = [
    {
      rank: 1,
      name: "Red Brick",
      score: 0.82,
      cost: "Medium",
      strength: "High",
      durability: "Medium",
      note: "Recommended for spans under 5m with high load",
      unitRate: 85,
      rateUnit: "sq ft"
    },
    {
      rank: 2,
      name: "Fly Ash Brick",
      score: 0.74,
      cost: "Low",
      strength: "Medium-High",
      durability: "High",
      note: "Cost-effective alternative, good thermal insulation",
      unitRate: 65,
      rateUnit: "sq ft"
    },
    {
      rank: 3,
      name: "RCC",
      score: 0.91,
      cost: "High",
      strength: "Very High",
      durability: "Very High",
      note: `Required for the ${(widthFt * 0.6 * 0.3048).toFixed(1)}m span`,
      unitRate: 180,
      rateUnit: "sq ft"
    }
  ]

  const partitionMaterials: MaterialRecommendation[] = [
    {
      rank: 1,
      name: "AAC Blocks",
      score: 0.88,
      cost: "Low",
      strength: "Medium",
      durability: "High",
      note: "Lightweight, ideal for non-structural interior walls",
      unitRate: 55,
      rateUnit: "sq ft"
    },
    {
      rank: 2,
      name: "Hollow Concrete Block",
      score: 0.71,
      cost: "Low-Med",
      strength: "Medium",
      durability: "Medium",
      note: "Good for bathroom/kitchen partition walls",
      unitRate: 70,
      rateUnit: "sq ft"
    }
  ]

  const floorMaterials: MaterialRecommendation[] = [
    {
      rank: 1,
      name: "RCC Slab",
      score: 0.95,
      cost: "High",
      strength: "Very High",
      durability: "Very High",
      note: "Standard for residential floor slabs",
      unitRate: 220,
      rateUnit: "sq ft"
    }
  ]

  // Calculate totals
  const totalLoadBearingArea = outerWallAreaSqFt + internalLoadBearingAreaSqFt
  const totalPartitionArea = partitionAreaSqFt

  // Calculate costs for recommended materials
  const loadBearingCost = Math.round(totalLoadBearingArea * loadBearingMaterials[0].unitRate)
  const partitionCost = Math.round(totalPartitionArea * partitionMaterials[0].unitRate)
  const floorCost = Math.round(floorAreaSqFt * floorMaterials[0].unitRate)
  const totalEstimatedCost = loadBearingCost + partitionCost + floorCost

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-xl p-4">
          <p className="text-sm text-[#888780] mb-1">Load-Bearing Walls</p>
          <p className="text-2xl font-bold text-[#EF4444]">{totalLoadBearingArea.toLocaleString()} sq ft</p>
          <p className="text-xs text-[#888780] mt-1">{perimeterFt.toFixed(0)} ft perimeter + {internalLoadBearingFt.toFixed(0)} ft internal</p>
        </div>
        <div className="bg-[#0891B2]/10 border border-[#0891B2]/30 rounded-xl p-4">
          <p className="text-sm text-[#888780] mb-1">Partition Walls</p>
          <p className="text-2xl font-bold text-[#22D3EE]">{totalPartitionArea.toLocaleString()} sq ft</p>
          <p className="text-xs text-[#888780] mt-1">{partitionWallsFt.toFixed(0)} running feet</p>
        </div>
        <div className="bg-[#BA7517]/10 border border-[#BA7517]/30 rounded-xl p-4">
          <p className="text-sm text-[#888780] mb-1">Floor Area</p>
          <p className="text-2xl font-bold text-[#BA7517]">{floorAreaSqFt.toLocaleString()} sq ft</p>
          <p className="text-xs text-[#888780] mt-1">{plotData.width.toFixed(0)} x {plotData.length.toFixed(0)} ft</p>
        </div>
        <div className="bg-[#E07B54]/10 border border-[#E07B54]/30 rounded-xl p-4">
          <p className="text-sm text-[#888780] mb-1">Est. Material Cost</p>
          <p className="text-2xl font-bold text-[#E07B54]">Rs. {totalEstimatedCost.toLocaleString()}</p>
          <p className="text-xs text-[#888780] mt-1">Based on recommended materials</p>
        </div>
      </div>

      {/* Load-Bearing Walls */}
      <div>
        <h3 className="text-xl font-semibold text-[#e8e6de] mb-4 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
          Load-Bearing Walls
          <span className="text-sm font-normal text-[#888780] ml-2">({totalLoadBearingArea.toLocaleString()} sq ft total)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {loadBearingMaterials.map((material, i) => (
            <MaterialCard 
              key={material.name} 
              material={material} 
              animationDelay={i * 100}
              quantity={Math.round(totalLoadBearingArea)}
              quantityUnit="sq ft"
              totalCost={Math.round(totalLoadBearingArea * material.unitRate)}
            />
          ))}
        </div>
        <ScoreChart materials={loadBearingMaterials} title="Load-Bearing" chartType="load-bearing" />
      </div>

      {/* Partition Walls */}
      <div>
        <h3 className="text-xl font-semibold text-[#e8e6de] mb-4 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#22D3EE]" />
          Partition Walls
          <span className="text-sm font-normal text-[#888780] ml-2">({totalPartitionArea.toLocaleString()} sq ft total)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {partitionMaterials.map((material, i) => (
            <MaterialCard 
              key={material.name} 
              material={material} 
              animationDelay={i * 100 + 300}
              quantity={Math.round(totalPartitionArea)}
              quantityUnit="sq ft"
              totalCost={Math.round(totalPartitionArea * material.unitRate)}
            />
          ))}
        </div>
        <ScoreChart materials={partitionMaterials} title="Partition" chartType="partition" />
      </div>

      {/* Floor Slab */}
      <div>
        <h3 className="text-xl font-semibold text-[#e8e6de] mb-4 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#BA7517]" />
          Floor Slab
          <span className="text-sm font-normal text-[#888780] ml-2">({floorAreaSqFt.toLocaleString()} sq ft total)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {floorMaterials.map((material, i) => (
            <MaterialCard 
              key={material.name} 
              material={material} 
              animationDelay={i * 100 + 500}
              quantity={Math.round(floorAreaSqFt)}
              quantityUnit="sq ft"
              totalCost={Math.round(floorAreaSqFt * material.unitRate)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

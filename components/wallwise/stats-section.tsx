"use client"

import { useEffect, useRef, useState } from "react"
import { Layers, Home, DoorOpen, Ruler } from "lucide-react"

const stats = [
  { label: "Walls Detected", value: 59, suffix: "", icon: Layers, color: "#0F6E56" },
  { label: "Rooms Mapped", value: 4, suffix: "", icon: Home, color: "#534AB7" },
  { label: "Openings Found", value: 9, suffix: "", icon: DoorOpen, color: "#BA7517" },
  { label: "Total Area", value: 87.4, suffix: " m²", icon: Ruler, color: "#3B82F6", decimals: 1 }
]

function AnimatedCounter({ 
  target, 
  suffix = "", 
  decimals = 0,
  shouldAnimate 
}: { 
  target: number; 
  suffix?: string;
  decimals?: number;
  shouldAnimate: boolean;
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!shouldAnimate) return

    const duration = 2000
    const steps = 60
    const increment = target / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(target, increment * step)
      setCount(current)

      if (step >= steps) {
        setCount(target)
        clearInterval(timer)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [target, shouldAnimate])

  return (
    <span>
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}
      {suffix}
    </span>
  )
}

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-[#12121a]" id="stats">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={`
                  relative bg-[#0a0a0f] rounded-2xl p-6 border border-[#2a2a35] text-center
                  transition-all duration-700 hover:border-opacity-50 group
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={{ 
                  transitionDelay: `${index * 100}ms`,
                  borderTopColor: stat.color,
                  borderTopWidth: '2px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 10px 40px -10px ${stat.color}30`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <Icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                
                <div 
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ color: stat.color }}
                >
                  <AnimatedCounter 
                    target={stat.value} 
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                    shouldAnimate={isVisible}
                  />
                </div>
                
                <p className="text-[#888780] text-sm font-medium">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

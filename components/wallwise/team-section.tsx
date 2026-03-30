"use client"

import { useEffect, useRef, useState } from "react"
import { ScanLine, GitBranch, Box, Sparkles } from "lucide-react"

const teamMembers = [
  {
    name: "Keshant Chandrakar",
    role: "Floor Plan Parser",
    stages: "Stage 1 & 2",
    icon: ScanLine,
    color: "#0F6E56",
    avatar: "KC"
  },
  {
    name: "Prachet Sinha",
    role: "3D Model Generator",
    stages: "Stage 3",
    icon: Box,
    color: "#BA7517",
    avatar: "PS"
  },
  {
    name: "Krishna Tripathi",
    role: "Material Engine",
    stages: "Stage 4",
    icon: GitBranch,
    color: "#534AB7",
    avatar: "KT"
  },
  {
    name: "Anurag Soni",
    role: "AI Explainer & Integration",
    stages: "Stage 5",
    icon: Sparkles,
    color: "#3B82F6",
    avatar: "AS"
  }
]

export function TeamSection() {
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
    <section ref={sectionRef} className="py-24 px-4 bg-[#12121a]" id="team">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 tracking-tight text-[#e8e6de] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Team Prompt Disruptor
          </h2>
          <p className={`text-[#888780] text-lg transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Meet the minds behind the intelligence
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, index) => {
            const Icon = member.icon
            return (
              <div
                key={member.name}
                className={`
                  relative bg-[#0a0a0f] rounded-2xl p-6 border border-[#2a2a35] 
                  hover:border-opacity-50 transition-all duration-500 group text-center
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={{ 
                  transitionDelay: `${index * 100 + 200}ms`,
                  borderTopColor: member.color,
                  borderTopWidth: '3px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 10px 40px -10px ${member.color}40`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Avatar */}
                <div 
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${member.color}20`, color: member.color }}
                >
                  {member.avatar}
                </div>

                {/* Name */}
                <h3 className="text-lg font-semibold text-[#e8e6de] mb-1">{member.name}</h3>

                {/* Role */}
                <p className="text-[#888780] text-sm mb-3">{member.role}</p>

                {/* Stage Badge */}
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${member.color}20`, color: member.color }}
                >
                  <Icon className="w-3 h-3" />
                  {member.stages}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

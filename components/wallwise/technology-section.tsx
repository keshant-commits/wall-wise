"use client"

import { useEffect, useRef, useState } from "react"

const technologies = [
  { name: "OpenCV", color: "#5C3EE8" },
  { name: "NumPy", color: "#013243" },
  { name: "Shapely", color: "#3B7A57" },
  { name: "Three.js", color: "#000000" },
  { name: "Python", color: "#3776AB" },
  { name: "React", color: "#61DAFB" },
  { name: "Tailwind CSS", color: "#06B6D4" },
  { name: "Claude AI", color: "#D97706" }
]

export function TechnologySection() {
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
    <section ref={sectionRef} className="py-24 px-4 bg-[#0a0a0f]" id="technology">
      <div className="max-w-4xl mx-auto text-center">
        {/* Section Header */}
        <h2 className={`text-4xl md:text-5xl font-bold mb-4 tracking-tight text-[#e8e6de] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          Built With
        </h2>
        <p className={`text-[#888780] text-lg mb-12 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          Powered by industry-leading technologies
        </p>

        {/* Technology Badges */}
        <div className="flex flex-wrap justify-center gap-4">
          {technologies.map((tech, index) => (
            <div
              key={tech.name}
              className={`
                px-5 py-3 rounded-full bg-[#12121a] border border-[#2a2a35] 
                hover:border-[#0F6E56]/50 transition-all duration-300 cursor-default
                hover:scale-105 hover:shadow-lg
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
              `}
              style={{ 
                transitionDelay: `${index * 50 + 200}ms`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 5px 20px -5px ${tech.color}40`
                e.currentTarget.style.borderColor = tech.color
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = ''
              }}
            >
              <span className="font-medium text-[#e8e6de]">{tech.name}</span>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <p className={`text-sm text-[#888780] mt-12 transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '600ms' }}>
          Computer Vision • Graph Algorithms • 3D Rendering • AI/ML • Modern Web Stack
        </p>
      </div>
    </section>
  )
}

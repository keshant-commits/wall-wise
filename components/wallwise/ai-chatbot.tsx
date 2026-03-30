"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2, Maximize2, Trash2, Home } from "lucide-react"
import type { RoomConfig } from "./upload-section"

interface Message {
  role: "user" | "assistant"
  content: string
  floorPlan?: {
    planType: string
    rooms: RoomConfig[]
    area: number
    shape: string
  }
}

interface AIChatbotProps {
  onGenerateFloorPlan?: (planType: string, rooms: RoomConfig[], area: number) => void
}

// Validate floor plan coordinates - minimal fixes only, preserve L-shapes
function validateAndFixFloorPlan(rooms: RoomConfig[]): RoomConfig[] {
  // Just ensure all values are valid numbers between 0 and 1
  return rooms.map(room => ({
    ...room,
    x: Math.max(0, Math.min(1, Number(room.x) || 0)),
    y: Math.max(0, Math.min(1, Number(room.y) || 0)),
    width: Math.max(0.1, Math.min(1, Number(room.width) || 0.2)),
    height: Math.max(0.1, Math.min(1, Number(room.height) || 0.2))
  }))
}

export function AIChatbot({ onGenerateFloorPlan }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm WallWise AI Assistant. I can help you design custom floor plans, analyze construction materials, and estimate costs.\n\nTo generate a floor plan, just tell me what you need (e.g., '2BHK with study room') and I'll ask you a few questions about area and layout preference before creating it.\n\nHow can I assist you today?"
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }]
        })
      })

      const data = await response.json()

      if (data.success) {
        // Check if the response contains a floor plan JSON
        let floorPlan = undefined
        
        // Try multiple patterns for extracting JSON
        const jsonPatterns = [
          /```json\s*([\s\S]*?)\s*```/,
          /```\s*([\s\S]*?)\s*```/,
          /\{[\s\S]*"planType"[\s\S]*"rooms"[\s\S]*\}/
        ]
        
        for (const pattern of jsonPatterns) {
          const match = data.message.match(pattern)
          if (match) {
            try {
              // Clean the JSON string - remove any trailing commas, comments, fix common issues
              let jsonStr = match[1] || match[0]
              
              // Step 1: Remove comments
              jsonStr = jsonStr
                .replace(/\/\/.*$/gm, '')     // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
              
              // Step 2: Extract just the JSON object
              const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/)
              if (!jsonObjMatch) continue
              jsonStr = jsonObjMatch[0]
              
              // Step 3: Fix common JSON issues
              jsonStr = jsonStr
                .replace(/,\s*}/g, '}')       // Remove trailing commas before }
                .replace(/,\s*]/g, ']')       // Remove trailing commas before ]
                .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Add quotes to unquoted keys
                .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single-quoted values
                .replace(/"\s*\n\s*"/g, '" "') // Fix broken strings across lines
                .trim()
              
              const parsed = JSON.parse(jsonStr)
              if (parsed.planType && parsed.rooms && Array.isArray(parsed.rooms)) {
                // Validate and fix the floor plan coordinates
                const fixedRooms = validateAndFixFloorPlan(parsed.rooms)
                floorPlan = {
                  planType: parsed.planType,
                  rooms: fixedRooms,
                  area: parsed.area || 1200,
                  shape: parsed.shape || "box"
                }
                break // Successfully parsed, exit loop
              }
            } catch {
              // Try next pattern silently
              continue
            }
          }
        }
        
        setMessages(prev => [...prev, { role: "assistant", content: data.message, floorPlan }])
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Sorry, I encountered an error. Please try again." 
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I couldn't connect to the server. Please check your connection and try again." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm WallWise AI Assistant. I can help you design custom floor plans, analyze construction materials, and estimate costs.\n\nTo generate a floor plan, just tell me what you need (e.g., '2BHK with study room') and I'll ask you a few questions about area and layout preference before creating it.\n\nHow can I assist you today?"
      }
    ])
  }

  const suggestedQuestions = [
    "I want a 2BHK floor plan",
    "Create a 3BHK with pooja room",
    "What materials are best for walls?",
    "Estimate construction costs"
  ]

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#0F6E56] to-[#534AB7] text-white shadow-lg hover:shadow-xl hover:shadow-[#0F6E56]/30 transition-all duration-300 flex items-center justify-center group ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-10 right-0 bg-[#12121a] text-[#e8e6de] text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[#2a2a35]">
          AI Assistant
        </span>
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          isOpen 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div 
          className={`bg-[#12121a] rounded-2xl border border-[#2a2a35] shadow-2xl shadow-black/50 overflow-hidden transition-all duration-300 ${
            isMinimized 
              ? 'w-72 h-14' 
              : 'w-[380px] h-[550px] sm:w-[400px]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F6E56] to-[#534AB7] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">WallWise AI</h3>
                {!isMinimized && (
                  <p className="text-white/70 text-xs">Construction Expert</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && (
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-white" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-white" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Chat Content - Hidden when minimized */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="h-[400px] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#2a2a35] scrollbar-track-transparent">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div 
                      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                        message.role === "user" 
                          ? "bg-[#534AB7]" 
                          : "bg-[#0F6E56]"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        message.role === "user"
                          ? "bg-[#534AB7] text-white rounded-tr-md"
                          : "bg-[#1a1a24] text-[#e8e6de] border border-[#2a2a35] rounded-tl-md"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Show Generate Floor Plan button if AI generated a valid floor plan */}
                      {message.floorPlan && onGenerateFloorPlan && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-[#888780] flex justify-between">
                            <span>Area: {message.floorPlan.area} sq.ft</span>
                            <span>Shape: {message.floorPlan.shape}</span>
                          </div>
                          <button
                            onClick={() => {
                              onGenerateFloorPlan(
                                message.floorPlan!.planType,
                                message.floorPlan!.rooms,
                                message.floorPlan!.area
                              )
                              setIsOpen(false)
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0F6E56] to-[#534AB7] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                          >
                            <Home className="w-4 h-4" />
                            Generate This Floor Plan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0F6E56] flex-shrink-0 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-[#1a1a24] border border-[#2a2a35] rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-[#0F6E56] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-[#0F6E56] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-[#0F6E56] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Suggested Questions - Only show at start */}
                {messages.length === 1 && !isLoading && (
                  <div className="pt-2">
                    <p className="text-xs text-[#888780] mb-2">Suggested questions:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(q)
                            inputRef.current?.focus()
                          }}
                          className="text-xs px-3 py-1.5 bg-[#1a1a24] border border-[#2a2a35] rounded-full text-[#888780] hover:text-[#e8e6de] hover:border-[#0F6E56]/50 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-[#2a2a35]">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about construction, materials..."
                    className="flex-1 bg-[#1a1a24] border border-[#2a2a35] rounded-xl px-4 py-2.5 text-sm text-[#e8e6de] placeholder:text-[#888780] focus:outline-none focus:border-[#0F6E56]/50 transition-colors"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="bg-gradient-to-r from-[#0F6E56] to-[#534AB7] hover:opacity-90 rounded-xl px-4 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-[#888780] mt-2 text-center">
                  Powered by Groq AI
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

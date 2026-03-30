"use client"

import { Github, Linkedin, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="py-12 px-4 bg-[#0a0a0f] border-t border-[#2a2a35]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-[#e8e6de] mb-1">
              <span className="bg-gradient-to-r from-[#0F6E56] to-[#534AB7] bg-clip-text text-transparent">
                WallWise
              </span>
            </h3>
            <p className="text-[#888780] text-sm">Hackathon 2026</p>
            <p className="text-[#888780] text-xs mt-1">Autonomous Structural Intelligence System</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-lg bg-[#12121a] border border-[#2a2a35] flex items-center justify-center text-[#888780] hover:text-[#e8e6de] hover:border-[#0F6E56] transition-all"
            >
              <Github className="w-5 h-5" />
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-lg bg-[#12121a] border border-[#2a2a35] flex items-center justify-center text-[#888780] hover:text-[#e8e6de] hover:border-[#0F6E56] transition-all"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-lg bg-[#12121a] border border-[#2a2a35] flex items-center justify-center text-[#888780] hover:text-[#e8e6de] hover:border-[#0F6E56] transition-all"
            >
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-[#2a2a35] text-center">
          <p className="text-[#888780] text-sm">
            Built with care by Team Prompt Disruptor
          </p>
          <p className="text-[#888780]/50 text-xs mt-2">
            © 2026 WallWise. For demonstration purposes only.
          </p>
        </div>
      </div>
    </footer>
  )
}

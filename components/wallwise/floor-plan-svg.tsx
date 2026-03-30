"use client"

import type { PlotData, RoomConfig } from "./upload-section"

interface FloorPlanSVGProps {
  plotData: PlotData
}

// Room type colors
const roomColors: Record<string, string> = {
  living: "#0F6E56",
  bedroom: "#534AB7",
  kitchen: "#BA7517",
  bathroom: "#3B82F6",
  dining: "#E07B54",
  study: "#8B5CF6",
  balcony: "#10B981",
  hall: "#6B7280",
  entry: "#F59E0B",
  garage: "#4B5563",
  storage: "#9CA3AF",
  utility: "#78716C",
  pooja: "#F97316"
}

// Door configuration - determines which room types have doors and where
interface DoorConfig {
  roomIndex: number
  side: 'top' | 'bottom' | 'left' | 'right'
  position: number // 0-1 position along the wall
  width: number // door width as fraction of wall
}

// Window configuration
interface WindowConfig {
  side: 'top' | 'bottom' | 'left' | 'right'
  position: number
  width: number
}

export function FloorPlanSVG({ plotData }: FloorPlanSVGProps) {
  // Convert to meters for display
  const widthM = (plotData.width * 0.3048).toFixed(2)
  const lengthM = (plotData.length * 0.3048).toFixed(2)
  
  const svgWidth = 600
  const svgHeight = 450
  const padding = 50
  const drawWidth = svgWidth - padding * 2
  const drawHeight = svgHeight - padding - 70

  const formatRoomArea = (room: RoomConfig) => {
    const roomAreaSqFt = plotData.area * room.width * room.height
    return `${(roomAreaSqFt * 0.0929).toFixed(1)} m²`
  }

  const getRoomDimensions = (room: RoomConfig) => {
    const roomWidthM = (plotData.width * room.width * 0.3048).toFixed(1)
    const roomHeightM = (plotData.length * room.height * 0.3048).toFixed(1)
    return `${roomWidthM}m x ${roomHeightM}m`
  }

  // Check if door should exist between two room types
  const shouldHaveDoor = (room1Type: string, room2Type: string, room1Name: string, room2Name: string): boolean => {
    const pair = [room1Type, room2Type].sort().join('-')
    const name1Lower = room1Name.toLowerCase()
    const name2Lower = room2Name.toLowerCase()
    
    // Special case: Bedroom 2 connects to Bath 2 in 2BHK and 3BHK
    if (pair === 'bathroom-bedroom') {
      const isBedroom2 = name1Lower.includes('bedroom 2') || name2Lower.includes('bedroom 2')
      const isBath2 = name1Lower.includes('bath 2') || name2Lower.includes('bath 2')
      if (isBedroom2 && isBath2) return true
      // Otherwise block bedroom-bathroom connections
      return false
    }
    
    // Special case: Master Bedroom connects to Dining in 3BHK
    if (pair === 'bedroom-dining') {
      const isMaster = name1Lower.includes('master') || name2Lower.includes('master')
      if (isMaster) return true
    }
    
    // Special case: Master Bedroom connects to Bedroom 2 in 3BHK
    if (pair === 'bedroom-bedroom') {
      const isMaster = name1Lower.includes('master') || name2Lower.includes('master')
      const isBedroom2 = name1Lower.includes('bedroom 2') || name2Lower.includes('bedroom 2')
      if (isMaster && isBedroom2) return true
      return false
    }
    
    // Hall/Passage connects to ALL adjacent rooms (it's a corridor)
    if (room1Type === 'hall' || room2Type === 'hall') {
      // Hall connects to everything except balcony
      const otherType = room1Type === 'hall' ? room2Type : room1Type
      if (otherType !== 'balcony') return true
    }
    
    // Explicitly blocked connections
    const blockedConnections = [
      'bedroom-entry',      // No door between Entry and Bedroom
      'bathroom-kitchen',   // No door between Kitchen and Bath
      'balcony-bathroom',   // No door between Balcony and Bath
      'balcony-kitchen',    // No door between Balcony and Kitchen
    ]
    
    if (blockedConnections.includes(pair)) return false
    
    // Explicitly allowed connections
    const allowedConnections = [
      'entry-living',       // Entry connects to Living
      'kitchen-living',     // Kitchen connects to Living
      'kitchen-dining',     // Kitchen connects to Dining
      'bedroom-living',     // Bedroom connects to Living
      'bathroom-living',    // Bathroom connects to Living
      'balcony-bedroom',    // Balcony connects to Bedroom
      'balcony-living',     // Balcony can connect to Living
      'balcony-hall',       // Balcony connects to Passage
      'dining-kitchen',     // Dining connects to Kitchen
      'dining-living',      // Dining connects to Living
      'hall-bedroom',       // Hall/Passage connects to all Bedrooms (including Bedroom 3)
      'hall-living',        // Hall connects to Living
      'hall-bathroom',      // Hall connects to Bathroom
      'entry-hall',         // Entry connects to Hall/Passage
    ]
    
    return allowedConnections.includes(pair)
  }

  // Generate doors based on room adjacency and allowed connections
  const generateDoors = (): DoorConfig[] => {
    const doors: DoorConfig[] = []
    const rooms = plotData.rooms

    rooms.forEach((room, index) => {
      // Entry rooms get a main door on left wall (exterior entry)
      if (room.type === 'entry') {
        if (room.x === 0) {
          doors.push({ roomIndex: index, side: 'left', position: 0.5, width: 0.15 })
        } else {
          doors.push({ roomIndex: index, side: 'bottom', position: 0.4, width: 0.1 })
        }
      }

      // Check for adjacent rooms and add internal doors based on allowed connections
      rooms.forEach((otherRoom, otherIndex) => {
        if (index >= otherIndex) return // Avoid duplicates

        // Check if these room types should have a door between them
        if (!shouldHaveDoor(room.type, otherRoom.type, room.name, otherRoom.name)) return

        // Check if rooms share a wall (horizontally adjacent)
        if (Math.abs((room.x + room.width) - otherRoom.x) < 0.01) {
          const overlapStart = Math.max(room.y, otherRoom.y)
          const overlapEnd = Math.min(room.y + room.height, otherRoom.y + otherRoom.height)
          if (overlapEnd > overlapStart) {
            const doorPos = (overlapStart + overlapEnd) / 2 / room.height - room.y / room.height
            doors.push({ roomIndex: index, side: 'right', position: Math.min(0.7, Math.max(0.3, doorPos)), width: 0.25 })
          }
        }

        // Check if rooms share a wall (vertically adjacent)
        if (Math.abs((room.y + room.height) - otherRoom.y) < 0.01) {
          const overlapStart = Math.max(room.x, otherRoom.x)
          const overlapEnd = Math.min(room.x + room.width, otherRoom.x + otherRoom.width)
          if (overlapEnd > overlapStart) {
            // Special case: hall-living door should be positioned more to the right (on passage boundary)
            const isHallLiving = (room.type === 'hall' && otherRoom.type === 'living') || 
                                  (room.type === 'living' && otherRoom.type === 'hall')
            let doorPos: number
            if (isHallLiving) {
              // Position door at 75% of overlap (more to the right)
              doorPos = (overlapStart + (overlapEnd - overlapStart) * 0.75) / room.width - room.x / room.width
            } else {
              doorPos = (overlapStart + overlapEnd) / 2 / room.width - room.x / room.width
            }
            doors.push({ roomIndex: index, side: 'bottom', position: Math.min(0.8, Math.max(0.2, doorPos)), width: 0.2 })
          }
        }
      })
    })

    return doors
  }

  // Generate windows on exterior walls
  const generateWindows = (): WindowConfig[] => {
    const windows: WindowConfig[] = []
    const rooms = plotData.rooms

    rooms.forEach((room) => {
      // Windows on top wall (exterior)
      if (room.y === 0 && room.type !== 'bathroom' && room.type !== 'entry') {
        windows.push({ side: 'top', position: room.x + room.width * 0.5, width: room.width * 0.4 })
      }

      // Windows on right wall (exterior) for bedrooms and living rooms
      if (room.x + room.width >= 0.99 && (room.type === 'bedroom' || room.type === 'living')) {
        windows.push({ side: 'right', position: room.y + room.height * 0.4, width: room.height * 0.35 })
      }

      // Windows for balcony (larger openings)
      if (room.type === 'balcony') {
        if (room.y === 0) {
          windows.push({ side: 'top', position: room.x + room.width * 0.5, width: room.width * 0.7 })
        }
        if (room.x + room.width >= 0.99) {
          windows.push({ side: 'right', position: room.y + room.height * 0.5, width: room.height * 0.6 })
        }
      }
    })

    return windows
  }

  const doors = generateDoors()
  const windows = generateWindows()

  return (
    <div className="bg-white rounded-xl p-4 overflow-auto">
      {/* Plot Info Banner */}
      <div className="mb-4 p-3 bg-[#f5f5f5] rounded-lg flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Total Plot Area:</span>
          <span className="font-bold text-[#0F6E56]">{plotData.area.toLocaleString()} {plotData.displayUnit}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Dimensions:</span>
          <span className="font-bold text-[#534AB7]">{widthM}m x {lengthM}m</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Rooms:</span>
          <span className="font-bold text-[#BA7517]">{plotData.rooms.length}</span>
        </div>
      </div>

      <svg 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto min-w-[500px]"
        style={{ backgroundColor: 'white' }}
      >
        {/* Definitions */}
        <defs>
          <marker id="arrowStart" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
            <path d="M10,0 L10,6 L0,3 z" fill="#666" />
          </marker>
          <marker id="arrowEnd" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto">
            <path d="M0,0 L10,3 L0,6 z" fill="#666" />
          </marker>
        </defs>

        {/* Outer Walls - Load Bearing (Thick) */}
        <rect 
          x={padding} 
          y={padding} 
          width={drawWidth} 
          height={drawHeight} 
          fill="none" 
          stroke="#1a1a1a" 
          strokeWidth="8" 
        />

        {/* Room fills and labels */}
        {plotData.rooms.map((room, index) => {
          const roomX = padding + room.x * drawWidth
          const roomY = padding + room.y * drawHeight
          const roomW = room.width * drawWidth
          const roomH = room.height * drawHeight
          const color = roomColors[room.type] || "#888"
          
          const minDimension = Math.min(roomW, roomH)
          const nameFontSize = Math.max(8, Math.min(14, minDimension * 0.15))
          const areaFontSize = Math.max(7, Math.min(11, minDimension * 0.12))
          const dimFontSize = Math.max(6, Math.min(9, minDimension * 0.1))
          
          const showArea = roomH > 35
          const showDimensions = roomH > 55 && roomW > 60
          
          const lineHeight = nameFontSize * 1.4
          const totalTextHeight = nameFontSize + (showArea ? areaFontSize + 4 : 0) + (showDimensions ? dimFontSize + 4 : 0)
          const startY = roomY + (roomH - totalTextHeight) / 2 + nameFontSize * 0.8
          
          return (
            <g key={index}>
              <rect
                x={roomX + 4}
                y={roomY + 4}
                width={roomW - 8}
                height={roomH - 8}
                fill={`${color}15`}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="4"
              />
              
              <text 
                x={roomX + roomW / 2} 
                y={startY} 
                textAnchor="middle" 
                fill="#333"
                fontFamily="sans-serif" 
                fontSize={nameFontSize} 
                fontWeight="600"
              >
                {room.name}
              </text>
              
              {showArea && (
                <text 
                  x={roomX + roomW / 2} 
                  y={startY + lineHeight} 
                  textAnchor="middle" 
                  fill={color}
                  fontFamily="sans-serif" 
                  fontSize={areaFontSize} 
                  fontWeight="600"
                >
                  {formatRoomArea(room)}
                </text>
              )}
              
              {showDimensions && (
                <text 
                  x={roomX + roomW / 2} 
                  y={startY + lineHeight * 2} 
                  textAnchor="middle" 
                  fill="#888"
                  fontFamily="sans-serif" 
                  fontSize={dimFontSize}
                >
                  {getRoomDimensions(room)}
                </text>
              )}
            </g>
          )
        })}

        {/* Internal walls between rooms */}
        {plotData.rooms.map((room, index) => {
          const roomX = padding + room.x * drawWidth
          const roomY = padding + room.y * drawHeight
          const roomW = room.width * drawWidth
          const roomH = room.height * drawHeight
          
          const walls = []
          
          if (room.x + room.width < 0.99) {
            walls.push(
              <line
                key={`${index}-right`}
                x1={roomX + roomW}
                y1={roomY}
                x2={roomX + roomW}
                y2={roomY + roomH}
                stroke="#1a1a1a"
                strokeWidth="3"
              />
            )
          }
          
          if (room.y + room.height < 0.99) {
            walls.push(
              <line
                key={`${index}-bottom`}
                x1={roomX}
                y1={roomY + roomH}
                x2={roomX + roomW}
                y2={roomY + roomH}
                stroke="#1a1a1a"
                strokeWidth="3"
              />
            )
          }
          
          return walls
        })}

        {/* Doors */}
        {doors.map((door, index) => {
          const room = plotData.rooms[door.roomIndex]
          const roomX = padding + room.x * drawWidth
          const roomY = padding + room.y * drawHeight
          const roomW = room.width * drawWidth
          const roomH = room.height * drawHeight
          
          let doorX = 0, doorY = 0, doorW = 30, doorH = 30
          let arcPath = ""
          let isVertical = false
          
          switch (door.side) {
            case 'left':
              doorX = padding - 4
              doorY = roomY + roomH * door.position - 15
              doorW = 8
              doorH = 30
              arcPath = `M ${padding} ${doorY + doorH} Q ${padding + 25} ${doorY + doorH} ${padding + 25} ${doorY + doorH - 25}`
              isVertical = true
              break
            case 'right':
              doorX = roomX + roomW - 4
              doorY = roomY + roomH * door.position - 15
              doorW = 8
              doorH = 30
              arcPath = `M ${roomX + roomW} ${doorY} Q ${roomX + roomW - 25} ${doorY} ${roomX + roomW - 25} ${doorY + 25}`
              isVertical = true
              break
            case 'top':
              doorX = roomX + roomW * door.position - 15
              doorY = padding - 4
              doorW = 30
              doorH = 8
              arcPath = `M ${doorX} ${padding} Q ${doorX} ${padding + 25} ${doorX + 25} ${padding + 25}`
              break
            case 'bottom':
              doorX = roomX + roomW * door.position - 15
              doorY = roomY + roomH - 4
              doorW = 30
              doorH = 8
              arcPath = `M ${doorX} ${roomY + roomH} Q ${doorX} ${roomY + roomH - 25} ${doorX + 25} ${roomY + roomH - 25}`
              break
          }
          
          return (
            <g key={`door-${index}`}>
              {/* Door opening (white gap in wall) */}
              <rect 
                x={doorX} 
                y={doorY} 
                width={doorW} 
                height={doorH} 
                fill="white" 
                stroke="none"
              />
              {/* Door swing arc */}
              <path 
                d={arcPath}
                fill="none" 
                stroke="#1a1a1a" 
                strokeWidth="1.5" 
              />
              {/* Door panel line */}
              {isVertical ? (
                <line 
                  x1={door.side === 'left' ? padding : roomX + roomW} 
                  y1={doorY + doorH / 2} 
                  x2={door.side === 'left' ? padding + 25 : roomX + roomW - 25} 
                  y2={doorY + doorH / 2} 
                  stroke="#1a1a1a" 
                  strokeWidth="2" 
                />
              ) : (
                <line 
                  x1={doorX + doorW / 2} 
                  y1={door.side === 'top' ? padding : roomY + roomH} 
                  x2={doorX + doorW / 2} 
                  y2={door.side === 'top' ? padding + 25 : roomY + roomH - 25} 
                  stroke="#1a1a1a" 
                  strokeWidth="2" 
                />
              )}
            </g>
          )
        })}

        {/* Windows on outer walls */}
        {windows.map((window, index) => {
          let x = 0, y = 0, w = 0, h = 0
          
          switch (window.side) {
            case 'top':
              x = padding + window.position * drawWidth - (window.width * drawWidth) / 2
              y = padding - 5
              w = window.width * drawWidth
              h = 10
              break
            case 'right':
              x = padding + drawWidth - 5
              y = padding + window.position * drawHeight - (window.width * drawHeight) / 2
              w = 10
              h = window.width * drawHeight
              break
            case 'bottom':
              x = padding + window.position * drawWidth - (window.width * drawWidth) / 2
              y = padding + drawHeight - 5
              w = window.width * drawWidth
              h = 10
              break
            case 'left':
              x = padding - 5
              y = padding + window.position * drawHeight - (window.width * drawHeight) / 2
              w = 10
              h = window.width * drawHeight
              break
          }
          
          return (
            <g key={`window-${index}`}>
              {/* Window frame */}
              <rect 
                x={x} 
                y={y} 
                width={w} 
                height={h} 
                fill="white" 
                stroke="#1a1a1a" 
                strokeWidth="1.5" 
              />
              {/* Window panes (double line in middle) */}
              {window.side === 'top' || window.side === 'bottom' ? (
                <>
                  <line x1={x + w/2} y1={y} x2={x + w/2} y2={y + h} stroke="#1a1a1a" strokeWidth="1" />
                  <line x1={x + w/4} y1={y + h/2} x2={x + w*3/4} y2={y + h/2} stroke="#1a1a1a" strokeWidth="0.5" />
                </>
              ) : (
                <>
                  <line x1={x} y1={y + h/2} x2={x + w} y2={y + h/2} stroke="#1a1a1a" strokeWidth="1" />
                  <line x1={x + w/2} y1={y + h/4} x2={x + w/2} y2={y + h*3/4} stroke="#1a1a1a" strokeWidth="0.5" />
                </>
              )}
            </g>
          )
        })}

        {/* Main Entry Door Label */}
        {plotData.rooms.find(r => r.type === 'entry') && (
          <text 
            x={padding - 20} 
            y={padding + drawHeight * 0.92} 
            textAnchor="middle" 
            fill="#E07B54" 
            fontFamily="sans-serif" 
            fontSize="9" 
            fontWeight="600"
            transform={`rotate(-90, ${padding - 20}, ${padding + drawHeight * 0.92})`}
          >
            MAIN ENTRY
          </text>
        )}

        {/* Dimension Lines */}
        <line x1={padding} y1="25" x2={padding + drawWidth} y2="25" stroke="#666" strokeWidth="1" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
        <text x={padding + drawWidth / 2} y="20" textAnchor="middle" fill="#534AB7" fontFamily="sans-serif" fontSize="12" fontWeight="600">{widthM}m</text>

        <line x1={padding + drawWidth + 25} y1={padding} x2={padding + drawWidth + 25} y2={padding + drawHeight} stroke="#666" strokeWidth="1" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)" />
        <text x={padding + drawWidth + 35} y={padding + drawHeight / 2} textAnchor="middle" fill="#534AB7" fontFamily="sans-serif" fontSize="12" fontWeight="600" transform={`rotate(90, ${padding + drawWidth + 35}, ${padding + drawHeight / 2})`}>{lengthM}m</text>

        {/* Scale Bar */}
        <g transform={`translate(${padding}, ${svgHeight - 35})`}>
          <line x1="0" y1="0" x2="100" y2="0" stroke="#1a1a1a" strokeWidth="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#1a1a1a" strokeWidth="2" />
          <line x1="100" y1="-5" x2="100" y2="5" stroke="#1a1a1a" strokeWidth="2" />
          <text x="50" y="15" textAnchor="middle" fill="#666" fontFamily="sans-serif" fontSize="11">
            {(parseFloat(widthM) / 5).toFixed(1)}m
          </text>
        </g>

        {/* Legend */}
        <g transform={`translate(${svgWidth - 200}, ${svgHeight - 45})`}>
          <text x="0" y="0" fill="#666" fontFamily="sans-serif" fontSize="10" fontWeight="600">LEGEND</text>
          
          <line x1="0" y1="15" x2="25" y2="15" stroke="#1a1a1a" strokeWidth="6" />
          <text x="32" y="18" fill="#666" fontFamily="sans-serif" fontSize="9">Load-bearing</text>
          
          <line x1="0" y1="30" x2="25" y2="30" stroke="#1a1a1a" strokeWidth="2" />
          <text x="32" y="33" fill="#666" fontFamily="sans-serif" fontSize="9">Partition</text>
          
          <rect x="90" y="10" width="15" height="8" fill="white" stroke="#1a1a1a" strokeWidth="1" />
          <text x="110" y="18" fill="#666" fontFamily="sans-serif" fontSize="9">Window</text>
          
          <path d="M 90 30 Q 90 22 98 22" fill="none" stroke="#1a1a1a" strokeWidth="1" />
          <text x="110" y="33" fill="#666" fontFamily="sans-serif" fontSize="9">Door</text>
        </g>

        {/* North Arrow */}
        <g transform={`translate(${svgWidth - 30}, ${svgHeight - 40})`}>
          <polygon points="0,20 5,0 10,20 5,15" fill="#666" />
          <text x="5" y="30" textAnchor="middle" fill="#666" fontFamily="sans-serif" fontSize="10" fontWeight="600">N</text>
        </g>
      </svg>
    </div>
  )
}

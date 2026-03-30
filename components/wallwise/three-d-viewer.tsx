"use client"

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { PlotData, RoomConfig } from './upload-section'

interface ThreeDViewerProps {
  plotData: PlotData
}

// Room type colors for 3D labels
const roomTypeColors: Record<string, number> = {
  living: 0x0F6E56,
  bedroom: 0x534AB7,
  kitchen: 0xBA7517,
  bathroom: 0x3B82F6,
  dining: 0xE07B54,
  study: 0x8B5CF6,
  balcony: 0x10B981,
  hall: 0x6B7280,
  entry: 0xF59E0B,
  pooja: 0xF97316,
  garage: 0x4B5563,
  storage: 0x9CA3AF,
  utility: 0x78716C
}

interface SelectedRoom {
  name: string
  type: string
  widthFt: number
  lengthFt: number
  widthM: number
  lengthM: number
  areaSqFt: number
  areaSqM: number
}

interface SelectedWall {
  name: string
  wallType: 'load-bearing' | 'partition'
  lengthFt: number
  lengthM: number
  heightFt: number
  heightM: number
  thicknessFt: number
  thicknessM: number
  areaSqFt: number
  areaSqM: number
}

export function ThreeDViewer({ plotData }: ThreeDViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedRoom, setSelectedRoom] = useState<SelectedRoom | null>(null)
  const [selectedWall, setSelectedWall] = useState<SelectedWall | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    // Calculate dimensions from plot data (convert feet to meters for 3D scale)
    const floorWidth = plotData.width * 0.3048
    const floorDepth = plotData.length * 0.3048
    const wallHeight = 3 // Standard wall height in meters

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0f)

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    const cameraDistance = Math.max(floorWidth, floorDepth) * 1.5
    camera.position.set(cameraDistance, cameraDistance * 0.7, cameraDistance)
    camera.lookAt(0, 0, 0)

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    containerRef.current.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 5
    controls.maxDistance = cameraDistance * 2
    controls.maxPolarAngle = Math.PI / 2.2

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0x0F6E56, 0.5, 50)
    pointLight.position.set(-5, 10, 5)
    scene.add(pointLight)

    // Materials
    const loadBearingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a3a,
      roughness: 0.8,
      metalness: 0.1
    })
    const partitionMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x5a5a5a,
      roughness: 0.9,
      metalness: 0
    })
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a24,
      roughness: 0.95,
      metalness: 0
    })
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.6,
      metalness: 0.1
    })
    const doorFrameMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D3A1A,
      roughness: 0.7,
      metalness: 0.05
    })
    const windowGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0x4FC3F7,
      roughness: 0.05,
      metalness: 0.4,
      transparent: true,
      opacity: 0.5,
      emissive: 0x4FC3F7,
      emissiveIntensity: 0.15
    })
    const windowFrameMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196F3,
      roughness: 0.3,
      metalness: 0.5
    })

    // Floor
    const floorGeometry = new THREE.BoxGeometry(floorWidth, 0.2, floorDepth)
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.position.y = -0.1
    floor.receiveShadow = true
    scene.add(floor)

    // Create clickable room floor meshes for dimension display
    const roomMeshes: THREE.Mesh[] = []
    const roomDataMap = new Map<THREE.Mesh, RoomConfig>()
    
    // Track wall meshes for click detection
    const wallMeshes: THREE.Mesh[] = []
    interface WallData {
      name: string
      wallType: 'load-bearing' | 'partition'
      length: number
      height: number
      thickness: number
    }
    const wallDataMap = new Map<THREE.Mesh, WallData>()
    
    plotData.rooms.forEach((room) => {
      const roomStartX = -floorWidth / 2 + room.x * floorWidth
      const roomStartZ = -floorDepth / 2 + room.y * floorDepth
      const roomW = room.width * floorWidth
      const roomD = room.height * floorDepth
      
      // Create invisible clickable plane for each room
      const roomColor = roomTypeColors[room.type] || 0x888888
      const roomFloorMaterial = new THREE.MeshStandardMaterial({ 
        color: roomColor,
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        opacity: 0.15
      })
      const roomFloorGeom = new THREE.BoxGeometry(roomW - 0.05, 0.02, roomD - 0.05)
      const roomFloor = new THREE.Mesh(roomFloorGeom, roomFloorMaterial)
      roomFloor.position.set(roomStartX + roomW / 2, 0.02, roomStartZ + roomD / 2)
      roomFloor.receiveShadow = true
      scene.add(roomFloor)
      
      roomMeshes.push(roomFloor)
      roomDataMap.set(roomFloor, room)
    })

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      
      const rect = containerRef.current.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      raycaster.setFromCamera(mouse, camera)
      
      // Check walls first (they're more prominent)
      const wallIntersects = raycaster.intersectObjects(wallMeshes)
      
      if (wallIntersects.length > 0) {
        const clickedMesh = wallIntersects[0].object as THREE.Mesh
        const wallData = wallDataMap.get(clickedMesh)
        
        if (wallData) {
          // Convert meters to feet (wall dimensions are in meters)
          const lengthFt = wallData.length / 0.3048
          const heightFt = wallData.height / 0.3048
          const thicknessFt = wallData.thickness / 0.3048
          const areaSqFt = lengthFt * heightFt
          const areaSqM = wallData.length * wallData.height
          
          setSelectedWall({
            name: wallData.name,
            wallType: wallData.wallType,
            lengthFt: lengthFt,
            lengthM: wallData.length,
            heightFt: heightFt,
            heightM: wallData.height,
            thicknessFt: thicknessFt,
            thicknessM: wallData.thickness,
            areaSqFt: areaSqFt,
            areaSqM: areaSqM
          })
          setSelectedRoom(null)
          setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
          
          // Highlight the clicked wall
          wallMeshes.forEach((mesh) => {
            const mat = mesh.material as THREE.MeshStandardMaterial
            if (mesh === clickedMesh) {
              mat.emissive = new THREE.Color(0x0F6E56)
              mat.emissiveIntensity = 0.3
            } else {
              mat.emissive = new THREE.Color(0x000000)
              mat.emissiveIntensity = 0
            }
          })
          return
        }
      }
      
      // Check room floors
      const roomIntersects = raycaster.intersectObjects(roomMeshes)
      
      if (roomIntersects.length > 0) {
        const clickedMesh = roomIntersects[0].object as THREE.Mesh
        const roomData = roomDataMap.get(clickedMesh)
        
        if (roomData) {
          const roomWidthFt = roomData.width * plotData.width
          const roomLengthFt = roomData.height * plotData.length
          const roomWidthM = roomWidthFt * 0.3048
          const roomLengthM = roomLengthFt * 0.3048
          const areaSqFt = roomWidthFt * roomLengthFt
          const areaSqM = roomWidthM * roomLengthM
          
          setSelectedRoom({
            name: roomData.name,
            type: roomData.type,
            widthFt: roomWidthFt,
            lengthFt: roomLengthFt,
            widthM: roomWidthM,
            lengthM: roomLengthM,
            areaSqFt: areaSqFt,
            areaSqM: areaSqM
          })
          setSelectedWall(null)
          setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
          
          // Highlight the clicked room
          roomMeshes.forEach((mesh) => {
            const mat = mesh.material as THREE.MeshStandardMaterial
            mat.opacity = mesh === clickedMesh ? 0.4 : 0.15
          })
          // Reset wall highlights
          wallMeshes.forEach((mesh) => {
            const mat = mesh.material as THREE.MeshStandardMaterial
            mat.emissive = new THREE.Color(0x000000)
            mat.emissiveIntensity = 0
          })
        }
      } else {
        setSelectedRoom(null)
        setSelectedWall(null)
        // Reset all highlights
        roomMeshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial
          mat.opacity = 0.15
        })
        wallMeshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial
          mat.emissive = new THREE.Color(0x000000)
          mat.emissiveIntensity = 0
        })
      }
    }

    renderer.domElement.addEventListener('click', handleClick)

    // Wall thickness proportional to floor size
    const wallThick = Math.max(0.15, floorWidth * 0.02)
    const partitionThick = wallThick * 0.5

    // Helper to create walls with optional openings for doors/windows
    const createWallWithOpenings = (
      width: number,
      height: number,
      depth: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
      openings: { start: number; end: number; bottom: number; top: number }[] = [],
      wallName: string = 'Wall',
      isLoadBearing: boolean = true
    ) => {
      const addWallMesh = (mesh: THREE.Mesh, segmentLength: number) => {
        wallMeshes.push(mesh)
        wallDataMap.set(mesh, {
          name: wallName,
          wallType: isLoadBearing ? 'load-bearing' : 'partition',
          length: segmentLength,
          height: height,
          thickness: Math.min(width, depth)
        })
      }

      if (openings.length === 0) {
        // Simple wall without openings
        const geometry = new THREE.BoxGeometry(width, height, depth)
        const wall = new THREE.Mesh(geometry, material)
        wall.position.set(x, y, z)
        wall.castShadow = true
        wall.receiveShadow = true
        scene.add(wall)
        addWallMesh(wall, Math.max(width, depth))
        return
      }

      // Create wall segments around openings
      const isHorizontal = width > depth

      if (isHorizontal) {
        // Wall along X axis
        let currentPos = -width / 2
        const sortedOpenings = [...openings].sort((a, b) => a.start - b.start)

        sortedOpenings.forEach((opening) => {
          const openingStart = opening.start * width - width / 2
          const openingEnd = opening.end * width - width / 2

          // Wall segment before opening
          if (openingStart > currentPos) {
            const segmentWidth = openingStart - currentPos
            const segmentGeometry = new THREE.BoxGeometry(segmentWidth, height, depth)
            const segment = new THREE.Mesh(segmentGeometry, material)
            segment.position.set(x + currentPos + segmentWidth / 2, y, z)
            segment.castShadow = true
            segment.receiveShadow = true
            scene.add(segment)
            addWallMesh(segment, segmentWidth)
          }

          // Wall above opening
          const openingWidth = openingEnd - openingStart
          const topHeight = height - opening.top
          if (topHeight > 0.1) {
            const topGeometry = new THREE.BoxGeometry(openingWidth, topHeight, depth)
            const topSegment = new THREE.Mesh(topGeometry, material)
            topSegment.position.set(x + (openingStart + openingEnd) / 2, y + height / 2 - topHeight / 2, z)
            topSegment.castShadow = true
            topSegment.receiveShadow = true
            scene.add(topSegment)
          }

          // Wall below opening (for windows)
          if (opening.bottom > 0.1) {
            const bottomGeometry = new THREE.BoxGeometry(openingWidth, opening.bottom, depth)
            const bottomSegment = new THREE.Mesh(bottomGeometry, material)
            bottomSegment.position.set(x + (openingStart + openingEnd) / 2, y - height / 2 + opening.bottom / 2, z)
            bottomSegment.castShadow = true
            bottomSegment.receiveShadow = true
            scene.add(bottomSegment)
          }

          currentPos = openingEnd
        })

        // Wall segment after last opening
        if (currentPos < width / 2) {
          const segmentWidth = width / 2 - currentPos
          const segmentGeometry = new THREE.BoxGeometry(segmentWidth, height, depth)
          const segment = new THREE.Mesh(segmentGeometry, material)
          segment.position.set(x + currentPos + segmentWidth / 2, y, z)
          segment.castShadow = true
          segment.receiveShadow = true
          scene.add(segment)
          addWallMesh(segment, segmentWidth)
        }
      } else {
        // Wall along Z axis
        let currentPos = -depth / 2
        const sortedOpenings = [...openings].sort((a, b) => a.start - b.start)

        sortedOpenings.forEach((opening) => {
          const openingStart = opening.start * depth - depth / 2
          const openingEnd = opening.end * depth - depth / 2

          if (openingStart > currentPos) {
            const segmentDepth = openingStart - currentPos
            const segmentGeometry = new THREE.BoxGeometry(width, height, segmentDepth)
            const segment = new THREE.Mesh(segmentGeometry, material)
            segment.position.set(x, y, z + currentPos + segmentDepth / 2)
            segment.castShadow = true
            segment.receiveShadow = true
            scene.add(segment)
            addWallMesh(segment, segmentDepth)
          }

          const openingDepth = openingEnd - openingStart
          const topHeight = height - opening.top
          if (topHeight > 0.1) {
            const topGeometry = new THREE.BoxGeometry(width, topHeight, openingDepth)
            const topSegment = new THREE.Mesh(topGeometry, material)
            topSegment.position.set(x, y + height / 2 - topHeight / 2, z + (openingStart + openingEnd) / 2)
            topSegment.castShadow = true
            topSegment.receiveShadow = true
            scene.add(topSegment)
          }

          if (opening.bottom > 0.1) {
            const bottomGeometry = new THREE.BoxGeometry(width, opening.bottom, openingDepth)
            const bottomSegment = new THREE.Mesh(bottomGeometry, material)
            bottomSegment.position.set(x, y - height / 2 + opening.bottom / 2, z + (openingStart + openingEnd) / 2)
            bottomSegment.castShadow = true
            bottomSegment.receiveShadow = true
            scene.add(bottomSegment)
          }

          currentPos = openingEnd
        })

        if (currentPos < depth / 2) {
          const segmentDepth = depth / 2 - currentPos
          const segmentGeometry = new THREE.BoxGeometry(width, height, segmentDepth)
          const segment = new THREE.Mesh(segmentGeometry, material)
          segment.position.set(x, y, z + currentPos + segmentDepth / 2)
          segment.castShadow = true
          segment.receiveShadow = true
          scene.add(segment)
          addWallMesh(segment, segmentDepth)
        }
      }
    }

    // Create door mesh
    const createDoor = (
      x: number,
      y: number,
      z: number,
      rotation: number,
      doorWidth: number = 0.9,
      doorHeight: number = 2.2
    ) => {
      // Door frame
      const frameThickness = 0.08
      const frameGeometry = new THREE.BoxGeometry(doorWidth + frameThickness * 2, doorHeight + frameThickness, frameThickness)
      const frame = new THREE.Mesh(frameGeometry, doorFrameMaterial)
      frame.position.set(x, y + doorHeight / 2, z)
      frame.rotation.y = rotation
      frame.castShadow = true
      scene.add(frame)

      // Door panel (slightly open)
      const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.05)
      const door = new THREE.Mesh(doorGeometry, doorMaterial)
      door.position.set(x + Math.sin(rotation + 0.3) * doorWidth * 0.4, y + doorHeight / 2, z + Math.cos(rotation + 0.3) * doorWidth * 0.4)
      door.rotation.y = rotation + 0.3 // Door is partially open
      door.castShadow = true
      scene.add(door)

      // Door handle
      const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8)
      const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.8, roughness: 0.2 })
      const handle = new THREE.Mesh(handleGeometry, handleMaterial)
      handle.rotation.z = Math.PI / 2
      handle.position.set(
        door.position.x + Math.sin(rotation + 0.3) * (doorWidth * 0.35),
        y + doorHeight * 0.45,
        door.position.z + Math.cos(rotation + 0.3) * (doorWidth * 0.35)
      )
      scene.add(handle)
    }

    // Furniture materials
    const sofaMaterial = new THREE.MeshStandardMaterial({ color: 0x4A5568, roughness: 0.8 })
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.6 })
    const bedMaterial = new THREE.MeshStandardMaterial({ color: 0x1E3A5F, roughness: 0.7 })
    const pillowMaterial = new THREE.MeshStandardMaterial({ color: 0xE8E8E8, roughness: 0.9 })
    const kitchenMaterial = new THREE.MeshStandardMaterial({ color: 0x607D8B, roughness: 0.4, metalness: 0.3 })
    const bathMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2, metalness: 0.1 })
    const rugMaterial = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.95 })
    const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 })
    const tvMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.5 })
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.7 })

    // Create furniture for rooms
    const createFurniture = (room: RoomConfig, roomStartX: number, roomStartZ: number, roomW: number, roomD: number) => {
      const centerX = roomStartX + roomW / 2
      const centerZ = roomStartZ + roomD / 2
      const scale = Math.min(roomW, roomD) / 3

      switch (room.type) {
        case 'living':
          // Sofa
          const sofaGeom = new THREE.BoxGeometry(Math.min(roomW * 0.6, 2.5), 0.5, 0.8)
          const sofa = new THREE.Mesh(sofaGeom, sofaMaterial)
          sofa.position.set(centerX, 0.25, roomStartZ + roomD * 0.75)
          sofa.castShadow = true
          scene.add(sofa)
          // Sofa back
          const sofaBackGeom = new THREE.BoxGeometry(Math.min(roomW * 0.6, 2.5), 0.4, 0.15)
          const sofaBack = new THREE.Mesh(sofaBackGeom, sofaMaterial)
          sofaBack.position.set(centerX, 0.55, roomStartZ + roomD * 0.75 + 0.35)
          sofaBack.castShadow = true
          scene.add(sofaBack)
          // Coffee table
          const coffeeGeom = new THREE.BoxGeometry(0.8, 0.35, 0.5)
          const coffeeTable = new THREE.Mesh(coffeeGeom, tableMaterial)
          coffeeTable.position.set(centerX, 0.175, roomStartZ + roomD * 0.5)
          coffeeTable.castShadow = true
          scene.add(coffeeTable)
          // TV stand
          const tvStandGeom = new THREE.BoxGeometry(1.2, 0.4, 0.4)
          const tvStand = new THREE.Mesh(tvStandGeom, tableMaterial)
          tvStand.position.set(centerX, 0.2, roomStartZ + roomD * 0.15)
          tvStand.castShadow = true
          scene.add(tvStand)
          // TV
          const tvGeom = new THREE.BoxGeometry(1.0, 0.6, 0.05)
          const tv = new THREE.Mesh(tvGeom, tvMaterial)
          tv.position.set(centerX, 0.7, roomStartZ + roomD * 0.15)
          tv.castShadow = true
          scene.add(tv)
          // Rug
          const rugGeom = new THREE.BoxGeometry(roomW * 0.5, 0.02, roomD * 0.4)
          const rug = new THREE.Mesh(rugGeom, rugMaterial)
          rug.position.set(centerX, 0.01, centerZ)
          scene.add(rug)
          break

        case 'bedroom':
          // Bed frame
          const bedW = Math.min(roomW * 0.5, 1.8)
          const bedD = Math.min(roomD * 0.6, 2.2)
          const bedFrameGeom = new THREE.BoxGeometry(bedW, 0.35, bedD)
          const bedFrame = new THREE.Mesh(bedFrameGeom, tableMaterial)
          bedFrame.position.set(centerX, 0.175, roomStartZ + roomD * 0.45)
          bedFrame.castShadow = true
          scene.add(bedFrame)
          // Mattress
          const mattressGeom = new THREE.BoxGeometry(bedW - 0.1, 0.2, bedD - 0.1)
          const mattress = new THREE.Mesh(mattressGeom, bedMaterial)
          mattress.position.set(centerX, 0.45, roomStartZ + roomD * 0.45)
          mattress.castShadow = true
          scene.add(mattress)
          // Pillows
          const pillowGeom = new THREE.BoxGeometry(0.4, 0.12, 0.3)
          const pillow1 = new THREE.Mesh(pillowGeom, pillowMaterial)
          pillow1.position.set(centerX - 0.3, 0.6, roomStartZ + roomD * 0.25)
          pillow1.castShadow = true
          scene.add(pillow1)
          const pillow2 = new THREE.Mesh(pillowGeom, pillowMaterial)
          pillow2.position.set(centerX + 0.3, 0.6, roomStartZ + roomD * 0.25)
          pillow2.castShadow = true
          scene.add(pillow2)
          // Bedside table
          const bedsideGeom = new THREE.BoxGeometry(0.4, 0.5, 0.4)
          const bedside = new THREE.Mesh(bedsideGeom, tableMaterial)
          bedside.position.set(roomStartX + roomW * 0.85, 0.25, roomStartZ + roomD * 0.35)
          bedside.castShadow = true
          scene.add(bedside)
          // Wardrobe
          const wardrobeGeom = new THREE.BoxGeometry(Math.min(roomW * 0.35, 1.2), 2.2, 0.55)
          const wardrobe = new THREE.Mesh(wardrobeGeom, new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.7 }))
          wardrobe.position.set(roomStartX + roomW * 0.2, 1.1, roomStartZ + roomD * 0.85)
          wardrobe.castShadow = true
          scene.add(wardrobe)
          break

        case 'kitchen':
          // Kitchen counter (L-shaped)
          const counterGeom = new THREE.BoxGeometry(roomW * 0.8, 0.9, 0.6)
          const counter = new THREE.Mesh(counterGeom, kitchenMaterial)
          counter.position.set(centerX, 0.45, roomStartZ + roomD * 0.15)
          counter.castShadow = true
          scene.add(counter)
          // Side counter
          const sideCounterGeom = new THREE.BoxGeometry(0.6, 0.9, roomD * 0.5)
          const sideCounter = new THREE.Mesh(sideCounterGeom, kitchenMaterial)
          sideCounter.position.set(roomStartX + roomW * 0.15, 0.45, roomStartZ + roomD * 0.5)
          sideCounter.castShadow = true
          scene.add(sideCounter)
          // Stove
          const stoveGeom = new THREE.BoxGeometry(0.6, 0.05, 0.5)
          const stove = new THREE.Mesh(stoveGeom, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 }))
          stove.position.set(centerX, 0.925, roomStartZ + roomD * 0.15)
          scene.add(stove)
          // Fridge
          const fridgeGeom = new THREE.BoxGeometry(0.7, 1.8, 0.65)
          const fridge = new THREE.Mesh(fridgeGeom, new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.5, roughness: 0.3 }))
          fridge.position.set(roomStartX + roomW * 0.85, 0.9, roomStartZ + roomD * 0.75)
          fridge.castShadow = true
          scene.add(fridge)
          break

        case 'bathroom':
          // Toilet
          const toiletBaseGeom = new THREE.BoxGeometry(0.4, 0.35, 0.55)
          const toiletBase = new THREE.Mesh(toiletBaseGeom, bathMaterial)
          toiletBase.position.set(roomStartX + roomW * 0.25, 0.175, roomStartZ + roomD * 0.8)
          toiletBase.castShadow = true
          scene.add(toiletBase)
          // Toilet tank
          const toiletTankGeom = new THREE.BoxGeometry(0.35, 0.5, 0.2)
          const toiletTank = new THREE.Mesh(toiletTankGeom, bathMaterial)
          toiletTank.position.set(roomStartX + roomW * 0.25, 0.45, roomStartZ + roomD * 0.9)
          toiletTank.castShadow = true
          scene.add(toiletTank)
          // Sink
          const sinkGeom = new THREE.BoxGeometry(0.5, 0.1, 0.4)
          const sink = new THREE.Mesh(sinkGeom, bathMaterial)
          sink.position.set(roomStartX + roomW * 0.75, 0.85, roomStartZ + roomD * 0.15)
          sink.castShadow = true
          scene.add(sink)
          // Sink cabinet
          const sinkCabGeom = new THREE.BoxGeometry(0.55, 0.75, 0.45)
          const sinkCab = new THREE.Mesh(sinkCabGeom, tableMaterial)
          sinkCab.position.set(roomStartX + roomW * 0.75, 0.375, roomStartZ + roomD * 0.15)
          sinkCab.castShadow = true
          scene.add(sinkCab)
          // Shower area
          const showerFloorGeom = new THREE.BoxGeometry(0.9, 0.05, 0.9)
          const showerFloor = new THREE.Mesh(showerFloorGeom, new THREE.MeshStandardMaterial({ color: 0x9E9E9E, roughness: 0.1 }))
          showerFloor.position.set(roomStartX + roomW * 0.7, 0.025, roomStartZ + roomD * 0.7)
          scene.add(showerFloor)
          break

        case 'dining':
          // Dining table
          const diningW = Math.min(roomW * 0.5, 1.6)
          const diningD = Math.min(roomD * 0.4, 1.0)
          const diningTableGeom = new THREE.BoxGeometry(diningW, 0.05, diningD)
          const diningTable = new THREE.Mesh(diningTableGeom, tableMaterial)
          diningTable.position.set(centerX, 0.75, centerZ)
          diningTable.castShadow = true
          scene.add(diningTable)
          // Table legs
          const legGeom = new THREE.BoxGeometry(0.08, 0.7, 0.08)
          const positions = [
            [centerX - diningW/2 + 0.1, 0.35, centerZ - diningD/2 + 0.1],
            [centerX + diningW/2 - 0.1, 0.35, centerZ - diningD/2 + 0.1],
            [centerX - diningW/2 + 0.1, 0.35, centerZ + diningD/2 - 0.1],
            [centerX + diningW/2 - 0.1, 0.35, centerZ + diningD/2 - 0.1]
          ]
          positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeom, tableMaterial)
            leg.position.set(pos[0], pos[1], pos[2])
            leg.castShadow = true
            scene.add(leg)
          })
          // Chairs
          const chairGeom = new THREE.BoxGeometry(0.4, 0.05, 0.4)
          const chairBackGeom = new THREE.BoxGeometry(0.4, 0.5, 0.05)
          const chairPositions = [
            { x: centerX - 0.5, z: centerZ - diningD/2 - 0.35, rot: 0 },
            { x: centerX + 0.5, z: centerZ - diningD/2 - 0.35, rot: 0 },
            { x: centerX - 0.5, z: centerZ + diningD/2 + 0.35, rot: Math.PI },
            { x: centerX + 0.5, z: centerZ + diningD/2 + 0.35, rot: Math.PI }
          ]
          chairPositions.forEach(pos => {
            const chairSeat = new THREE.Mesh(chairGeom, chairMaterial)
            chairSeat.position.set(pos.x, 0.45, pos.z)
            chairSeat.castShadow = true
            scene.add(chairSeat)
            const chairBack = new THREE.Mesh(chairBackGeom, chairMaterial)
            chairBack.position.set(pos.x, 0.7, pos.z + (pos.rot === 0 ? -0.2 : 0.2))
            chairBack.castShadow = true
            scene.add(chairBack)
          })
          break

        case 'balcony':
          // Potted plants
          const potGeom = new THREE.CylinderGeometry(0.15, 0.12, 0.25, 8)
          const potMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
          const pot1 = new THREE.Mesh(potGeom, potMat)
          pot1.position.set(roomStartX + roomW * 0.2, 0.125, roomStartZ + roomD * 0.3)
          pot1.castShadow = true
          scene.add(pot1)
          // Plant
          const plantGeom = new THREE.SphereGeometry(0.2, 8, 6)
          const plant1 = new THREE.Mesh(plantGeom, plantMaterial)
          plant1.position.set(roomStartX + roomW * 0.2, 0.4, roomStartZ + roomD * 0.3)
          plant1.castShadow = true
          scene.add(plant1)
          // Second plant
          const pot2 = new THREE.Mesh(potGeom, potMat)
          pot2.position.set(roomStartX + roomW * 0.8, 0.125, roomStartZ + roomD * 0.3)
          pot2.castShadow = true
          scene.add(pot2)
          const plant2 = new THREE.Mesh(plantGeom, plantMaterial)
          plant2.position.set(roomStartX + roomW * 0.8, 0.4, roomStartZ + roomD * 0.3)
          plant2.castShadow = true
          scene.add(plant2)
          // Small chair/stool
          const stoolGeom = new THREE.CylinderGeometry(0.2, 0.18, 0.4, 8)
          const stool = new THREE.Mesh(stoolGeom, chairMaterial)
          stool.position.set(centerX, 0.2, centerZ + roomD * 0.2)
          stool.castShadow = true
          scene.add(stool)
          break

        case 'entry':
          // Shoe rack
          const shoeRackGeom = new THREE.BoxGeometry(Math.min(roomW * 0.4, 1.0), 0.6, 0.35)
          const shoeRack = new THREE.Mesh(shoeRackGeom, tableMaterial)
          shoeRack.position.set(roomStartX + roomW * 0.7, 0.3, centerZ)
          shoeRack.castShadow = true
          scene.add(shoeRack)
          // Welcome mat
          const matGeom = new THREE.BoxGeometry(0.8, 0.02, 0.5)
          const matMat = new THREE.MeshStandardMaterial({ color: 0x4E342E, roughness: 0.95 })
          const mat = new THREE.Mesh(matGeom, matMat)
          mat.position.set(roomStartX + roomW * 0.25, 0.01, centerZ)
          scene.add(mat)
          break

        case 'hall':
          // Console table
          if (roomW > 0.8) {
            const consoleGeom = new THREE.BoxGeometry(Math.min(roomW * 0.5, 1.0), 0.75, 0.3)
            const consoleTable = new THREE.Mesh(consoleGeom, tableMaterial)
            consoleTable.position.set(centerX, 0.375, roomStartZ + roomD * 0.15)
            consoleTable.castShadow = true
            scene.add(consoleTable)
          }
          break
      }
    }

    // Create window mesh
    const createWindow = (
      x: number,
      y: number,
      z: number,
      windowWidth: number,
      windowHeight: number,
      rotation: number
    ) => {
      // Window frame
      const frameThickness = 0.05
      const frameGeometry = new THREE.BoxGeometry(
        rotation === 0 ? windowWidth : frameThickness,
        windowHeight,
        rotation === 0 ? frameThickness : windowWidth
      )
      const frame = new THREE.Mesh(frameGeometry, windowFrameMaterial)
      frame.position.set(x, y, z)
      frame.castShadow = true
      scene.add(frame)

      // Window glass
      const glassGeometry = new THREE.BoxGeometry(
        rotation === 0 ? windowWidth - 0.1 : 0.02,
        windowHeight - 0.1,
        rotation === 0 ? 0.02 : windowWidth - 0.1
      )
      const glass = new THREE.Mesh(glassGeometry, windowGlassMaterial)
      glass.position.set(x, y, z)
      scene.add(glass)

      // Window dividers (cross pattern)
      const dividerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      const vDividerGeometry = new THREE.BoxGeometry(
        rotation === 0 ? 0.03 : 0.04,
        windowHeight - 0.15,
        rotation === 0 ? 0.04 : 0.03
      )
      const vDivider = new THREE.Mesh(vDividerGeometry, dividerMaterial)
      vDivider.position.set(x, y, z)
      scene.add(vDivider)

      const hDividerGeometry = new THREE.BoxGeometry(
        rotation === 0 ? windowWidth - 0.15 : 0.04,
        0.03,
        rotation === 0 ? 0.04 : windowWidth - 0.15
      )
      const hDivider = new THREE.Mesh(hDividerGeometry, dividerMaterial)
      hDivider.position.set(x, y, z)
      scene.add(hDivider)
    }

    // Check if door should exist between two room types
    const shouldHaveDoor = (room1Type: string, room2Type: string, room1Name?: string, room2Name?: string): boolean => {
      const pair = [room1Type, room2Type].sort().join('-')
      const name1Lower = (room1Name || '').toLowerCase()
      const name2Lower = (room2Name || '').toLowerCase()
      
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
        'entry-living',
        'kitchen-living',
        'kitchen-dining',
        'bedroom-living',
        'bathroom-living',    // Bath connects to Living
        'balcony-bedroom',    // Balcony connects to Bedroom
        'balcony-living',
        'balcony-hall',       // Balcony connects to Passage
        'dining-kitchen',
        'dining-living',
        'hall-bedroom',       // Hall/Passage connects to all Bedrooms (including Bedroom 3)
        'hall-living',
        'hall-bathroom',
        'entry-hall',
      ]
      
      return allowedConnections.includes(pair)
    }

    // Generate doors and windows based on room layout
    const rooms = plotData.rooms
    const doorPositions: { x: number; y: number; z: number; rotation: number }[] = []
    const windowPositions: { x: number; y: number; z: number; width: number; height: number; rotation: number }[] = []

    // Analyze rooms to place doors and windows
    rooms.forEach((room) => {
      const roomStartX = -floorWidth / 2 + room.x * floorWidth
      const roomStartZ = -floorDepth / 2 + room.y * floorDepth
      const roomW = room.width * floorWidth
      const roomD = room.height * floorDepth

      // Entry room gets main door on left wall
      if (room.type === 'entry' && room.x === 0) {
        doorPositions.push({
          x: -floorWidth / 2,
          y: 0,
          z: roomStartZ + roomD * 0.5,
          rotation: Math.PI / 2
        })
      }

      // Windows on exterior walls (top wall y=0, right wall x+width=1)
      if (room.y === 0 && room.type !== 'bathroom' && room.type !== 'entry') {
        windowPositions.push({
          x: roomStartX + roomW * 0.5,
          y: wallHeight * 0.5,
          z: -floorDepth / 2,
          width: Math.min(roomW * 0.5, 1.5),
          height: 1.2,
          rotation: 0
        })
      }

      if (room.x + room.width >= 0.99 && (room.type === 'bedroom' || room.type === 'living')) {
        windowPositions.push({
          x: floorWidth / 2,
          y: wallHeight * 0.5,
          z: roomStartZ + roomD * 0.5,
          width: Math.min(roomD * 0.4, 1.2),
          height: 1.2,
          rotation: Math.PI / 2
        })
      }

      // Balcony gets large window/door
      if (room.type === 'balcony') {
        if (room.y === 0) {
          windowPositions.push({
            x: roomStartX + roomW * 0.5,
            y: wallHeight * 0.45,
            z: -floorDepth / 2,
            width: roomW * 0.7,
            height: wallHeight * 0.8,
            rotation: 0
          })
        }
      }
    })

    // Build openings for outer walls
    const topWallOpenings: { start: number; end: number; bottom: number; top: number }[] = []
    const rightWallOpenings: { start: number; end: number; bottom: number; top: number }[] = []
    const leftWallOpenings: { start: number; end: number; bottom: number; top: number }[] = []

    // Add window openings
    windowPositions.forEach((win) => {
      if (win.z === -floorDepth / 2) {
        // Top wall window
        const startX = (win.x - win.width / 2 + floorWidth / 2) / floorWidth
        const endX = (win.x + win.width / 2 + floorWidth / 2) / floorWidth
        topWallOpenings.push({
          start: startX,
          end: endX,
          bottom: win.y - win.height / 2,
          top: win.y + win.height / 2
        })
      } else if (win.x === floorWidth / 2) {
        // Right wall window
        const startZ = (win.z - win.width / 2 + floorDepth / 2) / floorDepth
        const endZ = (win.z + win.width / 2 + floorDepth / 2) / floorDepth
        rightWallOpenings.push({
          start: startZ,
          end: endZ,
          bottom: win.y - win.height / 2,
          top: win.y + win.height / 2
        })
      }
    })

    // Add door openings
    doorPositions.forEach((door) => {
      if (door.x === -floorWidth / 2) {
        // Left wall door
        const startZ = (door.z - 0.5 + floorDepth / 2) / floorDepth
        const endZ = (door.z + 0.5 + floorDepth / 2) / floorDepth
        leftWallOpenings.push({
          start: startZ,
          end: endZ,
          bottom: 0,
          top: 2.2
        })
      }
    })

    // Outer walls with openings - extended to join at corners properly
    createWallWithOpenings(floorWidth + wallThick * 2, wallHeight, wallThick, 0, wallHeight / 2, -floorDepth / 2 - wallThick / 2, loadBearingMaterial, topWallOpenings, 'North Wall (Exterior)', true)
    createWallWithOpenings(floorWidth + wallThick * 2, wallHeight, wallThick, 0, wallHeight / 2, floorDepth / 2 + wallThick / 2, loadBearingMaterial, [], 'South Wall (Exterior)', true)
    createWallWithOpenings(wallThick, wallHeight, floorDepth, -floorWidth / 2 - wallThick / 2, wallHeight / 2, 0, loadBearingMaterial, leftWallOpenings, 'West Wall (Exterior)', true)
    createWallWithOpenings(wallThick, wallHeight, floorDepth, floorWidth / 2 + wallThick / 2, wallHeight / 2, 0, loadBearingMaterial, rightWallOpenings, 'East Wall (Exterior)', true)
    
    // Corner pillars for solid wall joints
    const cornerPillarGeom = new THREE.BoxGeometry(wallThick, wallHeight, wallThick)
    const corners = [
      [-floorWidth / 2 - wallThick / 2, wallHeight / 2, -floorDepth / 2 - wallThick / 2],
      [floorWidth / 2 + wallThick / 2, wallHeight / 2, -floorDepth / 2 - wallThick / 2],
      [-floorWidth / 2 - wallThick / 2, wallHeight / 2, floorDepth / 2 + wallThick / 2],
      [floorWidth / 2 + wallThick / 2, wallHeight / 2, floorDepth / 2 + wallThick / 2]
    ]
    corners.forEach(pos => {
      const pillar = new THREE.Mesh(cornerPillarGeom, loadBearingMaterial)
      pillar.position.set(pos[0], pos[1], pos[2])
      pillar.castShadow = true
      pillar.receiveShadow = true
      scene.add(pillar)
    })

    // Create internal walls (partitions) between rooms with door openings
    rooms.forEach((room, index) => {
      const roomStartX = -floorWidth / 2 + room.x * floorWidth
      const roomStartZ = -floorDepth / 2 + room.y * floorDepth
      const roomW = room.width * floorWidth
      const roomD = room.height * floorDepth

      // Right wall (if not at right edge)
      if (room.x + room.width < 0.99) {
        // Find adjacent room to the right
        const adjacentRoom = rooms.find(r => 
          Math.abs(r.x - (room.x + room.width)) < 0.01 &&
          Math.max(room.y, r.y) < Math.min(room.y + room.height, r.y + r.height)
        )
        
        // Check if door should exist between these rooms
        const hasDoor = adjacentRoom ? shouldHaveDoor(room.type, adjacentRoom.type, room.name, adjacentRoom.name) : false
        const openings = hasDoor ? [{
          start: 0.35,
          end: 0.55,
          bottom: 0,
          top: 2.2
        }] : []

        const wallName = adjacentRoom 
          ? `${room.name} / ${adjacentRoom.name} Wall` 
          : `${room.name} East Wall`
        
        createWallWithOpenings(
          partitionThick,
          wallHeight,
          roomD,
          roomStartX + roomW,
          wallHeight / 2,
          roomStartZ + roomD / 2,
          partitionMaterial,
          openings,
          wallName,
          false
        )

        // Add door if opening exists
        if (hasDoor) {
          doorPositions.push({
            x: roomStartX + roomW,
            y: 0,
            z: roomStartZ + roomD * 0.45,
            rotation: Math.PI / 2
          })
        }
      }

      // Bottom wall (if not at bottom edge)
      if (room.y + room.height < 0.99) {
        // Find adjacent room below
        const adjacentRoom = rooms.find(r => 
          Math.abs(r.y - (room.y + room.height)) < 0.01 &&
          Math.max(room.x, r.x) < Math.min(room.x + room.width, r.x + r.width)
        )
        
        // Check if door should exist between these rooms
        const hasDoor = adjacentRoom ? shouldHaveDoor(room.type, adjacentRoom.type, room.name, adjacentRoom.name) : false
        
        // Special case: hall-living door should be positioned more to the right
        const isHallLiving = adjacentRoom && 
          ((room.type === 'hall' && adjacentRoom.type === 'living') || 
           (room.type === 'living' && adjacentRoom.type === 'hall'))
        
        const doorStart = isHallLiving ? 0.55 : 0.4
        const doorEnd = isHallLiving ? 0.75 : 0.6
        const doorPosX = isHallLiving ? 0.65 : 0.5
        
        const openings = hasDoor ? [{
          start: doorStart,
          end: doorEnd,
          bottom: 0,
          top: 2.2
        }] : []

        const bottomWallName = adjacentRoom 
          ? `${room.name} / ${adjacentRoom.name} Wall` 
          : `${room.name} South Wall`

        createWallWithOpenings(
          roomW,
          wallHeight,
          partitionThick,
          roomStartX + roomW / 2,
          wallHeight / 2,
          roomStartZ + roomD,
          partitionMaterial,
          openings,
          bottomWallName,
          false
        )

        if (hasDoor) {
          doorPositions.push({
            x: roomStartX + roomW * doorPosX,
            y: 0,
            z: roomStartZ + roomD,
            rotation: 0
          })
        }
      }
    })

    // Create doors
    doorPositions.forEach((door) => {
      createDoor(door.x, door.y, door.z, door.rotation)
    })

    // Create windows
    windowPositions.forEach((win) => {
      createWindow(win.x, win.y, win.z, win.width, win.height, win.rotation)
    })

    // Add furniture to each room
    rooms.forEach((room) => {
      const roomStartX = -floorWidth / 2 + room.x * floorWidth
      const roomStartZ = -floorDepth / 2 + room.y * floorDepth
      const roomW = room.width * floorWidth
      const roomD = room.height * floorDepth
      createFurniture(room, roomStartX, roomStartZ, roomW, roomD)
    })

    // Load font and create 3D text labels on the floor
    const fontLoader = new FontLoader()
    fontLoader.load(
      'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
      (font) => {
        const createFloorLabel = (room: RoomConfig) => {
          const roomW = room.width * floorWidth
          const roomD = room.height * floorDepth
          const minRoomDimension = Math.min(roomW, roomD)
          const textSize = Math.max(0.15, Math.min(0.5, minRoomDimension * 0.12))
          const textHeight = textSize * 0.15
          const roomCenterX = -floorWidth / 2 + (room.x + room.width / 2) * floorWidth
          const roomCenterZ = -floorDepth / 2 + (room.y + room.height / 2) * floorDepth
          const color = roomTypeColors[room.type] || 0x888888

          const labelMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.2,
            emissive: color,
            emissiveIntensity: 0.3
          })

          let displayName = room.name.toUpperCase()
          if (minRoomDimension < 2) {
            const shortNames: Record<string, string> = {
              'BATHROOM': 'BATH', 'BATHROOM 1': 'BATH 1', 'BATHROOM 2': 'BATH 2',
              'LIVING ROOM': 'LIVING', 'MASTER BEDROOM': 'MASTER', 'MASTER BED': 'MASTER',
              'BEDROOM 1': 'BED 1', 'BEDROOM 2': 'BED 2', 'BEDROOM 3': 'BED 3',
              'BALCONY': 'BALC', 'PASSAGE': 'PASS',
            }
            displayName = shortNames[displayName] || displayName
          }

          if (displayName.length > 10 && minRoomDimension < 3) {
            displayName = displayName.split(' ').map(word => word.substring(0, 4)).join(' ')
          }

          const textGeometry = new TextGeometry(displayName, {
            font: font,
            size: textSize,
            depth: textHeight,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: textHeight * 0.1,
            bevelSize: textHeight * 0.05,
            bevelOffset: 0,
            bevelSegments: 2
          })

          textGeometry.computeBoundingBox()
          const boundingBox = textGeometry.boundingBox!
          const textWidth = boundingBox.max.x - boundingBox.min.x
          const textDepthVal = boundingBox.max.z - boundingBox.min.z

          const textMesh = new THREE.Mesh(textGeometry, labelMaterial)
          textMesh.rotation.x = -Math.PI / 2
          textMesh.position.set(roomCenterX - textWidth / 2, 0.02, roomCenterZ + textDepthVal / 2)
          textMesh.castShadow = true
          scene.add(textMesh)
        }

        rooms.forEach(room => createFloorLabel(room))
      }
    )

    // Grid helper
    const gridSize = Math.ceil(Math.max(floorWidth, floorDepth) / 2) * 2 + 4
    const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x0F6E56, 0x1a1a24)
    gridHelper.position.y = -0.01
    scene.add(gridHelper)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('click', handleClick)
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [plotData])

  const widthM = (plotData.width * 0.3048).toFixed(2)
  const lengthM = (plotData.length * 0.3048).toFixed(2)

  return (
    <div className="relative rounded-xl overflow-hidden bg-[#0a0a0f]">
      <div ref={containerRef} className="w-full h-[500px] relative" />

      {/* Dimensions info */}
      <div className="absolute top-4 left-4 bg-[#12121a]/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1 z-10">
        <p className="text-[#e8e6de] font-medium">3D Model Dimensions</p>
        <p className="text-[#888780]">Width: <span className="text-[#0F6E56]">{widthM}m</span></p>
        <p className="text-[#888780]">Length: <span className="text-[#0F6E56]">{lengthM}m</span></p>
        <p className="text-[#888780]">Height: <span className="text-[#0F6E56]">3.0m</span></p>
        <p className="text-[#888780]">Rooms: <span className="text-[#BA7517]">{plotData.rooms.length}</span></p>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-[#12121a]/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-[#888780] z-10">
        <p>Drag to rotate | Scroll to zoom | Right-click to pan | Click room for dimensions</p>
      </div>

      {/* Selected room dimensions tooltip */}
      {selectedRoom && (
        <div 
          className="absolute bg-[#12121a]/95 backdrop-blur-sm rounded-lg px-4 py-3 z-20 border border-[#0F6E56]/50 shadow-lg shadow-[#0F6E56]/20 min-w-[220px]"
          style={{ 
            left: Math.min(tooltipPos.x + 10, (containerRef.current?.clientWidth || 400) - 240),
            top: Math.min(tooltipPos.y + 10, (containerRef.current?.clientHeight || 400) - 200)
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[#e8e6de] font-semibold">{selectedRoom.name}</h4>
            <button 
              onClick={() => setSelectedRoom(null)}
              className="text-[#888780] hover:text-[#e8e6de] transition-colors"
            >
              x
            </button>
          </div>
          <div 
            className="w-full h-1 rounded mb-3"
            style={{ backgroundColor: `#${roomTypeColors[selectedRoom.type]?.toString(16).padStart(6, '0') || '888888'}` }}
          />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#888780]">Width:</span>
              <span className="text-[#e8e6de]">
                {selectedRoom.widthFt.toFixed(1)} ft ({selectedRoom.widthM.toFixed(2)} m)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888780]">Length:</span>
              <span className="text-[#e8e6de]">
                {selectedRoom.lengthFt.toFixed(1)} ft ({selectedRoom.lengthM.toFixed(2)} m)
              </span>
            </div>
            <div className="border-t border-[#2a2a35] my-2" />
            <div className="flex justify-between">
              <span className="text-[#888780]">Area:</span>
              <span className="text-[#0F6E56] font-medium">
                {selectedRoom.areaSqFt.toFixed(1)} sq.ft
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888780]"></span>
              <span className="text-[#534AB7] font-medium">
                {selectedRoom.areaSqM.toFixed(2)} sq.m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected wall dimensions tooltip */}
      {selectedWall && (
        <div 
          className="absolute bg-[#12121a]/95 backdrop-blur-sm rounded-lg px-4 py-3 z-20 border border-[#3a3a3a]/50 shadow-lg shadow-[#3a3a3a]/20 min-w-[240px]"
          style={{ 
            left: Math.min(tooltipPos.x + 10, (containerRef.current?.clientWidth || 400) - 260),
            top: Math.min(tooltipPos.y + 10, (containerRef.current?.clientHeight || 400) - 250)
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[#e8e6de] font-semibold">{selectedWall.name}</h4>
            <button 
              onClick={() => setSelectedWall(null)}
              className="text-[#888780] hover:text-[#e8e6de] transition-colors"
            >
              x
            </button>
          </div>
          <div 
            className="w-full h-1 rounded mb-3"
            style={{ backgroundColor: selectedWall.wallType === 'load-bearing' ? '#3a3a3a' : '#5a5a5a' }}
          />
          <div className="mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${
              selectedWall.wallType === 'load-bearing' 
                ? 'bg-[#3a3a3a] text-[#e8e6de]' 
                : 'bg-[#5a5a5a] text-[#e8e6de]'
            }`}>
              {selectedWall.wallType === 'load-bearing' ? 'Load-bearing Wall' : 'Partition Wall'}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#888780]">Length:</span>
              <span className="text-[#e8e6de]">
                {selectedWall.lengthFt.toFixed(1)} ft ({selectedWall.lengthM.toFixed(2)} m)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888780]">Height:</span>
              <span className="text-[#e8e6de]">
                {selectedWall.heightFt.toFixed(1)} ft ({selectedWall.heightM.toFixed(2)} m)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888780]">Thickness:</span>
              <span className="text-[#e8e6de]">
                {(selectedWall.thicknessFt * 12).toFixed(1)} in ({(selectedWall.thicknessM * 100).toFixed(1)} cm)
              </span>
            </div>
            <div className="border-t border-[#2a2a35] my-2" />
            <div className="flex justify-between">
              <span className="text-[#888780]">Wall Area:</span>
              <span className="text-[#0F6E56] font-medium">
                {selectedWall.areaSqFt.toFixed(1)} sq.ft
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888780]"></span>
              <span className="text-[#534AB7] font-medium">
                {selectedWall.areaSqM.toFixed(2)} sq.m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-[#12121a]/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1 z-10">
        <p className="text-[#e8e6de] font-medium mb-1">Structure</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#3a3a3a]" />
          <span className="text-[#888780]">Load-bearing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#5a5a5a]" />
          <span className="text-[#888780]">Partition</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#8B4513]" />
          <span className="text-[#888780]">Door</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#4FC3F7]" />
          <span className="text-[#888780]">Window</span>
        </div>
        <p className="text-[#e8e6de] font-medium mt-2 mb-1">Furniture</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#4A5568]" />
          <span className="text-[#888780]">Sofa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#1E3A5F]" />
          <span className="text-[#888780]">Bed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#607D8B]" />
          <span className="text-[#888780]">Kitchen</span>
        </div>
        <div className="mt-2 pt-2 border-t border-[#2a2a35] space-y-1">
          <p className="text-[#888780] font-medium">Room Labels:</p>
          {plotData.rooms.slice(0, 4).map((room, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `#${roomTypeColors[room.type]?.toString(16).padStart(6, '0') || '888888'}` }}
              />
              <span className="text-[#888780] text-[10px]">{room.name}</span>
            </div>
          ))}
          {plotData.rooms.length > 4 && (
            <p className="text-[#555] text-[10px]">+{plotData.rooms.length - 4} more</p>
          )}
        </div>
      </div>
    </div>
  )
}

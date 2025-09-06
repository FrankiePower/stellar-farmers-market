"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { projectIso, unprojectIso, type IsoProjectParams } from "@/lib/iso"
import { aStar } from "@/lib/pathfinding"
import { palette } from "@/lib/palette"
import type { ChatMessage, Facing } from "@/hooks/use-multiplayer"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export type RoomPreset = "Lobby" | "Café" | "Rooftop" // Lobby=Main Market, Café=Produce Stall, Rooftop=Trading Floor

type Grid = { cols: number; rows: number; walkable: boolean[] }
function idx(x: number, y: number, cols: number) { return y * cols + x }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

function computeCenteredOrigin(w: number, h: number, cols: number, rows: number, tileW: number, tileH: number) {
  const hw = tileW / 2, hh = tileH / 2
  // Project the four floor corners with origin (0,0)
  const corners = [
    { px: (0 - 0) * hw, py: (0 + 0) * hh },
    { px: ((cols - 1) - 0) * hw, py: ((cols - 1) + 0) * hh },
    { px: (0 - (rows - 1)) * hw, py: (0 + (rows - 1)) * hh },
    { px: ((cols - 1) - (rows - 1)) * hw, py: ((cols - 1) + (rows - 1)) * hh },
  ]
  const minX = Math.min(...corners.map(c => c.px - hw))
  const maxX = Math.max(...corners.map(c => c.px + hw))
  const minY = Math.min(...corners.map(c => c.py))
  const maxY = Math.max(...corners.map(c => c.py + tileH))
  const floorW = maxX - minX
  const floorH = maxY - minY
  // Center the floor diamond; nudge slightly upward for aesthetics
  const originX = Math.round(w / 2 - (minX + maxX) / 2)
  const originY = Math.round(h / 2 - (minY + maxY) / 2) - 6
  return { x: originX, y: originY, floorW, floorH }
}

type Peer = {
  id: string
  name: string
  color?: string
  x: number
  y: number
  facing: "N" | "S" | "E" | "W"
  sit?: boolean
  wave?: boolean
  laugh?: boolean
}

type Seat = { x: number; y: number; facing: "N" | "S" | "E" | "W" }

type Props = {
  room?: RoomPreset
  selfName?: string
  onBubble?: (text: string) => void
  recentMessages?: ChatMessage[]
  peers?: Peer[]
  onStep?: (s: { x: number; y: number; facing: "N" | "S" | "E" | "W" }) => void
  waving?: boolean
  laughing?: boolean
  sitToggleSeq?: number
  onSitChange?: (v: boolean) => void
  onStallClick?: (stallId: string, stallType: string) => void
}

type Avatar = { x: number; y: number; facing: "N" | "S" | "E" | "W" }
type Bubble = { text: string; expiresAt: number }

export default function IsoRoom({
  room = "Lobby",
  selfName = "You",
  onBubble,
  recentMessages = [],
  peers = [],
  onStep,
  waving = false,
  laughing = false,
  sitToggleSeq = 0,
  onSitChange,
  onStallClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 300, h: 300 })
  const [avatar, setAvatar] = useState<Avatar>({ x: 6, y: 6, facing: "S" })
  const pathRef = useRef<{ nodes: { x: number; y: number }[]; progress: number } | null>(null)
  const bubbleRef = useRef<Bubble | null>(null)
  const animRef = useRef(0)          // gameplay anim speed
  const bgTimeRef = useRef(0)        // background anim speed (independent of walking)
  const lastSentRef = useRef(0)
  const heldDirRef = useRef<{ dx: number; dy: number; facing: Avatar["facing"] } | null>(null)

  const [isSitting, setIsSitting] = useState(false)
  const sitTargetRef = useRef<Seat | null>(null)


  const [hoverId, setHoverId] = useState<string | null>(null)
  const hoverTargetsRef = useRef<{ id: string; name: string; x: number; yHead: number }[]>([])

  const [visitPopup, setVisitPopup] = useState<{ stallId: string; stallType: string; label: string } | null>(null)
  const stallsRef = useRef<{ id: string; type: string; x: number; y: number; px: number; py: number; width: number; height: number }[]>([])

  const smoothPeersRef = useRef<Map<string, { x: number; y: number; facing: Facing }>>(new Map())
  const authorBubblesRef = useRef<Map<string, Bubble>>(new Map())

  const tileW = 54
  const tileH = 27


  const seatsByRoom: Record<RoomPreset, Seat[]> = useMemo(() => ({
    Lobby: [
      { x: 3, y: 5, facing: "N" }, { x: 4, y: 5, facing: "N" },
      { x: 15, y: 11, facing: "N" }, { x: 16, y: 11, facing: "N" },
    ],
    Café: [
      { x: 5, y: 6, facing: "N" }, { x: 14, y: 6, facing: "N" }, { x: 10, y: 11, facing: "N" },
    ],
    Rooftop: [
      { x: 6, y: 13, facing: "N" }, { x: 12, y: 13, facing: "N" },
    ],
  }), [])

  const grid: Grid = useMemo(() => {
    const cols = 20
    const rows = 16
    const walkable = new Array(cols * rows).fill(true)
    const block = (x: number, y: number) => { if (x >= 0 && y >= 0 && x < cols && y < rows) walkable[idx(x, y, cols)] = false }
    for (let x = 0; x < cols; x++) { walkable[idx(x, 0, cols)] = false; walkable[idx(x, rows - 1, cols)] = false }
    for (let y = 0; y < rows; y++) { walkable[idx(0, y, cols)] = false; walkable[idx(cols - 1, y, cols)] = false }

    if (room === "Lobby") {
      for (let y = 6; y <= 9; y++) for (let x = 8; x <= 11; x++) block(x, y)
      ;[[3, 4],[15, 10]].forEach(([x, y]) => { block(x, y); block(x + 1, y) })
      ;[[8, 2],[9, 2],[10, 2]].forEach(([x, y]) => block(x, y))
      ;[[13, 12]].forEach(([x, y]) => block(x, y))
      ;[[5, 9]].forEach(([x, y]) => block(x, y))
    } else if (room === "Café") {
      ;[[5,5],[6,5],[5,6],[14,5],[14,6],[13,5],[10,9],[10,10],[9,9]].forEach(([x,y]) => block(x,y))
      for (let x = 2; x <= 5; x++) block(x, 11)
      ;[[3,10],[4,10],[5,10]].forEach(([x,y]) => block(x,y))
      ;[[3, 8],[16, 4]].forEach(([x, y]) => block(x, y))
    } else {
      for (let y = 3; y < rows - 3; y += 3) for (let x = 3; x < cols - 3; x += 5) { block(x, y); block(x + 1, y) }
      ;[[6, 12],[12, 12]].forEach(([x, y]) => { block(x, y); block(x + 1, y) })
      for (let x = 8; x <= 11; x++) { block(x, 6); block(x, 10) }
      for (let y = 7; y <= 9; y++) { block(7, y); block(12, y) }
    }
    return { cols, rows, walkable }
  }, [room])

  useEffect(() => {
    const map = authorBubblesRef.current
    const now = Date.now()
    for (const [k, v] of Array.from(map.entries())) {
      if (v.expiresAt <= now) map.delete(k)
    }
    for (const m of recentMessages) {
      map.set(m.author, { text: m.text, expiresAt: m.timestamp + 3000 })
    }
  }, [recentMessages])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect
      setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (sitToggleSeq === 0) return
    if (isSitting) {
      setIsSitting(false)
      onSitChange?.(false)
      sitTargetRef.current = null
      return
    }
    const taken = new Set(peers.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`))
    const seats = seatsByRoom[room]
    if (!seats?.length) return

    const sx = Math.round(avatar.x), sy = Math.round(avatar.y)
    const sorted = [...seats]
      .filter((s) => grid.walkable[idx(s.x, s.y, grid.cols)] && !taken.has(`${s.x},${s.y}`))
      .sort((a, b) => Math.abs(a.x - sx) + Math.abs(a.y - sy) - (Math.abs(b.x - sx) + Math.abs(b.y - sy)))

    const target = sorted[0]
    if (!target) {
      bubbleRef.current = { text: "No free seat!", expiresAt: Date.now() + 2000 }
      return
    }

    const path = aStar(
      { x: sx, y: sy },
      { x: target.x, y: target.y },
      grid.cols, grid.rows,
      (x, y) => grid.walkable[idx(x, y, grid.cols)]
    )
    if (path.length > 1) {
      pathRef.current = { nodes: path, progress: 0 }
      sitTargetRef.current = target
      const first = path[1]
      const dx = first.x - sx
      const dy = first.y - sy
      const facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "E" : "W") : dy > 0 ? "S" : "N"
      setAvatar((a) => ({ ...a, facing }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitToggleSeq])

  const tryMoveOne = useCallback((dx: number, dy: number) => {
    if (isSitting) return false
    const sx = Math.round(avatar.x)
    const sy = Math.round(avatar.y)
    const nx = clamp(sx + dx, 1, grid.cols - 2)
    const ny = clamp(sy + dy, 1, grid.rows - 2)
    if (!grid.walkable[idx(nx, ny, grid.cols)]) return false
    pathRef.current = { nodes: [{ x: sx, y: sy }, { x: nx, y: ny }], progress: 0 }
    const facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "E" : "W") : dy > 0 ? "S" : "N"
    setAvatar((a) => ({ ...a, facing }))
    return true
  }, [avatar.x, avatar.y, grid, isSitting])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top

    // Check if click is on a stall
    const stalls = stallsRef.current
    console.log(`Click at px: ${px}, py: ${py}`)
    console.log(`Available stalls:`, stalls)
    
    for (const stall of stalls) {
      const inX = px >= stall.px - stall.width/2 && px <= stall.px + stall.width/2
      const inY = py >= stall.py - stall.height/2 && py <= stall.py + stall.height/2
      console.log(`Checking stall ${stall.id}: inX=${inX}, inY=${inY}, bounds: x(${stall.px - stall.width/2} to ${stall.px + stall.width/2}), y(${stall.py - stall.height/2} to ${stall.py + stall.height/2})`)
      
      if (inX && inY) {
        console.log(`🎯 CLICKED ON STALL: ${stall.id} (${stall.type})`)
        
        // Move avatar to stall position first
        const sx = Math.round(avatar.x)
        const sy = Math.round(avatar.y)
        
        // Check if the stall position is walkable, if not find nearest walkable spot
        let targetX = stall.x
        let targetY = stall.y
        
        if (!grid.walkable[idx(targetX, targetY, grid.cols)]) {
          // Find nearest walkable position around the stall
          const offsets = [[0,1], [1,0], [0,-1], [-1,0], [1,1], [-1,-1], [1,-1], [-1,1]]
          for (const [dx, dy] of offsets) {
            const newX = stall.x + dx
            const newY = stall.y + dy
            if (newX >= 0 && newY >= 0 && newX < grid.cols && newY < grid.rows && 
                grid.walkable[idx(newX, newY, grid.cols)]) {
              targetX = newX
              targetY = newY
              break
            }
          }
        }
        
        const path = aStar(
          { x: sx, y: sy },
          { x: targetX, y: targetY },
          grid.cols, grid.rows,
          (x, y) => grid.walkable[idx(x, y, grid.cols)]
        )
        
        console.log(`Path found: ${path.length} steps from (${sx},${sy}) to (${targetX},${targetY})`)
        
        if (path.length > 1) {
          pathRef.current = { nodes: path, progress: 0 }
          const first = path[1]
          const dx = first.x - sx
          const dy = first.y - sy
          const facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "E" : "W") : dy > 0 ? "S" : "N"
          setAvatar((a) => ({ ...a, facing }))
          
          // Show visit popup when avatar reaches the stall
          setTimeout(() => {
            console.log(`🚶 Avatar reached stall: ${stall.id} (${stall.type})`)
            
            // Get proper label based on stall ID
            const getStallLabel = (id: string) => {
              const labels: Record<string, string> = {
                "prediction-stall": "Prediction Market",
                "stake-stall": "KALE Staking",
                "yield-stall": "KALE Yield Farm", 
                "mall-stall": "KALE Mall",
                "liquidity-stall": "KALE Liquidity",
                "rewards-stall": "KALE Rewards",
                "governance-stall": "KALE Governance",
                "exchange-stall": "KALE Exchange",
                "produce-stall": "Produce Shop",
                "kale-cafe": "KALE Café",
                "wellness-stall": "KALE Wellness",
                "trading-stall": "Trading Floor",
                "futures-stall": "KALE Futures",
                "lending-stall": "KALE Lending",
                "insurance-stall": "KALE Insurance",
                "loans-stall": "KALE Loans",
                "treasury-stall": "KALE Treasury"
              }
              return labels[id] || "KALE Service"
            }
            
            const label = getStallLabel(stall.id)
            console.log(`🔮 Setting popup for ${label}`)
            setVisitPopup({ stallId: stall.id, stallType: stall.type, label })
          }, (path.length / 3.4) * 1000) // Calculate time based on movement speed
        } else {
          // No path found or already at location - show popup immediately
          const getStallLabel = (id: string) => {
            const labels: Record<string, string> = {
              "prediction-stall": "Prediction Market",
              "stake-stall": "KALE Staking",
              "yield-stall": "KALE Yield Farm", 
              "mall-stall": "KALE Mall",
              "liquidity-stall": "KALE Liquidity",
              "rewards-stall": "KALE Rewards",
              "governance-stall": "KALE Governance",
              "exchange-stall": "KALE Exchange",
              "produce-stall": "Produce Shop",
              "kale-cafe": "KALE Café",
              "wellness-stall": "KALE Wellness",
              "trading-stall": "Trading Floor",
              "futures-stall": "KALE Futures",
              "lending-stall": "KALE Lending",
              "insurance-stall": "KALE Insurance",
              "loans-stall": "KALE Loans",
              "treasury-stall": "KALE Treasury"
            }
            return labels[id] || "KALE Service"
          }
          
          const label = getStallLabel(stall.id)
          console.log(`🔮 Direct popup for ${label} (no movement needed)`)
          setVisitPopup({ stallId: stall.id, stallType: stall.type, label })
        }
        return
      }
    }

    const originInfo = computeCenteredOrigin(size.w, size.h, grid.cols, grid.rows, tileW, tileH)
    const params: IsoProjectParams = { tileW, tileH, originX: originInfo.x, originY: originInfo.y }
    const { tx, ty } = unprojectIso(px, py, params)

    if (isSitting) {
      setIsSitting(false)
      onSitChange?.(false)
      sitTargetRef.current = null
    }

    const sx = Math.round(avatar.x)
    const sy = Math.round(avatar.y)
    const clampedTx = clamp(tx, 1, grid.cols - 2)
    const clampedTy = clamp(ty, 1, grid.rows - 2)
    if (!grid.walkable[idx(clampedTx, clampedTy, grid.cols)]) return

    const path = aStar(
      { x: sx, y: sy },
      { x: clampedTx, y: clampedTy },
      grid.cols, grid.rows,
      (x, y) => grid.walkable[idx(x, y, grid.cols)]
    )
    if (path.length > 1) {
      pathRef.current = { nodes: path, progress: 0 }
      const first = path[1]
      const dx = first.x - sx
      const dy = first.y - sy
      const facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "E" : "W") : dy > 0 ? "S" : "N"
      setAvatar((a) => ({ ...a, facing }))
    }
  }, [avatar.x, avatar.y, grid, isSitting, onSitChange, size.w, tileH, tileW, room, onStallClick])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      const tag = active?.tagName?.toLowerCase()
      if (active?.isContentEditable || tag === "input" || tag === "textarea") return
      const map: Record<string, { dx: number; dy: number; facing: Avatar["facing"] }> = {
        ArrowUp: { dx: 0, dy: -1, facing: "N" }, w: { dx: 0, dy: -1, facing: "N" },
        ArrowDown: { dx: 0, dy: 1, facing: "S" }, s: { dx: 0, dy: 1, facing: "S" },
        ArrowLeft: { dx: -1, dy: 0, facing: "W" }, a: { dx: -1, dy: 0, facing: "W" },
        ArrowRight: { dx: 1, dy: 0, facing: "E" }, d: { dx: 1, dy: 0, facing: "E" },
      }
      const m = map[e.key]
      if (!m) return
      e.preventDefault()
      heldDirRef.current = m
      if (!pathRef.current) tryMoveOne(m.dx, m.dy)
    }
    const up = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(e.key)) heldDirRef.current = null
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up) }
  }, [tryMoveOne])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let lastTime = performance.now()

    function loop(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      const pr = pathRef.current
      const speedTilesPerSec = 3.4
      const moving = !!(pr && pr.nodes && pr.nodes.length > 1)
      animRef.current += dt * (moving ? 8 : 3)
      bgTimeRef.current += dt * 0.25 // slow, constant background speed

      // movement interpolation
      if (moving && pr) {
        pr.progress += speedTilesPerSec * dt
        const maxProgress = pr.nodes.length - 1
        if (pr.progress >= maxProgress) {
          const last = pr.nodes[pr.nodes.length - 1]
          if (last) setAvatar((a) => ({ ...a, x: last.x, y: last.y }))
          pathRef.current = null
          if (sitTargetRef.current && last && last.x === sitTargetRef.current.x && last.y === sitTargetRef.current.y) {
            setIsSitting(true)
            setAvatar((a) => ({ ...a, facing: sitTargetRef.current!.facing }))
            onSitChange?.(true)
          }
        } else {
          const segIndex = Math.min(Math.floor(pr.progress), pr.nodes.length - 2)
          const aNode = pr.nodes[segIndex]
          const bNode = pr.nodes[segIndex + 1]
          if (!aNode || !bNode) {
            pathRef.current = null
          } else {
            const t = pr.progress - segIndex
            const x = aNode.x + (bNode.x - aNode.x) * t
            const y = aNode.y + (bNode.y - aNode.y) * t
            const facing =
              Math.abs(bNode.x - aNode.x) > Math.abs(bNode.y - aNode.y)
                ? bNode.x > aNode.x ? "E" : "W"
                : bNode.y > aNode.y ? "S" : "N"
            setAvatar((av) => ({ ...av, x, y, facing }))
          }
        }
      } else if (!moving && heldDirRef.current && !isSitting) {
        const { dx, dy } = heldDirRef.current
        tryMoveOne(dx, dy)
      }

      if (onStep) {
        const sendEveryMs = 100
        if (now - lastSentRef.current > sendEveryMs) {
          lastSentRef.current = now
          onStep({ x: avatar.x, y: avatar.y, facing: avatar.facing })
        }
      }

      const dpr = window.devicePixelRatio || 1
      if (!canvas || !ctx) return
      if (canvas.width !== Math.floor(size.w * dpr) || canvas.height !== Math.floor(size.h * dpr)) {
        canvas.width = Math.floor(size.w * dpr); canvas.height = Math.floor(size.h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size.w, size.h)
      ctx.imageSmoothingEnabled = false

      // background (constant speed, softer clouds without borders)
      drawSky(ctx, size.w, size.h, bgTimeRef.current)
      drawCloudsBack(ctx, size.w, bgTimeRef.current)
      drawBirds(ctx, size.w, size.h, bgTimeRef.current)

      const originInfo = computeCenteredOrigin(size.w, size.h, grid.cols, grid.rows, tileW, tileH)
      const params: IsoProjectParams = { tileW, tileH, originX: originInfo.x, originY: originInfo.y }

      // tiles
      for (let y = 0; y < grid.rows; y++) {
        for (let x = 0; x < grid.cols; x++) {
          const { px, py } = projectIso(x, y, params)
          const walk = grid.walkable[idx(x, y, grid.cols)]
          const isCheck = (x + y) % 2 === 0
          const base = walk ? (isCheck ? palette.tileA : palette.tileB) : palette.block
          drawTile(ctx, px, py, tileW, tileH, base, "#000")
        }
      }

      drawWalls(ctx, grid, params, tileW, tileH)
      drawFurniture(ctx, room, params, tileW, tileH, animRef.current, stallsRef)

      const smoothMap = smoothPeersRef.current
      const peerBlend = clamp(dt * 8, 0, 1)
      for (const p of peers) {
        const s = smoothMap.get(p.id) ?? { x: p.x, y: p.y, facing: p.facing }
        s.x += (p.x - s.x) * peerBlend
        s.y += (p.y - s.y) * peerBlend
        s.facing = p.facing
        smoothMap.set(p.id, s)
      }
      for (const id of Array.from(smoothMap.keys())) {
        if (!peers.find((p) => p.id === id)) smoothMap.delete(id)
      }

      const peersSmoothed = peers.map((p) => ({ p, s: smoothMap.get(p.id) ?? p }))
      const peersSorted = peersSmoothed.sort((a, b) => (a.s.y - b.s.y))
      const labels: { id: string; text: string; x: number; yHead: number }[] = []
      if (ctx) {
        for (const { p, s } of peersSorted) {
          const { px: pX, py: pY } = projectIso(s.x, s.y, params)
          drawAvatar(ctx, pX, pY, tileW, tileH, s.facing, animRef.current, false, p.color, false, !!p.sit, !!p.wave, !!p.laugh)
          const headY = pY - 26
          labels.push({ id: p.id, text: p.name || "Guest", x: pX, yHead: headY })

          const b = authorBubblesRef.current.get(p.name)
          if (b && b.expiresAt > Date.now()) {
            drawBubble(ctx, pX, pY - 28 + (p.sit ? -6 : 0), b.text)
          }
        }

        const { px: ax, py: ay } = projectIso(avatar.x, avatar.y, params)
        const walkingOrHeld = !isSitting && (!!heldDirRef.current || moving)
        const bob = Math.sin(animRef.current * 2.2) * (walkingOrHeld ? 1.5 : 0.6)
        drawAvatar(ctx, ax, ay + (isSitting ? 0 : bob), tileW, tileH, avatar.facing, animRef.current, walkingOrHeld, undefined, false, isSitting, waving, laughing)
        const selfHeadY = (ay + (isSitting ? 0 : bob)) - 26
        labels.push({ id: "self", text: selfName, x: ax, yHead: selfHeadY })

        const myBubble = authorBubblesRef.current.get(selfName)
        if (myBubble && myBubble.expiresAt > Date.now()) {
          drawBubble(ctx, ax, ay - 28 + (isSitting ? -6 : bob), myBubble.text)
        }

        if (bubbleRef.current && bubbleRef.current.expiresAt > Date.now()) {
          drawBubble(ctx, ax, ay - 28 + (isSitting ? -6 : bob), bubbleRef.current.text)
        }

        drawCloudsFront(ctx, size.w, size.h, bgTimeRef.current)

        if (hoverId) {
          const hovered = labels.find(l => l.id === hoverId)
          if (hovered) drawNameplates(ctx, [hovered])
        }
      }
      hoverTargetsRef.current = labels.map(l => ({ id: l.id, name: l.text, x: l.x, yHead: l.yHead }))

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [avatar.facing, avatar.x, avatar.y, grid, room, size.w, size.h, peers, waving, laughing, isSitting, tryMoveOne, onStep, selfName, hoverId])

  const onDoubleClick = useCallback(() => {
    bubbleRef.current = { text: ":)", expiresAt: Date.now() + 2000 }
    onBubble?.(":)")
  }, [onBubble])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const targets = hoverTargetsRef.current
    let best: { id: string; d: number } | null = null
    const R = 28
    for (const t of targets) {
      const dx = mx - t.x
      const dy = my - (t.yHead - 8)
      const d = Math.hypot(dx, dy)
      if (d <= R && (!best || d < best.d)) best = { id: t.id, d }
    }
    setHoverId(best ? best.id : null)
  }, [])
  const onMouseLeave = useCallback(() => setHoverId(null), [])

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        onClick={handleClick}
        onDoubleClick={onDoubleClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="block w-full h-full cursor-pointer touch-none"
        aria-label="Isometric room canvas"
      />
      
      
      {/* Controls Hint */}
      <div className="absolute bottom-4 right-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
        <div>🎮 <strong>WASD</strong> or <strong>Arrow Keys</strong> to move</div>
        <div>🖱️ <strong>Click</strong> stalls to interact</div>
        <div>💬 <strong>Double-click</strong> to chat</div>
      </div>
      
      {/* Visit Dialog */}
      <Dialog open={!!visitPopup} onOpenChange={(open) => !open && setVisitPopup(null)}>
        <DialogContent className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-green-800 text-xl">
              Visit {visitPopup?.label}?
            </DialogTitle>
            <DialogDescription className="text-green-700">
              {visitPopup?.stallType === "prediction" ? "🔮 Enter the prediction markets to bet on future events with KALE tokens!" :
               visitPopup?.stallType === "produce" ? "🥕 Browse fresh organic produce from local farmers." :
               visitPopup?.stallType === "trading" ? "📈 Access KALE trading, futures, and DeFi services." :
               visitPopup?.stallType === "general" ? `🥬 Explore KALE-powered services and earn rewards!` :
               "This area offers KALE token utility and farming opportunities."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => setVisitPopup(null)}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (visitPopup) {
                  setVisitPopup(null)
                  onStallClick?.(visitPopup.stallId, visitPopup.stallType)
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* Background helpers (no dark borders, constant speed) */
function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  const phase = (Math.sin(t * 0.3) + 1) / 2
  g.addColorStop(0, `rgba(235,246,255,1)`)
  g.addColorStop(1, `rgba(${Math.round(150 + 25 * phase)}, ${Math.round(190 + 18 * phase)}, ${Math.round(215 + 8 * phase)}, 1)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}
function drawCloudsBack(ctx: CanvasRenderingContext2D, w: number, t: number) {
  const clouds = 4
  for (let i = 0; i < clouds; i++) {
    const speed = 3 + i * 1.2 // slower
    const x = ((t * speed * 8) % (w + 260)) - 260 + i * 90
    const y = 30 + i * 16
    ctx.save()
    ctx.globalAlpha = 0.85
    rounded(ctx, x, y, 110, 28, 14, "white", false)
    circle(ctx, x + 28, y + 11, 16, "white")
    circle(ctx, x + 66, y + 9, 18, "white")
    ctx.restore()
  }
}
function drawBirds(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const count = 4
  ctx.fillStyle = "rgba(0,0,0,0.45)"
  for (let i = 0; i < count; i++) {
    const bx = (w + ((t * 25 + i * 160) % (w + 80))) - 80
    const by = 70 + Math.sin(t * 0.9 + i) * 6 + i * 7
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + 7, by - 2)
    ctx.lineTo(bx + 14, by)
    ctx.fill()
  }
}

function drawCloudsFront(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const clouds = 3
  for (let i = 0; i < clouds; i++) {
    const speed = 2 + i * 0.7 // even slower
    const x = ((t * speed * 6) % (w + 320)) - 320 + i * 120
    const y = 40 + i * 22
    ctx.save()
    ctx.globalAlpha = 0.30 // subtle so avatars remain readable beneath
    rounded(ctx, x, y, 130, 34, 16, "white", false)
    circle(ctx, x + 34, y + 13, 18, "white")
    circle(ctx, x + 78, y + 10, 20, "white")
    ctx.restore()
  }
}

/* Existing drawing helpers below (unchanged) */
function drawTile(ctx: CanvasRenderingContext2D, px: number, py: number, tileW: number, tileH: number, fill: string, stroke: string) {
  const hw = tileW / 2
  const hh = tileH / 2
  ctx.beginPath()
  ctx.moveTo(Math.round(px) + 0.5, Math.round(py) + 0.5)
  ctx.lineTo(Math.round(px + hw) + 0.5, Math.round(py + hh) + 0.5)
  ctx.lineTo(Math.round(px) + 0.5, Math.round(py) + Math.round(tileH) + 0.5)
  ctx.lineTo(Math.round(px - hw) + 0.5, Math.round(py + hh) + 0.5)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = stroke
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(Math.round(px) + 0.5, Math.round(py) + 0.5)
  ctx.lineTo(Math.round(px - hw) + 0.5, Math.round(py + hh) + 0.5)
  ctx.strokeStyle = "rgba(255,255,255,0.35)"
  ctx.stroke()
}

function drawRaisedBlock(ctx: CanvasRenderingContext2D, px: number, py: number, tileW: number, tileH: number, top: string, outline: string, side: string) {
  drawTile(ctx, px, py - 8, tileW, tileH, top, outline)
  const hw = tileW / 2
  const hh = tileH / 2
  ctx.fillStyle = side
  ctx.strokeStyle = outline
  ctx.beginPath()
  ctx.moveTo(px, py + tileH - 8)
  ctx.lineTo(px + hw, py + hh - 8)
  ctx.lineTo(px + hw, py + hh)
  ctx.lineTo(px, py + tileH)
  ctx.closePath()
  ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(px, py + tileH - 8)
  ctx.lineTo(px - hw, py + hh - 8)
  ctx.lineTo(px - hw, py + hh)
  ctx.lineTo(px, py + tileH)
  ctx.closePath()
  ctx.fillStyle = shade(side, -15)
  ctx.fill(); ctx.stroke()
}

function drawWalls(ctx: CanvasRenderingContext2D, grid: Grid, params: IsoProjectParams, tileW: number, tileH: number) {
  const { cols, rows } = grid
  for (let x = 1; x < cols - 1; x++) {
    const { px, py } = projectIso(x, 1, params)
    drawRaisedBlock(ctx, px, py, tileW, tileH, palette.wallTop, "#000", palette.wallSide)
  }
  for (let y = 2; y < rows - 1; y++) {
    const { px, py } = projectIso(1, y, params)
    drawRaisedBlock(ctx, px, py, tileW, tileH, palette.wallTop, "#000", palette.wallSide)
  }
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  room: RoomPreset,
  params: IsoProjectParams,
  tileW: number,
  tileH: number,
  t: number,
  stallsRef: React.MutableRefObject<{ id: string; type: string; x: number; y: number; px: number; py: number; width: number; height: number }[]>
) {
    // Clear stalls array at start of each frame
    stallsRef.current = []
    
    // Enhanced clickable icon with visual polish
    const marketIcon = (x: number, y: number, id: string, type: string, label: string, icon: string) => {
      const { px, py } = projectIso(x, y, params)
      
      // Pulsing glow effect for important stalls (excluding prediction market)
      const isProduce = type === "produce"  
      const isTrading = type === "trading"
      const isImportant = isProduce || isTrading
      
      if (isImportant) {
        const glowIntensity = (Math.sin(t * 3) + 1) / 2 // Pulsing between 0-1
        const glowSize = 15 + glowIntensity * 8
        
        ctx.save()
        ctx.globalAlpha = 0.3 + glowIntensity * 0.2
        ctx.fillStyle = isProduce ? "#22c55e" : "#f59e0b"
        ctx.beginPath()
        ctx.arc(px, py - 10, glowSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      
      // Floating particles for active stalls (excluding prediction market)
      if (isImportant) {
        const particleCount = 3
        for (let i = 0; i < particleCount; i++) {
          const angle = (t * 0.5 + i * (Math.PI * 2 / particleCount)) % (Math.PI * 2)
          const radius = 25 + Math.sin(t * 2 + i) * 5
          const particleX = px + Math.cos(angle) * radius
          const particleY = py - 10 + Math.sin(angle) * radius * 0.5 - Math.abs(Math.sin(t * 4 + i)) * 10
          
          ctx.save()
          ctx.globalAlpha = 0.6 + Math.sin(t * 6 + i) * 0.3
          ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
          ctx.textAlign = "center"
          ctx.fillText(isProduce ? "🌱" : "💰", particleX, particleY)
          ctx.restore()
        }
      }
      
      // Animated sway for sign
      const swayAmount = Math.sin(t * 2 + x + y) * 1.5
      const iconY = py - 10 + swayAmount
      
      // Large icon with animation
      ctx.font = "48px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      ctx.fillStyle = "#fff"
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 2
      ctx.textAlign = "center"
      ctx.strokeText(icon, px, iconY)
      ctx.fillText(icon, px, iconY)
      
      
      // Ground label (static)
      ctx.font = "700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      ctx.fillStyle = "#000"
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 2
      ctx.strokeText(label, px, py + 20)
      ctx.fillText(label, px, py + 20)
      
      // "Coming Soon" signs for general stalls
      if (type === "general") {
        ctx.font = "600 8px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
        ctx.fillStyle = "#fbbf24"
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 1
        ctx.strokeText("COMING SOON", px, py + 35)
        ctx.fillText("COMING SOON", px, py + 35)
      }
      
      // Register as clickable area
      stallsRef.current.push({
        id,
        type,
        x,
        y,
        px,
        py: py - 10,
        width: 80,
        height: 80
      })
    }
    
    // Regular market stand (for non-interactive stalls)
    const marketStand = (x: number, y: number, color = "#8b4513") => {
      const { px, py } = projectIso(x, y, params)
      drawRaisedBlock(ctx, px, py, tileW, tileH, color, "#000", shade(color, -20))
    }
    // Basic crop plot
    const cropPlot = (x: number, y: number, crop = "#22c55e") => {
      const { px, py } = projectIso(x, y, params)
      drawTile(ctx, px, py, tileW, tileH, "#8b4513", "#000")
      circle(ctx, px, py - 4, 3, crop)
    }
    const musicBox = (m: { id: "sunny" | "night"; x: number; y: number; label: string }) => {
      const { px, py } = projectIso(m.x, m.y, params)

      rect(ctx, px - 12, py - 4, 24, 10, "#4a3b2f")
      ctx.fillStyle = "#b45309"
      ctx.beginPath()
      ctx.roundRect(px - 14, py - 48, 28, 44, 12)
      ctx.fill()
      ctx.strokeStyle = "#000"
      ctx.stroke()

      rounded(ctx, px - 12, py - 44, 24, 18, 6, "#d97706", true)
      rect(ctx, px - 10, py - 42, 20, 6, "#0ea5e9")

      rect(ctx, px - 11, py - 22, 22, 14, "#111827")
      const active = false // Simplified for now
      const bars = 6
      for (let i = 0; i < bars; i++) {
        const bx = px - 9 + i * 4
        const h = active ? 3 + Math.abs(Math.sin((t * 3) + i)) * 8 : 4
        rect(ctx, bx, py - 11 - h, 2, h, active ? ["#22c55e", "#f59e0b", "#ef4444"][i % 3] : "#334155")
      }

      const bulbs = 10
      for (let i = 0; i < bulbs; i++) {
        const angle = (Math.PI) * (i / (bulbs - 1))
        const rx = px + Math.cos(Math.PI + angle) * 12
        const ry = py - 26 + Math.sin(Math.PI + angle) * 12
        const on = active && ((Math.floor(t * 6) + i) % 2 === 0)
        circle(ctx, rx, ry, 2, on ? "#fde68a" : "#fca5a5")
        ctx.strokeStyle = "#000"; ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.stroke()
      }

      if (active) {
        ctx.save()
        ctx.font = "700 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
        ctx.fillStyle = "#111827"
        const yOff = (Math.sin(t * 2) * 4)
        ctx.fillText("♪", px - 18, py - 56 + yOff)
        ctx.fillText("♩", px + 14, py - 50 - yOff)
        ctx.restore()
      }

      // Removed interactive push since opt is not defined
      ctx.font = "700 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      ctx.fillStyle = "#111827"
      ctx.fillText("Jukebox", px - 18, py - 56)
    }

    const discoBall = (x: number, y: number) => {
      const { px, py } = projectIso(x, y, params)
      // Hang from "ceiling"
      ctx.strokeStyle = "#334155"
      ctx.beginPath()
      ctx.moveTo(px, py - 58)
      ctx.lineTo(px, py - 92)
      ctx.stroke()
      // Ball
      const r = 8
      const sparkle = (Math.sin(t * 6) + 1) / 2
      circle(ctx, px, py - 100, r, "#cbd5e1")
      ctx.strokeStyle = "#000"; ctx.beginPath(); ctx.arc(px, py - 100, r, 0, Math.PI * 2); ctx.stroke()
      // Simple light rays
      ctx.save()
      ctx.globalAlpha = 0.15 + sparkle * 0.15
      ctx.fillStyle = "#fef08a"
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + (t * 0.4)
        ctx.beginPath()
        ctx.moveTo(px, py - 100)
        ctx.lineTo(px + Math.cos(ang) * 34, py - 100 + Math.sin(ang) * 34)
        ctx.lineTo(px + Math.cos(ang + 0.4) * 28, py - 100 + Math.sin(ang + 0.4) * 28)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }

    const fountain = (x: number, y: number) => {
      const { px, py } = projectIso(x, y, params)
      // base
      circle(ctx, px, py - 6, 12, "#93c5fd")
      ctx.strokeStyle = "#000"; ctx.beginPath(); ctx.arc(px, py - 6, 12, 0, Math.PI * 2); ctx.stroke()
      // column
      rect(ctx, px - 3, py - 26, 6, 20, "#60a5fa")
      // jets
      ctx.save()
      ctx.fillStyle = "#bfdbfe"
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2
        const amp = 10 + Math.sin(t * 4 + i) * 2
        const jx = px + Math.cos(ang) * amp
        const jy = py - 26 + Math.sin(ang) * amp * 0.5
        circle(ctx, jx, jy, 2, "#bfdbfe")
      }
      ctx.restore()
    }

    const aquarium = (x: number, y: number) => {
      const { px, py } = projectIso(x, y, params)
      // tank
      rect(ctx, px - 18, py - 28, 36, 18, "#0ea5e9")
      ctx.fillStyle = "rgba(255,255,255,0.25)"
      ctx.fillRect(px - 18, py - 28, 36, 18)
      // fish
      const fx = px - 12 + ((Math.sin(t * 1.5) + 1) / 2) * 24
      const fy = py - 18 + Math.sin(t * 3) * 1.5
      circle(ctx, fx, fy, 3, "#f59e0b")
      rect(ctx, fx + 3, fy - 1, 3, 2, "#f59e0b")
    }

    const bannerTop = (gridCols: number) => {
      // A banner centered on the top wall around (cols/2, 1)
      const mid = projectIso(Math.floor(gridCols / 2), 1, params)
      rect(ctx, mid.px - 32, mid.py - 42, 64, 12, "#22c55e")
    }

    const catNpc = () => {
      // Walk a small loop near bottom-right
      const path: { x: number; y: number }[] = [{x:13,y:11},{x:15,y:12},{x:16,y:10},{x:14,y:9}]
      const prog = (t * 0.25) % path.length
      const a = Math.floor(prog)
      const b = (a + 1) % path.length
      const tt = prog - a
      const cx = path[a].x + (path[b].x - path[a].x) * tt
      const cy = path[a].y + (path[b].y - path[a].y) * tt
      const { px, py } = projectIso(cx, cy, params)
      // tiny cat
      rect(ctx, px - 4, py - 18, 8, 6, "#1f2937")  // body
      circle(ctx, px + 5, py - 18, 3, "#1f2937")   // head
      // tail
      ctx.strokeStyle = "#1f2937"
      ctx.beginPath()
      ctx.moveTo(px - 4, py - 16)
      ctx.quadraticCurveTo(px - 8, py - 18, px - 6, py - 20)
      ctx.stroke()
    }

    if (room === "Lobby") {
      // Main Market - KALE-focused activities
      marketIcon(3, 4, "prediction-stall", "prediction", "PREDICT", "🔮") // Corner spot
      marketIcon(7, 2, "stake-stall", "general", "STAKE", "🥬") // Stake KALE tokens
      marketIcon(14, 3, "yield-stall", "general", "YIELD FARM", "🌾") // KALE yield farming
      marketIcon(9, 8, "mall-stall", "general", "KALE MALL", "🏬") // Central shopping with KALE
      
      marketIcon(2, 9, "liquidity-stall", "general", "LIQUIDITY", "💧") // KALE liquidity pools
      marketIcon(6, 12, "rewards-stall", "general", "REWARDS", "🎁") // KALE rewards program
      marketIcon(12, 7, "governance-stall", "general", "VOTE", "🗳️") // KALE governance
      marketIcon(16, 11, "exchange-stall", "general", "EXCHANGE", "🔄") // KALE token exchange
      
    } else if (room === "Café") {
      // Produce area - KALE dining & wellness
      marketIcon(5, 3, "produce-stall", "produce", "PRODUCE", "🥕") // Fresh produce
      marketIcon(12, 5, "kale-cafe", "general", "KALE CAFÉ", "☕") // KALE smoothies & health foods
      marketIcon(16, 8, "wellness-stall", "general", "WELLNESS", "🧘") // KALE health benefits
    } else {
      // Trading Floor - KALE DeFi services
      marketIcon(6, 4, "trading-stall", "trading", "TRADING", "📈") // Central
      marketIcon(13, 3, "futures-stall", "trading", "KALE FUTURES", "📊") // KALE futures
      marketIcon(17, 7, "lending-stall", "general", "KALE LENDING", "🏦") // KALE lending
      
      marketIcon(3, 10, "insurance-stall", "general", "KALE INSURANCE", "🛡️") // KALE insurance
      marketIcon(8, 13, "loans-stall", "general", "KALE LOANS", "💰") // KALE-backed loans
      marketIcon(15, 12, "treasury-stall", "general", "TREASURY", "🏛️") // KALE treasury
      
      // KALE market data displays
      cropPlot(5, 8) // KALE price terminal
      cropPlot(11, 9) // KALE analytics
      cropPlot(14, 5) // KALE metrics
    }
  }

  function drawAvatar(
    ctx: CanvasRenderingContext2D,
    ax: number,
    ay: number,
    tileW: number,
    tileH: number,
    facing: "N" | "S" | "E" | "W",
    t: number,
    moving: boolean,
    shirtColor?: string,
    dancing?: boolean,
    sitting?: boolean,
    waving?: boolean,
    laughing?: boolean
  ) {
    ctx.fillStyle = "rgba(0,0,0,0.2)"
    ctx.beginPath()
    ctx.ellipse(ax, ay + tileH * 0.6, tileW * 0.22, tileH * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()

    const walkSwing = Math.sin(t * 6) * (moving ? 3 : 1)
    const armSwing = Math.sin(t * 6 + Math.PI) * (moving ? 5 : 2)
    const dancePhase = dancing ? t * 8 : 0
    const danceBob = dancing ? Math.sin(dancePhase) * 2 : 0
    const danceArm = dancing ? Math.sin(dancePhase * 1.5) * 7 : 0
    const waveShimmy = waving ? Math.sin(t * 10) * 3 : 0
    const laughJitter = laughing ? Math.sin(t * 20) * 1.5 : 0

    if (sitting) {
      rect(ctx, ax - 7, ay + 10, 7, 4, "#2b2b2b")
      rect(ctx, ax + 0, ay + 10, 7, 4, "#2b2b2b")
      rounded(ctx, ax - 10, ay - 12, 20, 20, 6, shirtColor || palette.avatarShirt, true)
      rounded(ctx, ax - 13, ay - 6, 6, 12, 3, palette.avatarHead, true)
      rounded(ctx, ax + 7, ay - 6, 6, 12, 3, palette.avatarHead, true)
      circle(ctx, ax, ay - 20, 12, palette.avatarHead)
      rounded(ctx, ax - 12, ay - 31, 24, 10, 6, "#5b3a1a", true)
      rect(ctx, ax - 12, ay - 26, 24, 5, "#5b3a1a")
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(ax, ay - 20, 12, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeRect(Math.round(ax - 10) + 0.5, Math.round(ay - 12) + 0.5, 20, 20)
      drawFace(ctx, facing, ax, ay - 20, false)
      return
    }

    rect(ctx, ax - 6, ay + 8 + (dancing ? 0 : walkSwing * -0.3), 6, 10, "#2b2b2b")
    rect(ctx, ax + 1, ay + 8 + (dancing ? 0 : walkSwing * 0.3), 6, 10, "#2b2b2b")
    rect(ctx, ax - 7, ay + 17 + (dancing ? 0 : walkSwing * -0.3), 8, 3, "#1a1a1a")
    rect(ctx, ax + 0, ay + 17 + (dancing ? 0 : walkSwing * 0.3), 8, 3, "#1a1a1a")

    rounded(ctx, ax - 10, ay - 18 + danceBob + laughJitter, 20, 26, 6, shirtColor || palette.avatarShirt, true)
    rect(ctx, ax - 6, ay - 18 + danceBob + laughJitter, 12, 3, "#ffffff")
    rect(ctx, ax - 6, ay - 15 + danceBob + laughJitter, 12, 2, "#cbd5e1")

    rounded(ctx, ax - 13, ay - 12 + (dancing ? -danceArm : armSwing * -0.15) + danceBob + laughJitter, 6, 14, 3, palette.avatarHead, true)
    if (waving) {
      rounded(ctx, ax + 7, ay - 24 + waveShimmy + danceBob + laughJitter, 6, 14, 3, palette.avatarHead, true)
      rect(ctx, ax + 10, ay - 28 + waveShimmy + danceBob + laughJitter, 4, 4, "#fde68a")
    } else {
      rounded(ctx, ax + 7, ay - 12 + (dancing ? danceArm : armSwing * 0.15) + danceBob + laughJitter, 6, 14, 3, palette.avatarHead, true)
    }

    circle(ctx, ax, ay - 26 + danceBob + laughJitter, 12, palette.avatarHead)
    rounded(ctx, ax - 12, ay - 37 + danceBob + laughJitter, 24, 10, 6, "#5b3a1a", true)
    rect(ctx, ax - 12, ay - 32 + danceBob + laughJitter, 24, 5, "#5b3a1a")

    ctx.strokeStyle = "#000"; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(ax, ay - 26 + danceBob + laughJitter, 12, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeRect(Math.round(ax - 10) + 0.5, Math.round(ay - 18 + danceBob + laughJitter) + 0.5, 20, 26)

    drawFace(ctx, facing, ax, ay - 26 + danceBob + laughJitter, !!laughing)
  }

  function drawFace(ctx: CanvasRenderingContext2D, facing: "N" | "S" | "E" | "W", cx: number, cy: number, laughing: boolean) {
    ctx.fillStyle = "#000"
    if (facing === "E") { dot(ctx, cx + 4, cy - 2); dot(ctx, cx + 7, cy + 1) }
    else if (facing === "W") { dot(ctx, cx - 4, cy - 2); dot(ctx, cx - 7, cy + 1) }
    else if (facing === "N") { dot(ctx, cx - 3, cy - 4); dot(ctx, cx + 3, cy - 4) }
    else { dot(ctx, cx - 3, cy - 1); dot(ctx, cx + 3, cy - 1) }

    if (laughing) {
      ctx.fillStyle = "#7f1d1d"
      ctx.beginPath()
      ctx.ellipse(cx, cy + 4, 3.5, 2.5, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.strokeStyle = "#000"
      ctx.beginPath()
      ctx.moveTo(cx - 3, cy + 4)
      ctx.quadraticCurveTo(cx, cy + 6, cx + 3, cy + 4)
      ctx.stroke()
    }

    if (laughing) {
      ctx.font = "700 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
      ctx.fillStyle = "#111827"
      ctx.fillText("ha", cx + 10, cy - 6)
      ctx.fillText("ha", cx - 18, cy - 2)
    }
  }



function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x)+0.5, Math.round(y)+0.5, Math.round(w), Math.round(h))
}
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = false) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
  if (stroke) { ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke() }
}
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}
function dot(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath()
  ctx.arc(Math.round(x) + 0.5, Math.round(y) + 0.5, 2, 0, Math.PI * 2)
  ctx.fill()
}
function drawNameplates(ctx: CanvasRenderingContext2D, labels: { id: string; text: string; x: number; yHead: number }[]) {
  const placed: { x: number; y: number; w: number; h: number }[] = []
  ctx.font = "700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
  for (const l of labels) {
    const metrics = ctx.measureText(l.text)
    const padX = 6, padY = 3
    const w = Math.max(24, metrics.width + padX * 2)
    const h = 18
    let cx = Math.round(l.x - w / 2)
    let cy = Math.round(l.yHead - 12 - h)
    let tries = 0
    const intersects = (a: {x:number; y:number; w:number; h:number}, b: {x:number; y:number; w:number; h:number}) =>
      !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
    while (tries < 8) {
      const candidate = { x: cx, y: cy, w, h }
      if (!placed.some((r) => intersects(candidate, r))) {
        placed.push(candidate)
        ctx.fillStyle = "rgba(255,255,255,0.95)"
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 1
        roundRect(ctx, candidate.x + 0.5, candidate.y + 0.5, candidate.w, candidate.h, 6, true, true)
        ctx.fillStyle = "#111827"
        ctx.fillText(l.text, candidate.x + padX, candidate.y + h - padY - 2)
        break
      }
      cy -= 8
      tries++
    }
  }
}
function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  const padding = 7
  ctx.font = "500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
  const metrics = ctx.measureText(text)
  const w = Math.max(24, metrics.width + padding * 2)
  const h = 20
  ctx.fillStyle = "rgba(255,255,255,0.95)"
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 1
  roundRect(ctx, Math.round(x - w / 2) + 0.5, Math.round(y - h - 8) + 0.5, Math.round(w), h, 4, true, true)
  ctx.beginPath()
  ctx.moveTo(Math.round(x) + 0.5, Math.round(y - 8) + 0.5)
  ctx.lineTo(Math.round(x - 6) + 0.5, Math.round(y - 12) + 0.5)
  ctx.lineTo(Math.round(x + 6) + 0.5, Math.round(y - 12) + 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = "#111827"
  ctx.fillText(text, Math.round(x - w / 2 + padding), Math.round(y - h - 8 + 14))
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: boolean = false, stroke: boolean = false) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
  if (fill) ctx.fill()
  if (stroke) ctx.stroke()
}
function drawFloatingElements(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.save()
  
  // Floating KALE tokens
  const tokenCount = 6
  for (let i = 0; i < tokenCount; i++) {
    const x = (w * 0.1) + ((t * 20 + i * 120) % (w * 0.8))
    const y = 60 + Math.sin(t * 0.8 + i * 1.2) * 15 + (i % 3) * 20
    
    ctx.globalAlpha = 0.7 + Math.sin(t * 2 + i) * 0.2
    ctx.font = "16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
    ctx.textAlign = "center"
    
    // Rotate the token slightly
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.sin(t * 1.5 + i) * 0.3)
    ctx.fillText("🥬", 0, 0)
    ctx.restore()
  }
  
  // Sparkle effects
  const sparkleCount = 8
  for (let i = 0; i < sparkleCount; i++) {
    const x = (t * 15 + i * 80) % w
    const y = 40 + Math.sin(t * 1.2 + i * 0.8) * 20 + (i % 4) * 15
    
    const sparklePhase = (t * 4 + i) % (Math.PI * 2)
    const brightness = Math.max(0, Math.sin(sparklePhase))
    
    if (brightness > 0.1) {
      ctx.globalAlpha = brightness
      ctx.font = `${8 + brightness * 4}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`
      ctx.textAlign = "center"
      
      // Random sparkle types
      const sparkles = ["✨", "⭐", "🌟", "💫"]
      const sparkleType = sparkles[i % sparkles.length]
      
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(t * 2 + i)
      ctx.scale(brightness, brightness)
      ctx.fillText(sparkleType, 0, 0)
      ctx.restore()
    }
  }
  
  ctx.restore()
}

function shade(hex: string, percent: number) {
  const f = parseInt(hex.slice(1), 16)
  const t = percent < 0 ? 0 : 255
  const p = Math.abs(percent) / 100
  const R = f >> 16, G = (f >> 8) & 0x00ff, B = f & 0x0000ff
  const newR = Math.round((t - R) * p) + R
  const newG = Math.round((t - G) * p) + G
  const newB = Math.round((t - B) * p) + B
  return "#" + (0x1000000 + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)
}

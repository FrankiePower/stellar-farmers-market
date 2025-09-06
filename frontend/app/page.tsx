"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Map, WifiOff } from 'lucide-react'
import IsoRoom, { type RoomPreset } from "@/components/iso-room"
import ChatPanel from "@/components/chat-panel"
import WindowFrame from "@/components/window-frame"
import ConnectWallet from "@/components/ConnectWallet"
import styles from "@/styles/habbo.module.css"
import { useMultiplayer } from "@/hooks/use-multiplayer"
import { getPublicKey } from "../src/stellar-wallets-kit"

function getOrCreateId(key: string) {
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch {
    return "guest-" + Math.random().toString(36).slice(2, 10)
  }
}
function getOrCreateName() {
  try {
    const existing = localStorage.getItem("pp_name")
    if (existing) return existing
    const name = "Guest-" + Math.floor(Math.random() * 9000 + 1000)
    localStorage.setItem("pp_name", name)
    return name
  } catch {
    return "Guest-" + Math.floor(Math.random() * 9000 + 1000)
  }
}


export default function Page() {
  const [room, setRoom] = useState<RoomPreset>("Lobby")
  const [chatOpen, setChatOpen] = useState(true)
  const [navOpen, setNavOpen] = useState(true)

  const [uid, setUid] = useState("")
  const [displayName, setDisplayName] = useState("Guest")
  const router = useRouter()
  const searchParams = useSearchParams()

  // Offline mode: no Supabase env available on client
  const offlineMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  useEffect(() => {
    setUid(getOrCreateId("pp_uid"))
    
    async function updateDisplayName() {
      try {
        const walletAddress = await getPublicKey()
        if (walletAddress) {
          setDisplayName(shortenAddress(walletAddress))
        } else {
          setDisplayName(getOrCreateName())
        }
      } catch {
        setDisplayName(getOrCreateName())
      }
    }
    
    updateDisplayName()

    // Listen for wallet connection changes
    const interval = setInterval(updateDisplayName, 2000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const roomParam = searchParams.get('room')
    if (roomParam && (roomParam === 'Lobby' || roomParam === 'Café' || roomParam === 'Rooftop')) {
      setRoom(roomParam as RoomPreset)
    }
  }, [searchParams])









  const {
    messages,
    sendMessage,
    others,
    postPosition,
    setSit,
    selfSit,
    triggerWave,
    selfWave,
    triggerLaugh,
    selfLaugh,
  } = useMultiplayer({
    room,
    userId: uid || "boot",
    name: displayName,
    offline: offlineMode,
  })

  const [sitSeq, setSitSeq] = useState(0)

  const handleSend = useCallback(
    async (text: string) => {
      const t = text.trim().toLowerCase()
      if (t.startsWith("/sit")) {
        if (selfSit) setSit(false)
        else setSitSeq((n) => n + 1)
        return
      }
      if (t.startsWith("/wave")) {
        triggerWave()
        return
      }
      if (t.startsWith("/laugh")) {
        triggerLaugh()
        return
      }
      await sendMessage(text)
    },
    [sendMessage, selfSit, setSit, triggerWave, triggerLaugh]
  )

  const handleRoomChange = useCallback((next: RoomPreset) => setRoom(next), [])

  const handleStallClick = useCallback((stallId: string, stallType: string) => {
    console.log(`=== STALL CLICK HANDLER ===`)
    console.log(`Clicked stall: ${stallId} (${stallType})`)
    console.log(`Router:`, router)
    
    if (stallType === "prediction") {
      console.log(`Routing to prediction markets...`)
      // Route to prediction markets page
      router.push("/prediction-markets")
    } else if (stallType === "produce") {
      console.log(`Routing to produce shop...`)
      // Route to produce shop (placeholder)
      router.push("/produce-shop")
    } else if (stallType === "trading") {
      console.log(`Routing to trading floor...`)
      // Route to trading floor (placeholder)  
      router.push("/trading-floor")
    } else if (stallId === "yield-stall") {
      console.log(`Routing to KALE farm...`)
      // Route to external KALE farm website
      window.open("https://testnet.kalefarm.xyz/", "_blank")
    } else {
      console.log(`Showing closed message for ${stallType}`)
      // General stall - show closed message
      alert(`This ${stallType} stall is currently closed. Come back later!`)
    }
  }, [router])

  const onlineCount = useMemo(() => (others ? others.length + 1 : 1), [others])
  const roomTitle = useMemo(() => {
    const roomName = room === "Lobby" ? "Main Market" : 
                     room === "Café" ? "Produce Area" : 
                     room === "Rooftop" ? "Trading Area" : room
    return `${roomName} — Online: ${onlineCount}`
  }, [room, onlineCount])

  // Use the last 10 messages for in-room bubbles (per author)
  const recentForBubbles = useMemo(() => messages.slice(-10), [messages])

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#a3b18a]">
      <header className="border-b border-black/40 bg-[#344e41]">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-3">
          <div className={styles.logoBlock} aria-label="Pixel Plaza logo">
            <span className={styles.logoWord}>FARMERS MARKET</span>
          </div>
          <Separator orientation="vertical" className="h-6 bg-black/50" />
          <div className="text-sm text-white/80 hidden sm:block">{roomTitle}</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className={styles.pixelButton} onClick={() => setNavOpen((v) => !v)}>
              <Map className="w-4 h-4" /> Navigator
            </Button>
            <Button variant="outline" className={styles.pixelButton} onClick={() => setChatOpen((v) => !v)}>
              <MessageSquare className="w-4 h-4" /> Chat
            </Button>
            <ConnectWallet />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-4">
          <div className={styles.playFrame}>
            <div className="relative w-full h-[70vh] min-h-[520px]">
              <IsoRoom
                room={room}
                selfName={displayName}
                onBubble={(t) => handleSend(t)}
                recentMessages={recentForBubbles}
                peers={others}
                onStep={(s) => postPosition(s)}
                waving={selfWave}
                laughing={selfLaugh}
                sitToggleSeq={sitSeq}
                onSitChange={(value) => setSit(value)}
                onStallClick={handleStallClick}
              />
              {offlineMode && (
                <div
                  className="absolute bottom-2 left-2 text-[11px] text-black/80 rounded-md border border-black/30 bg-white/90 px-2 py-1 shadow-sm flex items-center gap-1"
                  aria-live="polite"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline mode (no Supabase env)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {chatOpen && (
        <WindowFrame
          id="chat"
          title="Chat"
          variant="habbo"
          initial={{ x: 16, y: 88, w: 360, h: 360 }}
          onClose={() => setChatOpen(false)}
          ariaTitle="Chat window"
        >
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            placeholder="Try /wave, /laugh, /sit - Chat with farmers!"
            maxLength={240}
          />
        </WindowFrame>
      )}

      {navOpen && (
        <WindowFrame
          id="navigator"
          title="Market Navigator"
          variant="habbo"
          initial={{ x: 400, y: 88, w: 360, h: 420 }}
          onClose={() => setNavOpen(false)}
          ariaTitle="Navigator window"
        >
          <div className="p-0 h-full flex flex-col">
            <div className={styles.tabBar}>
              <div className={styles.tabActive}>Public Spaces</div>
              <div className={styles.tab}>Guest Rooms</div>
            </div>
            <div className="px-3 py-2 text-[12px] text-black/80">Market Areas</div>
            <div className="px-3 pb-3 space-y-2">
              {[
                { label: "Main Market 🌾", value: "Lobby" as RoomPreset },
                { label: "Produce Area 🥕", value: "Café" as RoomPreset },
                { label: "Trading Area 📊", value: "Rooftop" as RoomPreset },
              ].map((r) => (
                <div key={r.label} className={styles.navRow}>
                  <div className={styles.navDot} />
                  <div className="truncate">{r.label}</div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className={styles.statusPill}>Open</div>
                    <Button size="sm" className={styles.goButton} onClick={() => handleRoomChange(r.value)}>
                      Go
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto border-t border-black/20 text-[11px] text-black/70 px-3 py-2">
              Tip: Click tiles or hold WASD/Arrows to walk. Emotes: /wave, /laugh, /sit. Trade with other farmers!
            </div>
          </div>
        </WindowFrame>
      )}

    </div>
  )
}

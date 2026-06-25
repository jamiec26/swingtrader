import { useEffect } from 'react'
import { useStore } from './store'
import { api } from './api/client'
import { NavRail } from './components/layout/NavRail'
import { CommandPalette } from './components/layout/CommandPalette'
import { MarketScan } from './components/scan/MarketScan'
import { OpportunityBoard } from './components/board/OpportunityBoard'
import { AnalysisWorkspace } from './components/workspace/AnalysisWorkspace'
import { PortfolioRisk } from './components/portfolio/PortfolioRisk'
import { TradeJournal } from './components/journal/TradeJournal'
import type { Workspace } from './types'

export default function App() {
  const {
    workspace,
    setWorkspace,
    setAccount,
    commandPaletteOpen,
    setCommandPaletteOpen,
    scanProgress,
    setScanProgress,
    setSignals,
  } = useStore()

  // Load account data, latest scan, and initial signals on mount
  useEffect(() => {
    api.account.get()
      .then((acc) => {
        setAccount(acc)
      })
      .catch((err) => {
        console.warn('API connection failed, running in offline/demo mode with mock account.', err)
      })

    async function initScanState() {
      try {
        const latest = await api.scan.latest()
        if (latest) {
          setScanProgress(latest)
          // Fetch signals for the latest scan run
          const sigs = await api.signals.list(latest.run_id)
          setSignals(sigs)
        }
      } catch (err) {
        console.warn('Failed to initialize scan state on mount:', err)
      }
    }
    initScanState()
  }, [setAccount, setScanProgress, setSignals])

  // Poll active scan globally so it continues in background and updates store/board
  useEffect(() => {
    if (!scanProgress || scanProgress.status !== 'running') {
      return
    }

    const runId = scanProgress.run_id
    let isMounted = true

    const interval = setInterval(async () => {
      try {
        const progress = await api.scan.progress(runId)
        if (!isMounted) return

        setScanProgress(progress)

        if (progress.signals_found > 0) {
          const sigs = await api.signals.list(runId)
          if (isMounted) setSignals(sigs)
        }

        if (progress.status === 'complete') {
          clearInterval(interval)
          const sigs = await api.signals.list(runId)
          if (isMounted) {
            setSignals(sigs)
            // Auto-navigate to board if we are currently looking at the scan page
            if (useStore.getState().workspace === 'scan') {
              setTimeout(() => {
                if (useStore.getState().workspace === 'scan') {
                  setWorkspace('board')
                }
              }, 800)
            }
          }
        } else if (progress.status === 'error' || progress.status === 'cancelled') {
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Error polling scan progress:', err)
        clearInterval(interval)
      }
    }, 800)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [scanProgress?.run_id, scanProgress?.status, setScanProgress, setSignals, setWorkspace])

  // Keybindings for navigation and search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      } else if (isMod && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault()
        const workspaces: Workspace[] = ['scan', 'board', 'workspace', 'portfolio', 'journal']
        const idx = parseInt(e.key) - 1
        if (idx >= 0 && idx < workspaces.length) {
          setWorkspace(workspaces[idx])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen, setWorkspace])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--canvas)',
        overflow: 'hidden',
      }}
    >
      <NavRail />
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {workspace === 'scan' && <MarketScan />}
        {workspace === 'board' && <OpportunityBoard />}
        {workspace === 'workspace' && <AnalysisWorkspace />}
        {workspace === 'portfolio' && <PortfolioRisk />}
        {workspace === 'journal' && <TradeJournal />}
      </div>
      <CommandPalette />
    </div>
  )
}

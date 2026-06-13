import { TabProvider } from '../contexts/TabContext'
import { MultiWindowProvider } from '../contexts/MultiWindowContext'
import { DistractionFreeProvider, useDistractionFree } from '../contexts/DistractionFreeContext'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'
import TerminalShell from './TerminalShell'
import ChatModeInterface from './ChatModeInterface'
import CommandPalette from './CommandPalette'
import KeyboardShortcutListener from './KeyboardShortcuts'

function ChatLayout() {
  return (
    <div className="flex h-screen bg-primary">
      <ChatModeInterface />
      <CommandPalette onThemeChange={() => {}} />
      <KeyboardShortcutListener />
    </div>
  )
}

export default function Layout() {
  const { mode } = useInterfaceMode()

  if (mode === 'chat') {
    return (
      <TabProvider>
        <ChatLayout />
      </TabProvider>
    )
  }

  return (
    <TabProvider>
      <MultiWindowProvider>
        <DistractionFreeProvider>
          <TerminalShell />
        </DistractionFreeProvider>
      </MultiWindowProvider>
    </TabProvider>
  )
}

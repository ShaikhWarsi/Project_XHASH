import { TabProvider } from '../contexts/TabContext'
import { MultiWindowProvider } from '../contexts/MultiWindowContext'
import { DistractionFreeProvider } from '../contexts/DistractionFreeContext'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'
import { useTheme } from '../contexts/ThemeContext'
import TerminalShell from './TerminalShell'
import ChatModeInterface from './ChatModeInterface'
import CommandPalette from './CommandPalette'
import KeyboardShortcutListener from './KeyboardShortcuts'

function ChatLayout() {
  const { setTheme } = useTheme()
  return (
    <MultiWindowProvider>
      <DistractionFreeProvider>
        <div className="flex h-screen bg-primary">
          <ChatModeInterface />
          <CommandPalette onThemeChange={setTheme} />
          <KeyboardShortcutListener />
        </div>
      </DistractionFreeProvider>
    </MultiWindowProvider>
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

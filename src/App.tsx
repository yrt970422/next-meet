import { AppProvider } from './app/providers/AppProvider'
import { AppRouter } from './app/router'
import { UpdateNotice } from './components/UpdateNotice'

function App() {
  return (
    <AppProvider>
      <AppRouter />
      <UpdateNotice />
    </AppProvider>
  )
}

export default App

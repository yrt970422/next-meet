import { AppProvider } from './app/providers/AppProvider'
import { AppRouter } from './app/router'
import './App.css'

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}

export default App

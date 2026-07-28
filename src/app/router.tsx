import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './AppShell'
import HomePage from '../pages/HomePage'
import CardsPage from '../pages/CardsPage'
import AchievementsPage from '../pages/AchievementsPage'
import HistoryPage from '../pages/HistoryPage'
import SettingsPage from '../pages/SettingsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'cards',
        element: <CardsPage />,
      },
      {
        path: 'achievements',
        element: <AchievementsPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

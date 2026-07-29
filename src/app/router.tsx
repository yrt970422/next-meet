import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom'
import { AppShell } from './AppShell'
import HomePage from '../pages/HomePage'
import CyclePage from '../pages/CyclePage'
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
        path: 'cycle',
        element: <CyclePage />,
      },
      {
        path: 'cards',
        element: <Navigate to="/cycle" replace />,
      },
      {
        path: 'history',
        element: <Navigate to="/cycle" replace />,
      },
      {
        path: 'calendar',
        element: <Navigate to="/cycle" replace />,
      },
      {
        path: 'achievements',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

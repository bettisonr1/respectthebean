import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/common/Layout'
import Home from './pages/Home'
import NewShot from './pages/NewShot'
import Beans from './pages/Beans'
import History from './pages/History'
import Machines from './pages/Machines'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shot/new" element={<NewShot />} />
          <Route path="beans" element={<Beans />} />
          <Route path="history" element={<History />} />
          <Route path="machines" element={<Machines />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

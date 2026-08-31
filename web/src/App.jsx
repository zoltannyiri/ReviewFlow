import './App.css'

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ReviewPage from './pages/ReviewPage'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/r/:token" element={<ReviewPage />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App

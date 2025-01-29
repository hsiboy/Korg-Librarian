import React from 'react'
import { M1Librarian } from './components/M1Librarian'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900">
          Korg M1 Web Librarian
        </h1>
        <M1Librarian />
      </div>
    </div>
  )
}

export default App

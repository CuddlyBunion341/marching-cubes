import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import githubLogo from './assets/github-mark-white.svg'
import './index.css'
import { setupRenderer } from './game'

function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer !== null) {
      setupRenderer(canvasContainer);
    } else {
      throw new Error('Canvas container not found');
    }
  }, []);

  return (
    <>
      <div id="canvas-container" className="fixed top-0 left-0 w-screen h-screen z-0"></div>
      
      <div className="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-between p-4 md:p-8 pointer-events-none z-10">
        <div className="w-full flex items-center justify-center">
          <div className="bg-black/30 backdrop-blur-md px-8 py-3 rounded-full flex gap-6 border border-white/10 shadow-[0_0_30px_rgba(100,108,255,0.3)]">
            <a href="https://vite.dev" target="_blank" className="pointer-events-auto relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-70 blur transition-all duration-300 group-hover:duration-200"></div>
              <img 
                src={viteLogo} 
                className="h-12 p-1 relative transition-all duration-500 hover:rotate-12" 
                alt="Vite logo" 
              />
            </a>
            <a href="https://react.dev" target="_blank" className="pointer-events-auto relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-70 blur transition-all duration-300 group-hover:duration-200"></div>
              <img 
                src={reactLogo} 
                className="h-12 p-1 relative animate-[spin_20s_linear_infinite]" 
                alt="React logo" 
              />
            </a>
            <a href="https://github.com/CuddlyBunion341/bun-threejs-boilerplate" target="_blank" className="pointer-events-auto relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 opacity-0 group-hover:opacity-70 blur transition-all duration-300 group-hover:duration-200"></div>
              <img 
                src={githubLogo} 
                className="h-12 p-1 relative transition-all duration-500 hover:rotate-12" 
                alt="GitHub logo" 
              />
            </a>
          </div>
        </div>
        
        <div className="relative w-full max-w-xl">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-purple-500/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-xl"></div>
          
          <div className="text-center bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-[0_10px_50px_rgba(0,0,0,0.5)] pointer-events-auto overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 opacity-50"></div>
            
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-2">
              Vite + React + Three.js
            </h1>
            
            <div className="my-8 relative">
              <button 
                onClick={() => setCount((count) => count + 1)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium
                transform transition-all duration-300 shadow-[0_5px_15px_rgba(100,108,255,0.6)]
                hover:shadow-[0_8px_25px_rgba(100,108,255,0.8)] hover:-translate-y-1 active:translate-y-0 
                active:shadow-[0_2px_10px_rgba(100,108,255,0.6)] relative overflow-hidden group"
              >
                <span className="absolute w-0 h-0 transition-all duration-300 rounded-full bg-white opacity-10
                group-hover:w-[300px] group-hover:h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></span>
                <span className="relative">count is {count}</span>
              </button>
              
              <p className="mt-6 text-white/80">
                Edit <code className="bg-white/10 p-[0.2rem_0.4rem] rounded-md text-[0.9em] font-mono">src/App.tsx</code> and save to test HMR
              </p>
            </div>
            
            <p className="text-sm text-white/60 mt-6 italic">
              Click on the Vite, React, and GitHub logos to learn more
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default App

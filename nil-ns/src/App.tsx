import { useRef, useState } from 'react'
import './App.css'
export default function App() {

  const [nilNameText, setNilNameText] = useState<string>('')
  const nilNameInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="p6 h-full w-full bg-slate-800">
      <h1 className='text-8xl text-center p-6 font-extrabold'>NIL NS</h1>
      <p className='text-center'>Nillion Name Service</p>

      <div className='bg-slate-800 h-1/2 w-full flex justify-center items-center'>
        <div className='w-4/5 h-1/6 text-center shadow-lg rounded-2xl shadow-emerald-400 flex'>
          <input className='rounded-s-xl text-2xl bg-slate-800 w-3/5 h-full text-center focus:border-emerald- focus:outline-none'
            ref={nilNameInputRef}
            value={nilNameText}
            spellCheck={false}
            onChange={(e) => setNilNameText(e.currentTarget.value)}
            onFocus={() => setNilNameText('')}
            onBlur={() => { if (!nilNameText.endsWith('.nil') && nilNameText) setNilNameText(prev => prev + '.nil') }}
            placeholder='you.nil'
          ></input>
          <button className='bg-slate-700 rounded-r-xl w-2/5 h-full text-center duration-200 ease-out hover:bg-slate-500'
          onClick={() => { 
            if (!nilNameText) {
              return 
            } else {
              console.log("Calculate & Prompt Payment here, create backend listener to await payment, then create DB entry and display user page afterwards for configuration. The celebration effect would be nice as well.")
            }
          }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Profile from './Profile.tsx'
import NameDetail from './NameDetail.tsx'
import SendPayment from './SendPayment.tsx'
import { KeplrContext } from './WalletContext.tsx'
import type { Keplr } from '@keplr-wallet/provider-extension'
import { useState } from 'react'

declare global {
  interface Window {
    keplr?: any; 
  }
}

function Root() {
  const [keplr, setKeplr] = useState<Keplr | undefined>(undefined)

  return (
    <KeplrContext.Provider value={[keplr, setKeplr]}>
      <BrowserRouter>
        <Routes>
          <Route path={'/'} Component={App}></Route>
          <Route path={'/profile'} Component={Profile}></Route>
          <Route path={'/name/:id'} Component={NameDetail}></Route>
          <Route path={'/send'} Component={SendPayment}></Route>
        </Routes>
      </BrowserRouter>
    </KeplrContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)


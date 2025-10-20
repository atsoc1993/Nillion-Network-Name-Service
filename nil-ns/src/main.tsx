import { createRoot } from 'react-dom/client'
import App from './App.tsx'


// window.onload = async () => {
//   if (!window.keplr) {
//     console.log("Keplr doesnt exist")
//     alert("Please install the Keplr extension.");
//     return;
//   } else {
//     console.log("Kepler exists")
//   }

//   const keplr = window.keplr;

//   const chainId = "cosmoshub-4";
//   await keplr.enable(chainId);
// };
createRoot(document.getElementById('root')!).render(
  <App />
)

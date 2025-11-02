import { useEffect, useRef, useState, useContext, useCallback } from 'react';
import './App.css';
import { SigningStargateClient, coins } from "@cosmjs/stargate";
import axios from 'axios';
import NavMenu from './NavMenu';
import { KeplrContext } from './WalletContext';

export default function App() {

  const [nilNameText, setNilNameText] = useState<string>('');
  const nilNameInputRef = useRef<HTMLInputElement | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [creationTxID, setCreationTxId] = useState<string>('');
  const [creationFailed, setCreationFailed] = useState<boolean>(false);

  const KeplrCtx = useContext(KeplrContext);

  const getKeplr = useCallback(async () => {
    if (!window.keplr) {
      alert("Please install the Keplr extension.");
      return;
    }
    
    const keplr = window.keplr;
    const chainId = "nillion-chain-testnet-1";
    await keplr.enable(chainId);
    if (!KeplrCtx?.[1]) return;
    KeplrCtx[1](keplr)
  }, [KeplrCtx]);

  const sendTx = useCallback(async (memo: string): Promise<string> => {
    if (!KeplrCtx?.[0]) {
      alert("Keplr not connected.");
      return '';
    }
    const keplr = KeplrCtx[0]
    try {
      const CHAIN_ID = "nillion-chain-testnet-1";
      const RPC = "https://testnet-nillion-rpc.lavenderfive.com";

      await keplr.enable(CHAIN_ID);
      const signer = keplr.getOfflineSigner!(CHAIN_ID);
      const client = await SigningStargateClient.connectWithSigner(RPC, signer);

      const from = (await signer.getAccounts())[0].address;
      const to = from
      const fee = { amount: coins(5000, "unil"), gas: "200000" };

      const result = await client.sendTokens(
        from,
        to,
        coins(2000, "unil"),
        fee,
        memo
      );

      const txId = result.transactionHash
      console.log(`Tx Confirmed, Tx ID: ${txId}`);
      const response = await axios.post('http://localhost:3000/new_name',
        {
          txId: txId
        }
      )
      console.log(response.data);
      return txId
    } catch (e) {
      console.log(e)
      return ''
    }
  }, [KeplrCtx]);

  const Create = useCallback(async () => {
    const txId = await sendTx(nilNameText)
    if (txId) {
      setCreating(false);
      setCreationTxId(txId);
    } else {
      setCreating(false);
      setCreationFailed(true);
    }
  }, [nilNameText, sendTx]);

  useEffect(() => {
    if (creating) {
      Create();
    }
  }, [creating, Create])


  function PendingCreation() {
    return (
      <div className='bg-slate-800 h-6/4 w-full flex flex-col justify-evenly items-center'>
        <h1 className='text-2xl text-center p-6 font-extrabold'>Creating your NIL Name . . .</h1>
        <div className="h-25 w-25 animate-ping rounded-full
        shadow-lg shadow-blue-400 border-2 self-center flex"/>
      </div>
    );
  }

  function CreatedSuccessfully() {
    return (
      <div className='bg-slate-800 h-6/4 w-full flex flex-col justify-evenly items-center'>
        <div className='flex flex-col'>
          <h1 className='text-2xl text-center p-2 font-extrabold'>Name Created Successfully</h1>
          <h1 className='text-sm text-center p-2 font-extrabold'>{`Tx ID: ${creationTxID}`}</h1>
        </div>
        <div className="h-30 w-30 animate-bounce rounded-full
        shadow-lg shadow-emerald-400 border-2 self-center flex"/>
      </div>
    );
  }

  function CreationFailed() {
    return (
      <div className='bg-slate-800 h-6/4 w-full flex flex-col justify-evenly items-center'>
        <div className='flex flex-col h-1/3 w-1/2'>
          <h1 className='text-2xl text-center p-2 font-extrabold'>Creation Failed</h1>
          <div className='flex flex-row h-1/2 justify-evenly items-center'>
            <button className='bg-slate-700 rounded-xl w-4/9 h-3/4 p6 text-center flex justify-self-center justify-center items-center
       duration-200 ease-out shadow-lg animate-pulse shadow-emerald-400 hover:bg-slate-500'
              onClick={async () => {
                setCreationFailed(false);
                setCreationTxId('');
                setCreating(true);
              }}
            >
              Retry
            </button>

            <button className='bg-slate-700 rounded-xl w-4/9 h-3/4 p6 text-center flex justify-self-center justify-center items-center
       duration-200 ease-out shadow-lg shadow-red-400 hover:bg-slate-500'
              onClick={async () => {
                setCreationFailed(false);
                setCreationTxId('');
                setCreating(false);
              }}
            >
              Cancel
            </button>


          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p6 h-full w-full bg-slate-800">
      <NavMenu  page='create'/>
      <h1 className='text-8xl text-center p-6 font-extrabold'>NIL NS</h1>
      <p className='text-center'>Nillion Name Service</p>
      {!KeplrCtx[0] ?
        <div className='bg-slate-800 mt-30 h-1/3 w-full flex justify-center items-center'>
          <button className='bg-slate-700 rounded-xl w-2/5 h-1/4 p6 text-center flex justify-self-center justify-center items-center
       duration-200 ease-out shadow-lg shadow-emerald-400 hover:bg-slate-500'
            onClick={async () => await getKeplr()}
          >
            Connect
          </button>

        </div>
        :
        <div className='bg-slate-800 mt-30 h-1/3 w-full flex justify-center items-center'>
          {creating ? (
            <PendingCreation />
          ) : creationTxID ? (
            <CreatedSuccessfully />
          ) : creationFailed ? (
            <CreationFailed />
          ) : (
            <div className='w-4/5 h-1/3 text-center shadow-lg rounded-2xl shadow-emerald-400 flex'>
              <input
                className='rounded-s-xl text-2xl bg-slate-800 w-3/5 h-full text-center focus:outline-none'
                ref={nilNameInputRef}
                value={nilNameText}
                spellCheck={false}
                onChange={(e) => setNilNameText(e.currentTarget.value)}
                onFocus={() => setNilNameText('')}
                onBlur={() => { if (!nilNameText.endsWith('.nil') && nilNameText) setNilNameText(prev => prev + '.nil') }}
                placeholder='you.nil'
              />
              <button
                className='bg-slate-700 rounded-r-xl w-2/5 h-full text-center duration-200 ease-out hover:bg-slate-500'
                onClick={async () => {
                  if (!nilNameText) return;
                  setCreationFailed(false);
                  setCreationTxId('');
                  setCreating(true);
                }}
              >
                Create
              </button>
            </div>
          )}
        </div>

      }
    </div>
  )
}
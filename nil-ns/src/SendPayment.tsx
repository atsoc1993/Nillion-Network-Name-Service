import { useContext, useState, useRef, useCallback } from 'react';
import './App.css';
import { SigningStargateClient, coins } from "@cosmjs/stargate";
import axios from 'axios';
import NavMenu from './NavMenu';
import { KeplrContext } from './WalletContext';

export default function SendPayment() {
  const [nilName, setNilName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const nilNameInputRef = useRef<HTMLInputElement | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

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

  const resolveName = useCallback(async (name: string): Promise<string | null> => {
    try {
      const response = await axios.post('http://localhost:3000/resolve_name', {
        name: name
      });
      
      if (response.data.message === 'Success' && response.data.address) {
        setResolvedAddress(response.data.address);
        return response.data.address;
      }
      return null;
    } catch (error: any) {
      console.error('Error resolving name:', error);
      setError(error.response?.data?.error || 'Failed to resolve name');
      return null;
    }
  }, []);

  const sendPayment = useCallback(async (toAddress: string, amountToSend: string) => {
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
      
      const amountValue = parseFloat(amountToSend);
      if (isNaN(amountValue) || amountValue <= 0) {
        setError('Invalid amount');
        return '';
      }

      const amountInUnil = Math.floor(amountValue * 1000000);
      if (amountInUnil === 0) {
        setError('Amount too small. Minimum is 0.000001 NIL');
        return '';
      }
      const fee = { amount: coins(5000, "unil"), gas: "200000" };

      const result = await client.sendTokens(
        from,
        toAddress,
        coins(amountInUnil, "unil"),
        fee,
        `Payment to ${nilName}`
      );

      const txId = result.transactionHash
      console.log(`Payment sent, Tx ID: ${txId}`);
      return txId
    } catch (e: any) {
      console.log(e)
      setError(e.message || 'Transaction failed');
      return ''
    }
  }, [KeplrCtx, nilName]);

  const handleSendPayment = async () => {
    if (!nilName || !amount) {
      setError('Please enter both name and amount');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');
    setResolvedAddress('');
    setTxHash('');

    try {
      const normalizedName = nilName.endsWith('.nil') ? nilName : nilName + '.nil';
      const address = await resolveName(normalizedName);
      
      if (!address) {
        setSending(false);
        return;
      }

      const txId = await sendPayment(address, amount);
      
      if (txId) {
        setTxHash(txId);
        setSuccess(`Payment sent successfully to ${normalizedName}!`);
        setNilName('');
        setAmount('');
        setResolvedAddress('');
      } else {
        setSending(false);
      }
    } catch (error: any) {
      console.error('Error sending payment:', error);
      setError(error.message || 'Failed to send payment');
      setSending(false);
    }
  };

  return (
    <div className="p6 h-full w-full bg-slate-800 min-h-screen">
      <NavMenu page='send' />

      <h1 className='text-8xl text-center p-6 font-extrabold'>Send Payment</h1>
      <p className='text-center mb-8'>Send payment to a .nil domain</p>

      {!KeplrCtx?.[0] ? (
        <div className='bg-slate-800 mt-30 h-1/3 w-full flex justify-center items-center'>
          <button 
            className='bg-slate-700 rounded-xl w-2/5 h-1/4 p-6 text-center flex justify-center items-center
                duration-200 ease-out shadow-lg shadow-emerald-400 hover:bg-slate-500'
            onClick={getKeplr}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className='bg-slate-800 mt-30 w-full flex justify-center items-center'>
          <div className='w-full max-w-2xl px-6'>
            {sending && !txHash ? (
              <div className='bg-slate-800 h-full w-full flex flex-col justify-evenly items-center'>
                <h1 className='text-2xl text-center p-6 font-extrabold mb-20'>Sending Payment...</h1>
                <div className="h-25 w-25 animate-ping rounded-full
                    shadow-lg shadow-blue-400 border-2 self-center flex"/>
              </div>
            ) : txHash ? (
              <div className='bg-slate-800 h-full w-full flex flex-col justify-between'>
                <div className='flex flex-col items-center'>
                  <h1 className='text-2xl text-center p-2 font-extrabold text-emerald-400'>Payment Sent Successfully!</h1>
                  <p className='text-sm text-center p-2 text-slate-400'>{`Tx Hash: ${txHash}`}</p>
                  <button 
                    className='mt-4 bg-slate-700 rounded-xl px-6 py-3 mb-15 text-center
                        duration-200 ease-out shadow-lg shadow-emerald-400 hover:bg-slate-500'
                    onClick={() => {
                      setTxHash('');
                      setSuccess('');
                      setSending(false);
                    }}
                  >
                    Send Another Payment
                  </button>
                </div>
                <div className="h-30 w-30 animate-bounce rounded-full
                    shadow-lg shadow-emerald-400 border-2 self-center flex"/>
              </div>
            ) : (
              <div className='space-y-6'>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-300">
                    .nil Domain Name
                  </label>
                  <input
                    className='rounded-xl text-2xl bg-slate-700 w-full h-16 p-4 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400'
                    ref={nilNameInputRef}
                    value={nilName}
                    spellCheck={false}
                    onChange={(e) => {
                      setNilName(e.currentTarget.value);
                      setResolvedAddress('');
                      setError('');
                    }}
                    onFocus={() => setNilName('')}
                    onBlur={async () => {
                      if (!nilName.endsWith('.nil') && nilName) {
                        const normalized = nilName + '.nil';
                        setNilName(normalized);
                        await resolveName(normalized);
                      } else if (nilName.endsWith('.nil')) {
                        await resolveName(nilName);
                      }
                    }}
                    placeholder='recipient.nil'
                  />
                </div>

                {resolvedAddress && (
                  <div className='bg-emerald-500/20 border border-emerald-500 rounded-xl p-4'>
                    <p className='text-sm text-emerald-400'>
                      Resolved to: <span className='font-mono'>{resolvedAddress}</span>
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-300">
                    Amount (NIL)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    className='rounded-xl text-2xl bg-slate-700 w-full h-16 p-4 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400'
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder='0.0'
                  />
                  <p className='text-xs text-slate-400 mt-2 text-center'>
                    Enter amount in NIL (minimum: 0.000001)
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-emerald-500/20 border border-emerald-500 rounded-xl p-4">
                    <p className="text-emerald-400">{success}</p>
                  </div>
                )}

                <button
                  className='w-full bg-slate-700 rounded-xl h-16 text-center duration-200 ease-out 
                      shadow-lg shadow-emerald-400 hover:bg-slate-500 text-xl font-semibold'
                  onClick={handleSendPayment}
                  disabled={sending || !nilName || !amount}
                >
                  {sending ? 'Processing...' : 'Send Payment'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


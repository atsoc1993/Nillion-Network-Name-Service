import { useContext, useEffect, useState, useCallback } from 'react';
import './App.css';
import axios from 'axios';
import NavMenu from './NavMenu';
import { KeplrContext } from './WalletContext';
import { useNavigate } from 'react-router-dom';

type nilName = {
    _id?: string,
    metaId?: string,
    address: string,
    name: string,
    twitter_link?: string | null,
    twitter_verified?: boolean,
    gmail?: string | null
}

export default function Profile() {
    const KeplrCtx = useContext(KeplrContext);
    const navigate = useNavigate();
    const [userAddress, setUserAddress] = useState<string>('')
    const CHAIN_ID = "nillion-chain-testnet-1";
    const [names, setNames] = useState<nilName[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    const getKeplr = useCallback(async () => {
        if (!window.keplr) {
            alert("Please install the Keplr extension.");
            return;
        }
        let keplr;
        if (!KeplrCtx?.[0]) {
            keplr = window.keplr;
            const chainId = "nillion-chain-testnet-1";
            await keplr.enable(chainId);
            if (!KeplrCtx?.[1]) return;
            KeplrCtx[1](keplr)
        } else {
            keplr = KeplrCtx[0]
        }

        const signer = keplr.getOfflineSigner!(CHAIN_ID);
        const from = (await signer.getAccounts())[0].address;
        setUserAddress(from)
    }, [KeplrCtx, CHAIN_ID]);

    useEffect(() => {
        getKeplr();
    }, [getKeplr])

    const getUserNames = useCallback(async () => {
        if (!userAddress) return;
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:3000/get_names', {
                address: userAddress
            })
            const userNames = response.data.message || []
            const normalizedNames = userNames.map((name: nilName) => ({
                ...name,
                metaId: name.metaId || name._id || '',
                _id: name._id || name.metaId || ''
            }))
            setNames(normalizedNames)
        } catch (error) {
            console.error('Error fetching names:', error)
            setNames([])
        } finally {
            setLoading(false);
        }
    }, [userAddress])

    useEffect(() => {
        getUserNames();
    }, [getUserNames])

    const handleNameClick = (name: nilName) => {
        const id = name.metaId || name._id || '';
        if (id) {
            navigate(`/name/${id}`);
        }
    }

    return (
        <div className="h-full w-full bg-slate-800 min-h-screen">
            <NavMenu page='profile' />

            <div className="px-6 py-8">
                <h1 className='text-6xl md:text-8xl text-center p-6 font-extrabold'>Your Profile</h1>
                <p className='text-center text-sm text-slate-400 mb-8'>{KeplrCtx?.[0] ? userAddress : ''}</p>
                
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
                    <div className='w-full max-w-6xl mx-auto'>
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-emerald-400"></div>
                            </div>
                        ) : names.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-xl text-slate-400">No names yet. Create your first NIL name!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {names.map((name) => {
                                    const id = name.metaId || name._id || name.name;
                                    return (
                                        <div
                                            key={id}
                                            onClick={() => handleNameClick(name)}
                                            className="bg-slate-700 rounded-xl p-6 cursor-pointer transition-all duration-200 
                                                hover:bg-slate-600 hover:scale-105 hover:shadow-lg hover:shadow-emerald-400/50
                                                border border-slate-600"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-2xl font-bold text-emerald-400">{name.name}</h2>
                                                {name.twitter_verified && (
                                                    <span className="text-xs bg-blue-500 px-2 py-1 rounded">✓ Verified</span>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2 text-sm">
                                                {name.twitter_link && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400">Twitter:</span>
                                                        <a 
                                                            href={name.twitter_link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-blue-400 hover:text-blue-300 truncate"
                                                        >
                                                            {name.twitter_link}
                                                        </a>
                                                    </div>
                                                )}
                                                {name.gmail && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400">Email:</span>
                                                        <span className="text-slate-300 truncate">{name.gmail}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="mt-4 pt-4 border-t border-slate-600">
                                                <p className="text-xs text-slate-400">Click to edit</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
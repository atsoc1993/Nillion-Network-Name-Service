import { useContext, useEffect, useState, useCallback } from 'react';
import './App.css';
import axios from 'axios';
import NavMenu from './NavMenu';
import { KeplrContext } from './WalletContext';
import { useNavigate, useParams } from 'react-router-dom';

type nilName = {
    _id?: string,
    metaId?: string,
    address: string,
    name: string,
    twitter_link?: string | null,
    twitter_verified?: boolean,
    gmail?: string | null
}

export default function NameDetail() {
    const KeplrCtx = useContext(KeplrContext);
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [userAddress, setUserAddress] = useState<string>('')
    const CHAIN_ID = "nillion-chain-testnet-1";
    const [nameData, setNameData] = useState<nilName | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [saving, setSaving] = useState<boolean>(false)
    const [error, setError] = useState<string>('')
    const [success, setSuccess] = useState<string>('')

    const [twitterLink, setTwitterLink] = useState<string>('')
    const [gmail, setGmail] = useState<string>('')

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

    const fetchNameData = useCallback(async () => {
        if (!userAddress || !id) return;
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('http://localhost:3000/get_names', {
                address: userAddress
            })
            const userNames = response.data.message || []
            const foundName = userNames.find((n: nilName) => 
                (n._id === id || n.metaId === id)
            )
            
            if (foundName) {
                const normalized = {
                    ...foundName,
                    metaId: foundName.metaId || foundName._id || '',
                    _id: foundName._id || foundName.metaId || ''
                }
                setNameData(normalized)
                setTwitterLink(normalized.twitter_link || '')
                setGmail(normalized.gmail || '')
            } else {
                setError('Name not found')
            }
        } catch (error) {
            console.error('Error fetching name:', error)
            setError('Failed to load name data')
        } finally {
            setLoading(false);
        }
    }, [userAddress, id])

    useEffect(() => {
        if (userAddress && id) {
            fetchNameData();
        }
    }, [userAddress, id, fetchNameData])

    const handleSave = async () => {
        if (!nameData || !userAddress || !id) return;
        
        setSaving(true);
        setError('');
        setSuccess('');
        
        try {
            const updateData: any = {
                metaId: id,
                address: userAddress
            }
            
            if (twitterLink.trim()) {
                updateData.twitter_link = twitterLink.trim()
            } else {
                updateData.twitter_link = null
            }
            
            if (gmail.trim()) {
                updateData.gmail = gmail.trim()
            } else {
                updateData.gmail = null
            }

            const response = await axios.post('http://localhost:3000/update_name', updateData)
            
            if (response.data.message === 'Success!') {
                setSuccess('Name updated successfully!')
                fetchNameData(); // Refresh data
                setTimeout(() => {
                    navigate('/profile')
                }, 1500)
            }
        } catch (error: any) {
            console.error('Error updating name:', error)
            setError(error.response?.data?.error || 'Failed to update name')
        } finally {
            setSaving(false);
        }
    }

    if (!KeplrCtx?.[0]) {
        return (
            <div className="h-full w-full bg-slate-800 min-h-screen">
                <NavMenu page='profile' />
                <div className='bg-slate-800 mt-30 h-1/3 w-full flex justify-center items-center'>
                    <button 
                        className='bg-slate-700 rounded-xl w-2/5 h-1/4 p-6 text-center flex justify-center items-center
                            duration-200 ease-out shadow-lg shadow-emerald-400 hover:bg-slate-500'
                        onClick={getKeplr}
                    >
                        Connect Wallet
                    </button>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="h-full w-full bg-slate-800 min-h-screen">
                <NavMenu page='profile' />
                <div className="flex justify-center items-center py-20">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-emerald-400"></div>
                </div>
            </div>
        )
    }

    if (error && !nameData) {
        return (
            <div className="h-full w-full bg-slate-800 min-h-screen">
                <NavMenu page='profile' />
                <div className="text-center py-20">
                    <p className="text-xl text-red-400">{error}</p>
                    <button 
                        onClick={() => navigate('/profile')}
                        className="mt-4 bg-slate-700 rounded-xl px-6 py-3 hover:bg-slate-600"
                    >
                        Back to Profile
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full w-full bg-slate-800 min-h-screen">
            <NavMenu page='profile' />

            <div className="px-6 py-8 max-w-4xl mx-auto">
                <div className="mb-8">
                    <button 
                        onClick={() => navigate('/profile')}
                        className="text-emerald-400 hover:text-emerald-300 mb-4 flex items-center gap-2"
                    >
                        ← Back to Profile
                    </button>
                    <h1 className='text-4xl md:text-6xl font-extrabold mb-2'>{nameData?.name || 'Edit Name'}</h1>
                    <p className='text-slate-400 text-sm'>{userAddress}</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-500/20 border border-emerald-500 rounded-xl p-4 mb-6">
                        <p className="text-emerald-400">{success}</p>
                    </div>
                )}

                <div className="bg-slate-700 rounded-xl p-8 border border-slate-600 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-slate-300">
                            Twitter/X Link
                        </label>
                        <input
                            type="text"
                            value={twitterLink}
                            onChange={(e) => setTwitterLink(e.target.value)}
                            placeholder="https://twitter.com/username or https://x.com/username"
                            className="w-full bg-slate-800 rounded-xl p-4 text-white border border-slate-600 
                                focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50
                                placeholder:text-slate-500"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            Enter your Twitter/X profile URL.
                        </p>
                        {nameData?.twitter_verified && nameData.twitter_link && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs bg-blue-500 px-2 py-1 rounded">✓ Verified</span>
                                <a 
                                    href={nameData.twitter_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-xs"
                                >
                                    View Profile
                                </a>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-slate-300">
                            Gmail Address
                        </label>
                        <input
                            type="email"
                            value={gmail}
                            onChange={(e) => setGmail(e.target.value)}
                            placeholder="your.email@gmail.com"
                            className="w-full bg-slate-800 rounded-xl p-4 text-white border border-slate-600 
                                focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50
                                placeholder:text-slate-500"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            Enter your Gmail address (must be a @gmail.com address).
                        </p>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 
                                disabled:cursor-not-allowed rounded-xl p-4 font-semibold
                                transition-all duration-200 shadow-lg shadow-emerald-400"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-6 bg-slate-600 hover:bg-slate-500 rounded-xl p-4 font-semibold
                                transition-all duration-200"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}


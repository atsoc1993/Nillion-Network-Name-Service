import { useNavigate } from 'react-router-dom';

export default function NavMenu({ page }: { page: string }) {
    const navigate = useNavigate();

    const menuItems = [
        { path: '/', label: 'Create a Name' },
        { path: '/profile', label: 'View Profile' },
        { path: '/send', label: 'Send Payment' }
    ];

    return (
        <div className='h-1/5 flex w-full justify-center items-center gap-4 p-4'>
            {menuItems.map((item) => {
                const isActive = (
                    (page === 'create' && item.path === '/') ||
                    (page === 'profile' && item.path === '/profile') ||
                    (page === 'send' && item.path === '/send')
                );
                
                return (
                    <button 
                        key={item.path}
                        className={`rounded-xl px-6 py-3 text-center flex justify-center items-center
                            duration-200 ease-out shadow-lg shadow-emerald-400 ${
                                isActive 
                                    ? 'bg-emerald-600 hover:bg-emerald-500' 
                                    : 'bg-slate-700 hover:bg-slate-500'
                            }`}
                        onClick={() => navigate(item.path)}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};
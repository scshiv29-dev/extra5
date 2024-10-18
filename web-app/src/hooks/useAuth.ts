import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export const useAuth = () => {
    const router = useRouter();

    useEffect(() => {
        const checkAuth = () => {
            const token = Cookies.get('access_token');
            if (!token) {
                router.push('/login');
            }
        };

        checkAuth();
    }, [router]);

    const logout = () => {
        Cookies.remove('access_token');
        router.push('/login');
    };

    return { logout };
};
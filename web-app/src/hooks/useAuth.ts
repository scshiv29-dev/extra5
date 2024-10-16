import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

export const useAuth = () => {
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const response = await fetch(`${API_URL}/users/me`, {
                method: 'GET',
                credentials: 'include', // Include cookies in the request
            });

            if (!response.ok) {
                router.push('/login'); // Redirect to login if not authenticated
            }
        };

        checkAuth();
    }, [router]);
};

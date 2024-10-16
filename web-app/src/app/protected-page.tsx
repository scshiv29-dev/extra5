import { useAuth } from '@/hooks/useAuth';

export default function ProtectedPage() {
    useAuth(); // This will redirect if not authenticated

    return <div>Protected Content</div>;
}

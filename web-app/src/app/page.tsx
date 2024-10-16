'use client'
import Dashboard from '@/components/dashboard'
import { useAuth } from '@/hooks/useAuth';
export default function Home() {
  useAuth();
  return <Dashboard />
}
import { ReactNode } from 'react';
import { Shell } from '../../components/layout/Shell';

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}

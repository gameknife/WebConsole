// App root: wires React Query, the router and the route table.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { GamepadProvider } from '@/input/GamepadProvider';
import { AppRoutes } from '@/routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GamepadProvider>
          <AppRoutes />
        </GamepadProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

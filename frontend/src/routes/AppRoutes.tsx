// Route table. Launcher views share the TopBar layout; the player runs
// fullscreen on its own.

import { Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/Layout';
import { GameDetailPage } from '@/features/detail/GameDetailPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { PlayerPage } from '@/features/player/PlayerPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/game/:id" element={<GameDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/play/:id" element={<PlayerPage />} />
    </Routes>
  );
}

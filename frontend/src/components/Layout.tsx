// Shell layout for the launcher views: a fixed TopBar above a scrollable
// content region. The fullscreen player route renders outside this shell.

import { AnimatedOutlet } from './AnimatedOutlet';
import { QuickAccessMenu } from './QuickAccessMenu';
import { TopBar } from './TopBar';

export function Layout() {
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      {/* relative so the absolutely-positioned, transitioning pages fill it */}
      <main className="relative min-h-0 flex-1">
        <AnimatedOutlet />
      </main>
      <QuickAccessMenu />
    </div>
  );
}

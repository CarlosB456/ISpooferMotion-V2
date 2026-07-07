import type React from 'react';
import { createContext, useContext } from 'react';

import { type ScanStatus, useStudioConnection } from '../hooks/useStudioConnection';

type StudioConnectionContextValue = {
  studioConnected: boolean;
  scanStatus: ScanStatus | null;
  studioPlaceId: string;
};

const StudioConnectionContext = createContext<StudioConnectionContextValue | undefined>(undefined);

// Provides a global view of whether we are successfully talking to the Roblox Studio plugin
export const StudioConnectionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const connection = useStudioConnection();

  return (
    <StudioConnectionContext.Provider value={connection}>
      {children}
    </StudioConnectionContext.Provider>
  );
};

export const useStudioConnectionState = () => {
  const context = useContext(StudioConnectionContext);
  if (context === undefined) {
    throw new Error('useStudioConnectionState must be used within a StudioConnectionProvider');
  }
  return context;
};

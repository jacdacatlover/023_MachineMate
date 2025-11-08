import React, { createContext, useContext, ReactNode } from 'react';

import { MachineDefinition } from 'src/types/machine';

type MachinesProviderProps = {
  machines: MachineDefinition[];
  children: ReactNode;
};

const MachinesContext = createContext<MachineDefinition[] | null>(null);

export function MachinesProvider({ machines, children }: MachinesProviderProps) {
  return <MachinesContext.Provider value={machines}>{children}</MachinesContext.Provider>;
}

/**
 * Hook to access the machines catalog
 * @throws Error if used outside of MachinesProvider
 */
export function useMachines(): MachineDefinition[] {
  const machines = useContext(MachinesContext);
  if (machines === null) {
    throw new Error(
      'useMachines must be used within MachinesProvider. ' +
      'Did you forget to wrap your app with <MachinesProvider>?'
    );
  }
  return machines;
}

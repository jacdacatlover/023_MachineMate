import React, { createContext, useContext, ReactNode } from 'react';
import { MachineDefinition } from '../../types/machine';

type MachinesProviderProps = {
  machines: MachineDefinition[];
  children: ReactNode;
};

const MachinesContext = createContext<MachineDefinition[]>([]);

export function MachinesProvider({ machines, children }: MachinesProviderProps) {
  return <MachinesContext.Provider value={machines}>{children}</MachinesContext.Provider>;
}

export function useMachines(): MachineDefinition[] {
  return useContext(MachinesContext);
}

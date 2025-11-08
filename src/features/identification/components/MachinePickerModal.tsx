import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Modal, Portal, Searchbar, List, Divider, Text } from 'react-native-paper';

import PrimaryButton from '@shared/components/PrimaryButton';

import { MachineDefinition } from '@typings/machine';

import { styles } from './MachinePickerModal.styles';

interface MachinePickerModalProps {
  visible: boolean;
  machines: MachineDefinition[];
  selectedMachineId: string | null;
  onSelect: (machineId: string) => void;
  onDismiss: () => void;
}

export default function MachinePickerModal({
  visible,
  machines,
  selectedMachineId,
  onSelect,
  onDismiss,
}: MachinePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMachines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return machines;
    }

    return machines.filter(machine => {
      const nameMatch = machine.name.toLowerCase().includes(query);
      const primaryMuscleMatch = machine.primaryMuscles.some(muscle =>
        muscle.toLowerCase().includes(query)
      );
      const categoryMatch = machine.category.toLowerCase().includes(query);
      return nameMatch || primaryMuscleMatch || categoryMatch;
    });
  }, [machines, searchQuery]);

  const handleSelect = (machineId: string) => {
    onSelect(machineId);
    onDismiss();
    setSearchQuery('');
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>
          Choose a Machine
        </Text>
        <Searchbar
          placeholder="Search by name, muscle, or category"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
        <FlatList
          data={filteredMachines}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={Divider}
          style={styles.list}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={`${item.category} • ${item.primaryMuscles.join(', ')}`}
              onPress={() => handleSelect(item.id)}
              right={props => (
                <List.Icon
                  {...props}
                  icon={item.id === selectedMachineId ? 'radiobox-marked' : 'radiobox-blank'}
                />
              )}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyMedium">No machines found.</Text>
            </View>
          }
        />
        <PrimaryButton
          label="Cancel"
          mode="outlined"
          onPress={() => {
            onDismiss();
            setSearchQuery('');
          }}
        />
      </Modal>
    </Portal>
  );
}

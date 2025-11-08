import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchbar: {
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});

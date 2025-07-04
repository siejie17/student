import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../core/theme';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';

const PREDEFINED_HOBBIES = [
  'Reading',
  'Traveling',
  'Cooking',
  'Badminton',
  'Football',
  'Music',
  'Gaming',
  'Drawing',
  'Photography',
  'Dancing',
  'Writing',
  'Gardening',
  'Hiking',
  'Movies',
  'Yoga',
  'Coding',
];

const MAX_SELECTION = 5;

const HobbySelectionScreen = ({ studentID, onComplete }) => {
  const [selectedHobbies, setSelectedHobbies] = useState([]);
  const [customHobby, setCustomHobby] = useState('');
  const [inputError, setInputError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleHobby = (hobby) => {
    if (selectedHobbies.includes(hobby)) {
      setSelectedHobbies(selectedHobbies.filter((h) => h !== hobby));
    } else if (selectedHobbies.length < MAX_SELECTION) {
      setSelectedHobbies([...selectedHobbies, hobby]);
    }
  };

  const addCustomHobby = () => {
    const trimmed = customHobby.trim();
    if (!trimmed) return;
    if (selectedHobbies.includes(trimmed) || PREDEFINED_HOBBIES.includes(trimmed)) {
      setInputError('Hobby already selected');
      return;
    }
    if (selectedHobbies.length >= MAX_SELECTION) {
      setInputError(`You can select up to ${MAX_SELECTION} hobbies.`);
      return;
    }
    setSelectedHobbies([...selectedHobbies, trimmed]);
    setCustomHobby('');
    setInputError('');
  };

  const renderHobby = ({ item }) => {
    const selected = selectedHobbies.includes(item);
    return (
      <TouchableOpacity
        style={[styles.hobbyChip, selected && styles.hobbyChipSelected]}
        onPress={() => toggleHobby(item)}
        disabled={!selected && selectedHobbies.length >= MAX_SELECTION}
      >
        <Text style={[styles.hobbyText, selected && styles.hobbyTextSelected]}>{item}</Text>
      </TouchableOpacity>
    );
  };

  const handleStartAdventure = async () => {
    if (selectedHobbies.length === 0 || saving) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'user', studentID);
      // Merge hobbies with existing user data
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await setDoc(userRef, { hobbies: selectedHobbies }, { merge: true });
      }
      if (onComplete) onComplete();
    } catch (err) {
      setInputError('Failed to save hobbies. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Choose up to 5 hobbies</Text>
      <FlatList
        data={PREDEFINED_HOBBIES}
        renderItem={renderHobby}
        keyExtractor={(item) => item}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      <Text style={styles.sectionHeading}>Or add your own hobby</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a hobby you love..."
          value={customHobby}
          onChangeText={(text) => {
            setCustomHobby(text);
            setInputError('');
          }}
          onSubmitEditing={addCustomHobby}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={addCustomHobby}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
      <View style={styles.selectedContainer}>
        {selectedHobbies.map((hobby) => (
          <View key={hobby} style={styles.selectedChip}>
            <Text style={styles.selectedChipText}>{hobby}</Text>
            <TouchableOpacity onPress={() => toggleHobby(hobby)}>
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.startButton, (selectedHobbies.length === 0 || saving) && styles.startButtonDisabled]}
        disabled={selectedHobbies.length === 0 || saving}
        onPress={handleStartAdventure}
      >
        <Text style={styles.startButtonText}>{saving ? 'Saving...' : 'Start Adventure'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: 'black',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 8,
  },
  hobbyChip: {
    flex: 1,
    margin: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'black',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  hobbyChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  hobbyText: {
    color: 'black',
    fontSize: 16,
  },
  hobbyTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  addButton: {
    marginLeft: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.error,
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },
  selectedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    marginBottom: 24,
    justifyContent: 'center',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  selectedChipText: {
    color: '#fff',
    fontSize: 15,
    marginRight: 6,
  },
  removeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 'auto',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 18,
    marginBottom: 6,
    textAlign: 'center',
  },
});

export default HobbySelectionScreen;

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchBar = ({ onSearch, placeholder = 'Search...', style, onFocus }) => {
  const [searchQuery, setSearchQuery] = useState('');
    
    const handleChange = (text) => {
        setSearchQuery(text);
        onSearch(text);
    };
    
    const handleClear = () => {
        setSearchQuery('');
        onSearch('');
    };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchContainer}>
        <Ionicons 
          name="search" 
          size={20} 
          color="#666"
          style={styles.searchIcon}
        />
        
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={handleChange}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor="#999"
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {Platform.OS === 'android' && searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={handleClear}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: Platform.OS === 'ios' ? 8 : 0,
    paddingRight: Platform.OS === 'ios' ? 30 : 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  loader: {
    marginLeft: 8,
    marginRight: Platform.OS === 'ios' ? 8 : 0,
  },
});

export default SearchBar;
import { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchBar = ({
  onSearch,
  placeholder = 'Search...',
  style,
  onPress,
  shouldFocus = false,
  accentColor = '#4A80F0' // Default accent color - modern blue
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Animation when focusing/blurring the search bar
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [shouldFocus]);

  const handleChange = (text) => {
    setSearchQuery(text);
    onSearch(text);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
    inputRef.current.focus(); // Keep focus after clearing
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Interpolate animation values for dynamic styling
  const containerScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02]
  });

  const shadowOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.2]
  });

  return (
    <View style={[styles.outerContainer, style]}>
      <View
        style={[
          styles.container,
        ]}
      >
        <TouchableOpacity
          style={styles.searchIconContainer}
          onPress={() => inputRef.current.focus()}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={isFocused || searchQuery.length > 0 ? accentColor : '#999'}
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={searchQuery}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPress={onPress}
          placeholder={placeholder}
          placeholderTextColor="#999"
          returnKeyType="search"
          clearButtonMode="never" // We'll handle clearing ourselves
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={accentColor}
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                styles.clearButtonInner,
                { backgroundColor: isFocused ? accentColor : '#DDD' }
              ]}
            >
              <Ionicons name="close" size={16} color="#FFF" />
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchIconContainer: {
    padding: 6,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 8,
    fontWeight: '400',
  },
  clearButton: {
    padding: 6,
    marginLeft: 4,
  },
  clearButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchBar;
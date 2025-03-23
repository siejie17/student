import React from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'

const LoadingIndicator = () => {
  return (
    <View style={styles.container}>
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1000,
  },
  loadingBox: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
})

export default LoadingIndicator;
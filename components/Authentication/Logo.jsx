import { memo } from 'react';
import { Image, StyleSheet } from 'react-native';

const Logo = () => (
  <Image source={require('../../assets/logo.png')} style={styles.image} />
);

const styles = StyleSheet.create({
  image: {
    width: 192,
    height: 192,
    marginBottom: 12,
  },
});

export default memo(Logo);
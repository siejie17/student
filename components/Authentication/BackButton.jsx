import { memo } from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';

const BackButton = ({ goBack }) => (
    <TouchableOpacity onPress={goBack} style={styles.container}>
        <Image style={styles.image} source={require('../../assets/auth/arrow_back.png')} />
    </TouchableOpacity>
)

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0 + getStatusBarHeight(),
        left: 20,
    },
    image: {
        width: 24,
        height: 24,
    },
});

export default memo(BackButton);
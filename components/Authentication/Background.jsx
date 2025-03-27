import React, { memo } from 'react';
import { ImageBackground, StyleSheet, KeyboardAvoidingView } from 'react-native';

const Background = ({ children }) => (
    <ImageBackground
        source={require('../../assets/auth/sword.png')}
        style={styles.background}
        imageStyle={styles.backgroundImage}
    >
        <KeyboardAvoidingView style={styles.container} behavior="padding">
            {children}
        </KeyboardAvoidingView>
    </ImageBackground>
);

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        backgroundColor: 'white',
    },
    backgroundImage: {
        opacity: 0.15,
        resizeMode: 'repeat',
    },
    container: {
        flex: 1,
        padding: 20,
        width: '100%',
        maxWidth: 340,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default memo(Background);
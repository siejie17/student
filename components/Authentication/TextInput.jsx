import { View, StyleSheet, Text } from 'react-native';
import { TextInput as Input } from 'react-native-paper';
import React, { memo } from 'react';
import { theme } from '../../core/theme';

const TextInput = ({ errorText, description, ...props }) => (
    <View style={styles.container}>
        <Input
            style={styles.input}
            selectionColor={theme.colors.primary}
            underlineColor='transparent'
            mode='outlined'
            {...props}
        />
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
);

export default memo(TextInput);

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 4,
    },
    input: {
        backgroundColor: theme.colors.surface,
    },
    description: {
        fontSize: 12,
        color: theme.colors.placeholder || '#999',
        paddingHorizontal: 8,
        paddingTop: 4,
    },
    error: {
        fontSize: 14,
        color: theme.colors.error,
        paddingHorizontal: 8,
        paddingTop: 4,
    },
});
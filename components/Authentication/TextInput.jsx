import { View, StyleSheet, Text } from 'react-native';
import { TextInput as Input } from 'react-native-paper';
import { memo } from 'react';

import { theme } from '../../core/theme';

const TextInput = ({ errorText, description, ...props }) => (
    <View style={styles.container}>
        <Input
            style={styles.input}
            selectionColor={theme.colors.primary}
            underlineColor="transparent"
            mode="outlined"
            theme={{
                roundness: 12,
                colors: {
                    primary: theme.colors.primary,
                    background: styles.input.backgroundColor,
                },
            }}
            outlineStyle={styles.outline}
            contentStyle={styles.contentStyle}
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
        marginVertical: 8,
    },
    input: {
        backgroundColor: '#fafafa',
        elevation: 0,
    },
    outline: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    contentStyle: {
        paddingHorizontal: 16,
        paddingVertical: 2,
    },
    description: {
        fontSize: 12,
        color: theme.colors.placeholder || '#999',
        paddingHorizontal: 12,
        paddingTop: 6,
        opacity: 0.8,
    },
    error: {
        fontSize: 14,
        color: theme.colors.error,
        paddingHorizontal: 12,
        paddingTop: 6,
    },
});
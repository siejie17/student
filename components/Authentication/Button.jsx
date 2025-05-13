import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { theme } from '../../core/theme';
import { memo } from 'react';

const Button = ({ mode, style, children, ...props }) => (
    <PaperButton
        style={[
            styles.button,
            mode === 'outlined' && { backgroundColor: theme.colors.surface },
            style,
        ]}
        labelStyle={styles.text}
        mode={mode}
        buttonColor={theme.colors.primary}
        {...props}
    >
        {children}
    </PaperButton>
);

export default memo(Button);

const styles = StyleSheet.create({
    button: {
        width: '100%',
        marginVertical: 10,
        borderRadius: 10,
        paddingVertical: 5
    },
    text: {
        color: 'white',
        fontSize: 16,
        lineHeight: 26,
    },
})
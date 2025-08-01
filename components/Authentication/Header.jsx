import { StyleSheet, Text } from 'react-native';
import { memo } from 'react';

import { theme } from '../../core/theme';

const Header = ({ children }) => (
    <Text style={styles.header}>{children}</Text>
);

const styles = StyleSheet.create({
    header: {
        fontSize: 26,
        color: theme.colors.secondary,
        fontWeight: 'bold',
        paddingVertical: 14,
    },
});

export default memo(Header);
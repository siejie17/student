import { View, StyleSheet, Text } from 'react-native'
import React, { useState, memo } from 'react'
import { Dropdown } from 'react-native-element-dropdown';
import { theme } from '../../core/theme';

const DropdownList = ({
    label,
    data,
    value,
    onChange,
    disabled = false,
    errorText,
    placeholder,
    ...props
}) => {
    const [isFocus, setIsFocus] = useState(false);

    return (
        <View style={styles.container}>
            <Dropdown
                style={[
                    styles.dropdown,
                    isFocus && { borderColor: theme.colors.primary, borderWidth: 2 },
                    disabled && styles.disabled
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                data={data || []}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={placeholder || 'Select item'}
                searchPlaceholder="Search..."
                value={value}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={(item) => {
                    onChange(item);
                    setIsFocus(false);
                }}
                disable={disabled}
                renderItem={(item) => (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={{ padding: 10 }}>
                      {item.label}
                    </Text>
                )}
                {...props}
            />
            {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        </View>
    );
}

export default memo(DropdownList);

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 4,
    },
    dropdown: {
        height: 56,
        borderColor: '#c4c4c4',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.surface,
    },
    disabled: {
        backgroundColor: '#f0f0f0',
        opacity: 0.7,
    },
    placeholderStyle: {
        fontSize: 16,
        color: '#757575',
    },
    selectedTextStyle: {
        fontSize: 16,
        color: '#212121',
    },
    inputSearchStyle: {
        height: 40,
        fontSize: 16,
        borderColor: '#c4c4c4',
    },
    error: {
        fontSize: 14,
        color: theme.colors.error,
        paddingHorizontal: 4,
        paddingTop: 4,
    },
});
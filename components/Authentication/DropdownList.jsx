import { View, StyleSheet, Text } from 'react-native'
import { useState, memo } from 'react'
import { Dropdown } from 'react-native-element-dropdown';
import { theme } from '../../core/theme';
import { MaterialIcons } from '@expo/vector-icons';

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
            {label && <Text style={styles.label}>{label}</Text>}
            <Dropdown
                style={[
                    styles.dropdown,
                    isFocus && styles.focused,
                    disabled && styles.disabled
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
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
                renderRightIcon={() => (
                    <MaterialIcons
                        name={isFocus ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                        size={22}
                        color={isFocus ? theme.colors.primary : "#757575"}
                    />
                )}
                renderItem={(item) => (
                    <View style={styles.itemContainer}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.itemText}>
                            {item.label}
                        </Text>
                    </View>
                )}
                containerStyle={styles.dropdownContainer}
                showsVerticalScrollIndicator={false}
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
        marginVertical: 8,
    },
    label: {
        fontSize: 14,
        color: '#424242',
        marginBottom: 6,
        fontWeight: '500',
        paddingHorizontal: 4,
    },
    dropdown: {
        height: 56,
        borderColor: '#e0e0e0',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    focused: {
        borderColor: theme.colors.primary,
        borderWidth: 1.5,
        backgroundColor: '#ffffff',
    },
    disabled: {
        backgroundColor: '#f0f0f0',
        opacity: 0.7,
        borderColor: '#e0e0e0',
    },
    placeholderStyle: {
        fontSize: 16,
        color: '#9e9e9e',
    },
    selectedTextStyle: {
        fontSize: 16,
        color: '#212121',
        fontWeight: '400',
    },
    iconStyle: {
        width: 22,
        height: 22,
    },
    inputSearchStyle: {
        height: 44,
        fontSize: 16,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        backgroundColor: '#f7f7f7',
        paddingHorizontal: 12,
    },
    error: {
        fontSize: 14,
        color: theme.colors.error,
        paddingHorizontal: 12,
        paddingTop: 6,
    },
    dropdownContainer: {
        borderRadius: 12,
        marginTop: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    itemContainer: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    itemText: {
        fontSize: 16,
        color: '#424242',
    },
});
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Image,
    Animated,
    Dimensions
} from 'react-native';
import { useEffect, useRef } from 'react';

const COLORS = {
    primary: '#4789d6',
    white: '#FFFFFF',
    black: '#333',
    gray: '#666',
    success: '#4CAF50',
    error: '#ff4d4f',
};

const { width } = Dimensions.get('window');

const CancelRegistrationModal = ({
    visible,
    onCancel,
    onConfirm,
    isDeleting,
    error
}) => {
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        if (visible) {
            // Reset animations when modal becomes visible
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);

            // Start animations
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible, fadeAnim, scaleAnim]);

    // Function to handle cancel with animation
    const handleCancel = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            onCancel();
        });
    };

    // Function to handle confirm with animation
    const handleConfirm = () => {
        if (!isDeleting) {
            onConfirm();
        }
    };

    return (
        <Modal
            animationType="none" // We'll handle animations ourselves
            transparent={true}
            visible={visible}
            onRequestClose={handleCancel}
            accessibilityLabel="Cancel Registration Confirmation"
        >
            <Animated.View
                style={[
                    styles.cancelCenteredView,
                    { opacity: fadeAnim }
                ]}
            >
                <Animated.View
                    style={[
                        styles.cancelModalView,
                        {
                            transform: [{ scale: scaleAnim }],
                            opacity: fadeAnim
                        }
                    ]}
                >
                    <View style={styles.imageContainer}>
                        <Image
                            source={require('../../assets/icons/cancel_icon.png')}
                            style={styles.modalImage}
                            resizeMode="contain"
                            accessibilityLabel="Cancel registration icon"
                        />
                    </View>

                    <Text style={styles.cancelModalTitle}>
                        Confirm Registration Cancellation?
                    </Text>

                    <Text style={styles.cancelModalText}>
                        Are you sure you want to cancel this event registration?
                        This action cannot be undone.
                    </Text>

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton]}
                            onPress={handleConfirm}
                            disabled={isDeleting}
                            accessibilityLabel="Confirm Registration Cancellation"
                            activeOpacity={0.7}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                                <Text style={styles.buttonText}>Confirm</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancel}
                            disabled={isDeleting}
                            accessibilityLabel="Cancel Registration Cancellation"
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

export default CancelRegistrationModal;

const styles = StyleSheet.create({
    cancelCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker overlay for better contrast
        padding: 20,
    },
    cancelModalView: {
        backgroundColor: 'white',
        borderRadius: 16, // More rounded corners
        padding: 24,
        width: width > 500 ? 400 : '90%', // Responsive width
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    modalImage: {
        width: 72,
        height: 72,
        marginBottom: 8,
    },
    cancelModalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
        color: COLORS.black,
    },
    cancelModalText: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        color: COLORS.gray,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'column', // Stack buttons vertically
        justifyContent: 'space-between',
        marginTop: 8,
    },
    button: {
        paddingVertical: 14,
        borderRadius: 10,
        marginVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#C0C0C0',
    },
    confirmButton: {
        backgroundColor: COLORS.error,
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 16,
        color: COLORS.white,
    },
    cancelButtonText: {
        fontWeight: '600',
        fontSize: 16,
        color: COLORS.black,
    },
    errorText: {
        color: COLORS.error,
        marginBottom: 16,
        textAlign: 'center',
        fontSize: 14,
    },
});
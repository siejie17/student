import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';

const COLORS = {
    primary: '#4789d6',
    white: '#FFFFFF',
    black: '#333',
    gray: '#666',
    success: '#4CAF50',
    error: '#ff4d4f',
};

const CancelRegistrationModal = ({
    visible,
    onCancel,
    onConfirm,
    isDeleting,
    error
}) => (
    <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onCancel}
        accessibilityLabel="Cancel Registration Confirmation"
    >
        <View style={styles.cancelCenteredView}>
            <View style={styles.cancelModalView}>
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
                        style={[styles.button, styles.cancelButton]}
                        onPress={onCancel}
                        disabled={isDeleting}
                        accessibilityLabel="Cancel Registration Cancellation"
                    >
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.confirmButton]}
                        onPress={onConfirm}
                        disabled={isDeleting}
                        accessibilityLabel="Confirm Registration Cancellation"
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <Text style={styles.buttonText}>Confirm</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

export default CancelRegistrationModal;

const styles = StyleSheet.create({
    cancelCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    cancelModalView: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    cancelModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    cancelModalText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 5,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#C0C0C0',
    },
    confirmButton: {
        backgroundColor: '#ff4d4f',
    },
    buttonText: {
        fontWeight: 'bold',
        color: 'white',
    },
    errorText: {
        color: '#ff4d4f',
        marginBottom: 10,
        textAlign: 'center',
    },
})
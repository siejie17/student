import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Modal,
    StyleSheet
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const COLORS = {
    primary: '#4789d6',
    white: '#FFFFFF',
    black: '#333',
    gray: '#666',
    success: '#4CAF50',
    error: '#ff4d4f',
};

const PaymentProofModal = ({ 
    visible, 
    paymentProofBase64, 
    onClose 
}) => (
    <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
        accessibilityLabel="Payment Proof Modal"
    >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Payment Proof</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        accessibilityLabel="Close Payment Proof Modal"
                    >
                        <MaterialIcons name="close" size={24} color={COLORS.black} />
                    </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                    <Image
                        source={{ uri: `data:image/jpeg;base64,${paymentProofBase64}` }}
                        style={styles.paymentProofImage}
                        resizeMode="contain"
                        defaultSource={require('../../assets/images/image_not_found.png')} // Add a placeholder
                        onError={(e) => console.log('Payment proof image load error', e.nativeEvent.error)}
                        accessibilityLabel="Payment Proof Image"
                    />
                </View>
            </View>
        </View>
    </Modal>
);

export default PaymentProofModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F5',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 16,
        alignItems: 'center',
    },
    paymentProofImage: {
        width: '100%',
        height: 400,
        borderRadius: 8,
    },
});
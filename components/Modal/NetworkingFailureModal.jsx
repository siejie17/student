import { View, Text, Modal, TouchableOpacity, StyleSheet, Image } from 'react-native';

const NetworkingFailureModal = ({
    isVisible,
    onClose,
    title,
    subtitle
}) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Image
                        source={require('../../assets/icons/exclamation-mark.png')}
                        style={styles.failureImage}
                    />

                    <Text style={styles.titleText}>{title}</Text>
                    <Text style={styles.subtitleText}>{subtitle}</Text>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>Got It!</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#F0F4F8',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    failureImage: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
    titleText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 5,
        textAlign: 'center'
    },
    subtitleText: {
        fontSize: 18,
        color: '#34495E',
        paddingTop: 15,
        paddingBottom: 25,
        textAlign: 'center',
    },
    closeButton: {
        width: '80%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#3498DB',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 15
    },
    closeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
    }
});

export default NetworkingFailureModal;
import { View, Text, Animated, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FACULTY_MAPPING = {
    1: "FACA",
    2: "FBE",
    3: "FCSHD",
    4: "FCSIT",
    5: "FEB",
    6: "FELC",
    7: "FENG",
    8: "FMSH",
    9: "FRST",
    10: "FSSH",
};

const NetworkCard = ({ item, index, animatedValues }) => {
    // Format Firebase timestamp to readable date
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown';

        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    transform: [
                        { scale: animatedValues[index] },
                        {
                            translateY: animatedValues[index].interpolate({
                                inputRange: [0.9, 1],
                                outputRange: [0, -5],
                            })
                        },
                    ],
                },
            ]}
        >
            <View style={styles.cardContent}>
                <View style={[styles.profilePicContainer, { borderColor: "#3B6FC9" }]}>
                    <Image 
                        source={{ uri: `data:image/png;base64,${item.profilePic}` }} 
                        style={styles.profilePic} 
                    />
                </View>

                <View style={styles.infoContainer}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{item.networkName}</Text>
                        <View style={[styles.yearBadge, { backgroundColor: "#3B6FC920" }]}>
                            <Text style={[styles.yearText, { color: "#3B6FC9" }]}>Year {item.yearOfStudy}</Text>
                        </View>
                    </View>

                    <View style={styles.facultyContainer}>
                        <Text style={[styles.faculty, { color: "#3B6FC9" }]}>{FACULTY_MAPPING[item.facultyID]}</Text>
                    </View>

                    <View style={styles.eventContainer}>
                        <Text style={styles.eventLabel}>🎯</Text>
                        <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.chatPromptContainer}>
                    <MaterialCommunityIcons name="message" size={14} color="#3B6FC9" />
                    <Text style={styles.chatPromptText}>Press to chat...</Text>
                </View>
        </Animated.View>
    );
};

export default NetworkCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    accentBar: {
        height: 3,
        width: '100%',
    },
    cardContent: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: 'center',
    },
    profilePicContainer: {
        padding: 1.5,
        borderRadius: 22,
        borderWidth: 1.5,
    },
    profilePic: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
    },
    infoContainer: {
        marginLeft: 12,
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    yearBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 6,
    },
    yearText: {
        fontSize: 10,
        fontWeight: '600',
    },
    facultyContainer: {
        marginBottom: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    faculty: {
        fontSize: 12,
        fontWeight: '500',
    },
    eventContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventLabel: {
        fontSize: 11,
        marginRight: 3,
    },
    eventName: {
        fontSize: 11,
        color: '#555',
        fontWeight: '500',
        flex: 1,
    },
    timestamp: {
        fontSize: 10,
        color: '#888',
    },
    chatPromptContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8fafd',
    },
    chatPromptText: {
        fontSize: 11,
        color: '#3B6FC9',
        fontWeight: '500',
        marginLeft: 6,
    }
});
import { View, Text, Animated, StyleSheet, Image } from 'react-native';
import React from 'react';

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
            {/* Colored accent bar based on faculty */}
            <View style={[styles.accentBar, { backgroundColor: "#3B6FC9" }]} />
            
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
                        <Text style={styles.timestamp}>{formatTimestamp(item.scannedTime)}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

export default NetworkCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
        overflow: 'hidden',
    },
    accentBar: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    profilePicContainer: {
        padding: 2,
        borderRadius: 30,
        borderWidth: 2,
    },
    profilePic: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f5f5f5',
    },
    infoContainer: {
        marginLeft: 16,
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    yearBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        marginLeft: 8,
    },
    yearText: {
        fontSize: 11,
        fontWeight: '600',
    },
    facultyContainer: {
        marginBottom: 6,
    },
    faculty: {
        fontSize: 13,
        fontWeight: '500',
    },
    eventContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventLabel: {
        fontSize: 12,
        marginRight: 4,
    },
    eventName: {
        fontSize: 12,
        color: '#555',
        fontWeight: '500',
        flex: 1,
    },
    timestamp: {
        fontSize: 11,
        color: '#888',
        marginLeft: 6,
    },
});
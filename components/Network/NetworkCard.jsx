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

const CATEGORIES_MAPPING = {
    1: "Academic",
    2: "Volunteering",
    3: "Entertainment",
    4: "Cultural",
    5: "Sports",
    6: "Health & Wellness",
    7: "Others",
    "Not Available": "N/A",
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
                        <Text style={styles.eventName} numberOfLines={1}>Connected at: {item.eventName}</Text>
                    </View>
                </View>
            </View>

            {/* Hobbies Section (same row, padding on top, beautified) */}
            {Array.isArray(item.hobbies) && item.hobbies.length > 0 && (
                <View style={styles.hobbiesSectionRow}>
                    <Text style={styles.hobbiesLabelBeautified}>Hobbies</Text>
                    <View style={styles.hobbiesContainerBeautified}>
                        {item.hobbies.map((hobby, idx) => (
                            <View key={idx} style={styles.hobbyChipBeautified}>
                                <Text style={styles.hobbyTextBeautified}>{hobby}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Last Attended Event Section */}
            <View style={styles.lastEventSectionRow}>
                <Text style={styles.lastEventLabel}>Last Attended Event</Text>
                <View style={styles.lastEventInfoContainer}>
                    <Text
                        style={styles.lastEventName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item.lastAttendedEventName}
                    </Text>
                    <View style={styles.lastEventCategoryChip}>
                        <Text style={styles.lastEventCategoryText}>{CATEGORIES_MAPPING[item.lastAttendedEventCategory]}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.chatPromptContainer}>
                {item.hasUnread && (
                    <View style={styles.unreadIndicator}>
                        <Text style={{ color: '#fff', fontSize: 8, textAlign: 'center' }}>New message(s).</Text>
                    </View>
                )}
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
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
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
        position: 'relative',
    },
    unreadIndicator: {
        position: 'absolute',
        left: 12,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 8,
        backgroundColor: '#3B6FC9',
    },
    chatPromptText: {
        fontSize: 11,
        color: '#3B6FC9',
        fontWeight: '500',
        marginLeft: 6,
    },
    hobbiesSectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 4,
    },
    hobbiesLabelBeautified: {
        fontSize: 10,
        color: '#2B4C7E',
        fontWeight: 'bold',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 40,
    },
    hobbiesContainerBeautified: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: 10,
    },
    hobbyChipBeautified: {
        backgroundColor: '#D6E6FF',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 6,
        shadowColor: '#3B6FC9',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    hobbyTextBeautified: {
        fontSize: 11,
        color: '#2B4C7E',
        fontWeight: '600',
    },
    // Last Attended Event Section Styles
    lastEventSectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 4,
        paddingBottom: 8,
    },
    lastEventLabel: {
        fontSize: 10,
        color: '#7E4C2B',
        fontWeight: 'bold',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 4,
        backgroundColor: 'transparent',
    },
    lastEventInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
    },
    lastEventName: {
        fontSize: 11,
        color: '#7E4C2B',
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    lastEventCategoryChip: {
        backgroundColor: '#FFE6D6',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 0,
        shadowColor: '#7E4C2B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    lastEventCategoryText: {
        fontSize: 11,
        color: '#7E4C2B',
        fontWeight: '600',
    },
});
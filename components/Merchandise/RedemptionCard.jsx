import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RedemptionCard = ({ item }) => {
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';

        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);

        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;

        return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
    };

    return (
        <View style={styles.merchandiseCard}>
            <View style={styles.cardContent}>
                <Text style={styles.merchandiseName} numberOfLines={1}>
                    {item.name}
                </Text>

                <View style={styles.cardDetailRow}>
                    <View style={styles.detailWithIcon}>
                        <MaterialCommunityIcons name="tag-outline" size={16} color="#6B7280" />
                        <Text style={styles.cardDetailValue}>{item.redemptionID}</Text>
                    </View>
                    <View style={styles.detailWithIcon}>
                        <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6B7280" />
                        <Text style={styles.cardDetailValue}>{item.collectionLocationName}</Text>
                    </View>
                </View>

                <View style={styles.cardDetailRow}>
                    <View style={styles.detailWithIcon}>
                        <MaterialCommunityIcons name="numeric" size={16} color="#6B7280" />
                        <Text style={styles.cardDetailValue}>Qty: {item.quantity}</Text>
                    </View>
                    {item.category === 'Clothing' && (
                        <View style={styles.detailWithIcon}>
                            <MaterialCommunityIcons name="tshirt-crew-outline" size={16} color="#6B7280" />
                            <Text style={styles.cardDetailValue}>Size: {item.selectedSize}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.detailWithIcon}>
                        <MaterialCommunityIcons name="calendar-outline" size={16} color="#6B7280" />
                        <Text style={styles.dateText}>
                            {formatTimestamp(item.redeemedTime)}
                        </Text>
                    </View>

                    {/* Collection status at the bottom */}
                    <View style={styles.statusContainer}>
                        <MaterialCommunityIcons
                            name={item.collected ? "check-circle" : "progress-clock"}
                            size={18}
                            color={item.collected ? "#10B981" : "#36454F"}
                        />
                        <Text style={[
                            styles.statusText,
                            { color: item.collected ? "#10B981" : "#36454F" }
                        ]}>
                            {item.collected ? "Collected" : "Pending"}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    )
}

export default RedemptionCard;

const styles = StyleSheet.create({
    merchandiseCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardContent: {
        padding: 16,
    },
    merchandiseName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4A6EB5',
        marginBottom: 12,
    },
    cardDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    detailWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardDetailValue: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 6,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 6,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
});


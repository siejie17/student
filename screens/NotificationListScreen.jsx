import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { getItem } from '../utils/asyncStorage';

// Mock data for notifications (keeping for reference)
const mockNotifications = [
    {
        id: '1',
        isRead: false,
        title: 'New Message',
        body: 'You have received a new message from John Doe',
        type: 'message',
        timestamp: new Date().toISOString()
    },
    {
        id: '2',
        isRead: true,
        title: 'System Update',
        body: 'Your account has been successfully updated',
        type: 'system',
        timestamp: new Date().toISOString()
    },
    {
        id: '3',
        isRead: false,
        title: 'Reminder',
        body: 'Don\'t forget to complete your profile',
        type: 'reminder',
        timestamp: new Date().toISOString()
    }
];

const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    // Convert Firestore Timestamp to JS Date if needed
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
};

const EmptyNotifications = () => (
    <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#E5E5E7" />
        </View>
        <Text style={styles.emptyText}>No notifications yet</Text>
        <Text style={styles.emptySubText}>We'll notify you when something arrives</Text>
    </View>
);

const NotificationCard = ({ notification }) => {
    const iconName = 'notifications';
    const iconColor = '#808080';
    
    return (
        <TouchableOpacity 
            style={[
                styles.card, 
                !notification.isRead && styles.unreadCard
            ]}
            activeOpacity={0.8}
        >
            {/* Icon Container */}
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                <Ionicons 
                    name={iconName} 
                    size={20} 
                    color={iconColor} 
                />
            </View>
            
            {/* Content */}
            <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                    <Text style={[
                        styles.title, 
                        !notification.isRead && styles.unreadText
                    ]}>
                        {notification.title}
                    </Text>
                    {notification.sendAt && (
                        <Text style={styles.timestamp}>
                            {formatTimestamp(notification.sendAt)}
                        </Text>
                    )}
                </View>
                
                <Text style={styles.body} numberOfLines={2}>
                    {notification.body}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const NotificationListScreen = ({ navigation }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const studentID = await getItem('studentID');
                if (!studentID) {
                    console.error('No student ID found');
                    setLoading(false);
                    return;
                }

                const notificationsRef = collection(db, 'scheduled_notifications');
                const q = query(
                    notificationsRef,
                    where('studentID', '==', studentID),
                    where('isSent', '==', true)
                );

                const unsubscribe = onSnapshot(q, (querySnapshot) => {
                    const notificationList = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Sort by timestamp (newest first)
                    notificationList.sort((a, b) => {
                        const dateA = new Date(a.sendAt?.toDate?.() || 0);
                        const dateB = new Date(b.sendAt?.toDate?.() || 0);
                        return dateB - dateA;
                    });
                    
                    setNotifications(notificationList);
                    setLoading(false);
                }, (error) => {
                    console.error('Error fetching notifications:', error);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error in fetchNotifications:', error);
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity style={styles.headerAction} />
            </View>

            {/* Notification List */}
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <NotificationCard notification={item} />}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={EmptyNotifications}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 22,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E7',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerAction: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 0.5,
        borderColor: '#F2F2F7',
    },
    unreadCard: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E3F2FD',
        shadowOpacity: 0.08,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1C1C1E',
        flex: 1,
        marginRight: 8,
    },
    unreadText: {
        fontWeight: '600',
        color: '#000',
    },
    timestamp: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '400',
    },
    body: {
        fontSize: 14,
        color: '#636366',
        lineHeight: 20,
        marginBottom: 8,
    },
    priorityBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#FF3B30',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 4,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
        marginTop: 4,
    },
});

export default NotificationListScreen;
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../../utils/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

// Move this outside component to prevent recreation on each render
const ORGANISER_MAPPING = {
    1: "Faculty of Applied & Creative Arts",
    2: "Faculty of Built Environment",
    3: "Faculty of Cognitive Sciences & Human Development",
    4: "Faculty of Computer Science & Information Technology",
    5: "Faculty of Economics & Business",
    6: "Faculty of Education, Language & Communication",
    7: "Faculty of Engineering",
    8: "Faculty of Medicine & Health Sciences",
    9: "Faculty of Resource Science & Technology",
    10: "Faculty of Social Sciences & Humanities",
};

// Faculty color mapping
const FACULTY_COLORS = {
    1: ['#FF9AA2', '#FFB7B2'], // Arts - Soft pink
    2: ['#BDB2FF', '#A0C4FF'], // Built Environment - Lavender
    3: ['#FFE7AA', '#FFDAC1'], // Cognitive Sciences - Light orange
    4: ['#A5F1E9', '#7BDFF2'], // Computer Science - Cyan
    5: ['#B5EAD7', '#C7F9CC'], // Economics - Mint green
    6: ['#E2F0CB', '#CEEDC7'], // Education - Light green
    7: ['#E7C6FF', '#DCB0FF'], // Engineering - Light purple
    8: ['#FF9AA2', '#FFB7B2'], // Medicine - Soft pink
    9: ['#D8E2DC', '#ECE4DB'], // Resource Science - Light gray
    10: ['#FFCFD2', '#FFC8DD'], // Social Sciences - Pink
};

const OngoingUpcomingEventCarousel = ({ setIsLoading, navigation }) => {
    const [events, setEvents] = useState([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    // Format just the date without time
    const formatDate = useCallback((timestamp) => {
        if (!timestamp || !timestamp.seconds) return "Invalid Date";
    
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
        });
    }, []);

    // Format just the time
    const formatTime = useCallback((timestamp) => {
        if (!timestamp || !timestamp.seconds) return "Invalid Time";
    
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }, []);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setIsLoading(true);
                setLocalLoading(true);
    
                const now = Timestamp.now();
                const eventsRef = collection(db, "event");
                const eventsQuery = query(
                    eventsRef,
                    where("eventEndDateTime", ">=", now),
                    where("status", "not-in", ["Completed", "Cancelled"]),
                    orderBy("eventStartDateTime", "asc"),
                    limit(5)
                );
                
                const eventsSnapshot = await getDocs(eventsQuery);
                const nowMillis = now.toMillis();
    
                const formattedEvents = eventsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const startTime = data.eventStartDateTime;
                    const endTime = data.eventEndDateTime;
                    
                    // Determine event status
                    const isOngoing = nowMillis >= startTime.toMillis() && nowMillis < endTime.toMillis();
                    
                    // Calculate time until event starts
                    const timeUntilStart = startTime.toMillis() - nowMillis;
                    const daysUntil = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
                    const hoursUntil = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    
                    // Calculate event duration
                    const durationMs = endTime.toMillis() - startTime.toMillis();
                    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
                    const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
                    // Readable countdown text
                    let countdownText = "";
                    if (isOngoing) {
                        countdownText = "Happening now";
                    } else if (daysUntil > 0) {
                        countdownText = `In ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
                    } else if (hoursUntil > 0) {
                        countdownText = `In ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`;
                    } else {
                        countdownText = "Starting soon";
                    }
    
                    const startDateTime = new Date(startTime.seconds * 1000);
                    const endDateTime = new Date(endTime.seconds * 1000);
    
                    const startDateStr = startDateTime.toISOString().split('T')[0];
                    const endDateStr = endDateTime.toISOString().split('T')[0];
    
                    return {
                        id: doc.id,
                        name: data.eventName,
                        startTime,
                        endTime: startDateStr === endDateStr
                            ? endDateTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
                            : endDateTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true }) + " (" + endDateTime.toLocaleDateString("en-GB") + ")",
                        location: data.locationName,
                        organiserID: data.organiserID,
                        organiser: ORGANISER_MAPPING[data.organiserID],
                        status: isOngoing ? "Ongoing" : "Upcoming",
                        countdownText,
                        durationText: durationDays > 0 ? `${durationDays}d ${durationHours}h ${durationMinutes}m` : `${durationHours}h ${durationMinutes}m`,
                    };
                });
                
                setEvents(formattedEvents);
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setIsLoading(false);
                setLocalLoading(false);
            }
        };
    
        fetchEvents(); // Fetch immediately on mount
    
        // Set interval to refresh every minute
        const intervalId = setInterval(fetchEvents, 60000); 
    
        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, []);    

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 50
    };

    // Memoize renderEventCard to prevent recreating on each render
    const renderEventCard = useCallback(({ item, index }) => {
        const isOngoing = item.status === 'Ongoing';
        const statusColor = isOngoing ? '#FF5722' : '#4CAF50';
        const facultyColors = FACULTY_COLORS[item.organiserID] || ['#E0E0E0', '#BDBDBD'];
        
        return (
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => {
                    // Navigate to event details if you have that screen
                    if (navigation && navigation.navigate) {
                        navigation.navigate('EventDetails', { eventId: item.id });
                    }
                }}
            >
                <View style={styles.card}>
                    {/* Color bar at top based on faculty */}
                    <LinearGradient 
                        colors={facultyColors} 
                        start={{x: 0, y: 0}} 
                        end={{x: 1, y: 0}} 
                        style={styles.cardTopBar} 
                    />
                    
                    <View style={styles.cardContent}>
                        {/* Status badge */}
                        <View style={[styles.statusBadge, { backgroundColor: isOngoing ? 'rgba(255, 87, 34, 0.1)' : 'rgba(76, 175, 80, 0.1)' }]}>
                            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {isOngoing ? 'LIVE NOW' : item.countdownText}
                            </Text>
                        </View>

                        {/* Event Title */}
                        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                            {item.name}
                        </Text>
                        
                        {/* Date card */}
                        <View style={styles.dateTimeContainer}>
                            <View style={styles.dateCard}>
                                <Text style={styles.dateText}>{formatDate(item.startTime)}</Text>
                            </View>
                            <View style={styles.timeDetails}>
                                <Text style={styles.timeText}>{formatTime(item.startTime)} - {item.endTime}</Text>
                                <Text style={styles.durationText}>Duration: {item.durationText}</Text>
                            </View>
                        </View>

                        {/* Location */}
                        <View style={styles.locationContainer}>
                            <MaterialIcons name="location-on" size={16} color="#666" />
                            <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                                {item.location}
                            </Text>
                        </View>

                        {/* Organiser */}
                        <View style={styles.organiserContainer}>
                            <MaterialIcons name="business" size={16} color="#666" />
                            <Text style={styles.organiserName} numberOfLines={1} ellipsizeMode="tail">
                                {item.organiser}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [formatDate, formatTime, navigation]);

    // Improved empty component
    const EmptyComponent = useMemo(() => (
        <View style={styles.emptyContainer}>
            {localLoading ? (
                <ActivityIndicator size="large" color="#007AFF" />
            ) : (
                <>
                    <MaterialIcons name="event-busy" size={50} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Events Found</Text>
                    <Text style={styles.emptySubtitle}>
                        There are no ongoing or upcoming events at this time. Check back later!
                    </Text>
                </>
            )}
        </View>
    ), [localLoading]);

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.headerTitleContainer}>
                <MaterialIcons name="upcoming" size={20} color="#A9A9A9" />
                <Text style={styles.sectionTitle}>Ongoing & Upcoming Events</Text>
                </View>
            </View>
            <FlatList
                data={events}
                renderItem={renderEventCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 20}
                decelerationRate="fast"
                pagingEnabled
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                contentContainerStyle={[
                    styles.listContent,
                    events.length === 0 && styles.emptyListContent
                ]}
                ListEmptyComponent={EmptyComponent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        marginBottom: 8,
        height: "auto",
        minHeight: 200,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewAllText: {
        fontSize: 14,
        color: '#6C63FF',
        marginRight: 2,
    },
    listContent: {
        paddingHorizontal: 10,
        marginVertical: 8,
        paddingBottom: 16,
    },
    emptyListContent: {
        width: width,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: CARD_WIDTH,
        minHeight: 220,
        backgroundColor: 'white',
        borderRadius: 12,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        overflow: 'hidden',
    },
    cardTopBar: {
        height: 6,
        width: '100%',
    },
    cardContent: {
        padding: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
    },
    statusIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        color: '#333',
        lineHeight: 22,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    dateCard: {
        backgroundColor: '#F6F8FD',
        borderRadius: 8,
        padding: 8,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 70,
    },
    dateText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    timeDetails: {
        justifyContent: 'center',
    },
    timeText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    durationText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    locationText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    organiserContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    organiserName: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    paginationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 3,
    },
    paginationDotActive: {
        width: 10,
        height: 6,
        backgroundColor: '#638aff',
    },
    emptyContainer: {
        width: CARD_WIDTH,
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        padding: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 15,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});

export default OngoingUpcomingEventCarousel;
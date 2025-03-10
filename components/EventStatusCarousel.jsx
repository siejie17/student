import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

const organiserMapping = {
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

// Mock Data
const mockEvents = [
    {
        id: '1',
        title: 'International Technology Summit 2025 - Future of AI and Machine Learning',
        startTime: '2025-03-15 09:00 AM',
        endTime: '2025-03-17 06:00 PM',
        organiser: 'Tech Global Solutions',
        status: 'Ongoing',
    },
    {
        id: '2',
        title: 'Business Leadership Conference',
        startTime: '2025-04-01 10:00 AM',
        endTime: '2025-04-02 05:00 PM',
        organiser: 'Business Leaders Association',
        status: 'Upcoming',
    },
    {
        id: '3',
        title: 'Global Marketing Summit',
        startTime: '2025-03-16 08:30 AM',
        endTime: '2025-03-16 04:30 PM',
        organiser: 'Marketing Professionals Network',
        status: 'Ongoing',
    },
    {
        id: '4',
        title: 'Sustainable Energy Expo',
        startTime: '2025-05-10 09:00 AM',
        endTime: '2025-05-12 06:00 PM',
        organiser: 'Green Energy Initiative',
        status: 'Upcoming',
    },
    {
        id: '5',
        title: 'Digital Healthcare Conference',
        startTime: '2025-03-18 08:00 AM',
        endTime: '2025-03-20 05:00 PM',
        organiser: 'Healthcare Innovation Network',
        status: 'Ongoing',
    },
];

const EventStatusCarousel = ({ setIsLoading }) => {
    const [uoEvents, setUOEvents] = useState([]);

    useEffect(() => {
        const fetchOngoingUpcomingEvents = async () => {
            try {
                setIsLoading(true);

                const eventsRef = collection(db, "event");
                const ouEventsQuery = query(
                    eventsRef,
                    where("eventEndDateTime", ">=", Timestamp.now()), // Exclude past events
                    where("status", "not-in", ["completed", "cancelled"]), // Exclude completed & cancelled events
                    orderBy("eventStartDateTime", "asc"), // Sort by event start time 
                    limit(5)
                )
                const ouEventsSnap = await getDocs(ouEventsQuery);

                const uoEvents = ouEventsSnap.docs.map(doc => {
                    const data = doc.data();
                    const startTime = data.eventStartDateTime;
                    const endTime = data.eventEndDateTime;

                    return {
                        id: doc.id,
                        name: data.eventName,
                        startTime: startTime,
                        endTime: endTime,
                        location: data.locationName,
                        organiser: organiserMapping[data.organiserID],
                        status: Timestamp.now().toMillis() >= startTime.toMillis() && Timestamp.now().toMillis() < endTime.toMillis() ? "Ongoing" : "Upcoming"
                    };
                });
                
                setUOEvents(uoEvents);
            } catch (error) {
                console.error("Error when fetching ongoing and upcoming events", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOngoingUpcomingEvents();
    }, []);

    const formatDateTime = (timestamp) => {
        if (!timestamp || !timestamp.seconds) return "Invalid Date";
    
        const date = new Date(timestamp.seconds * 1000);
    
        // Format date (adjust format as needed)
        return date.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    };

    const renderEventCard = ({ item }) => (
        <View style={styles.card}>
            {/* Status Line */}
            <View style={styles.statusContainer}>
                <View style={[
                    styles.statusIndicator,
                    { backgroundColor: item.status === 'Ongoing' ? '#4CAF50' : '#888888' }
                ]} />
                <Text style={[
                    styles.statusText,
                    { color: item.status === 'Ongoing' ? '#4CAF50' : '#888888'  }
                ]}>
                    {item.status}
                </Text>
            </View>

            {/* Event Title */}
            <Text style={styles.title}>
                {item.name}
            </Text>

            {/* Start Time */}
            <View style={styles.mainDetailsContainer}>
                <MaterialIcons name="access-time" size={16} color="#666" />
                <Text style={styles.mainDetailsText}>Start: {formatDateTime(item.startTime)}</Text>
            </View>

            {/* End Time */}
            <View style={styles.mainDetailsContainer}>
                <MaterialIcons name="access-time" size={16} color="#666" />
                <Text style={styles.mainDetailsText}>End: {formatDateTime(item.endTime)}</Text>
            </View>

            <View style={styles.mainDetailsContainer}>
                <MaterialIcons name="location-pin" size={16} color="#666" />
                <Text style={styles.mainDetailsText}>Location: {item.location}</Text>
            </View>

            {/* Organiser */}
            <View style={styles.organiserContainer}>
                <MaterialIcons name="business" size={16} color="#666" />
                <Text style={styles.organiserName}>{item.organiser}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.sectionTitle}>Ongoing and Upcoming Events</Text>
            </View>
            <FlatList
                data={uoEvents}
                renderItem={renderEventCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 20}
                decelerationRate="fast"
                pagingEnabled
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<View><Text>No events</Text></View>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 20,
        height: "fit-content", // Increased container height
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    viewAllText: {
        color: '#007AFF',
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 10,
        marginVertical: 10
    },
    card: {
        width: CARD_WIDTH,
        height: "auto", // Fixed card height
        padding: 16,
        marginHorizontal: 10,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 12, // Increased bottom margin
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16, // Increased bottom margin
        color: '#333',
    },
    mainDetailsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10, // Consistent spacing
    },
    mainDetailsText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
    },
    organiserContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16, // Added more space before organizer
        paddingTop: 12, // Added padding to create visual separation
        borderTopWidth: 1, // Added subtle line for separation
        borderTopColor: '#f0f0f0', // Light gray line
    },
    organiserName: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
    },
});

export default EventStatusCarousel;
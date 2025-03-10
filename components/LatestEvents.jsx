import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Image } from 'react-native'
import React, { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const IMAGE_HEIGHT = 140;

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

const LatestEvents = ({ setIsLoading }) => {
    const [latestEvents, setLatestEvents] = useState(null);

    const navigation = useNavigation();

    useEffect(() => {
        const lastestAddedEvents = async () => {
            try{
                setIsLoading(true);

                const lastestEventsQuery = query(collection(db, "event"), orderBy("lastAdded", "desc"), limit(5));
                const lastestEventsSnap = await getDocs(lastestEventsQuery);

                const lastestEventsData = lastestEventsSnap.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().eventName,
                    organiserID: doc.data().organiserID,
                }));

                const lastestEventsDataWithImage = await Promise.all(
                    lastestEventsData.map(async event => {
                        const eventImagesRef = collection(db, "eventImages");
                        const eventImagesQuery = query(eventImagesRef, where("eventID", "==", event.id));
                        const eventImagesDoc = await getDocs(eventImagesQuery);
            
                        let thumbnail = null;
                        eventImagesDoc.forEach((eventImages) => {
                        if (eventImages.data().images) {
                            const imageData = eventImages.data();
                            thumbnail = imageData.images.length > 0 ? imageData.images[0] : null;
                        }
                        });
            
                        return { ...event, thumbnail };
                    })
                );

                setLatestEvents(lastestEventsDataWithImage);
            } catch (error) {
                console.error("Error fetching latest added events:", error);
            } finally {
                setIsLoading(false);
            }
        }

        lastestAddedEvents();
    }, []);

    const renderEventCard = ({ item }) => (
        <TouchableOpacity
            activeOpacity={1}
            onPress={() => navigation.navigate('EventDetails', { eventID: item.id })}
        >
            <View style={styles.card}>
            <View style={styles.imageContainer}>
                <Image
                source={{ uri: `data:image/png;base64,${item.thumbnail}` }}
                style={styles.image}
                resizeMode="cover"
                />
            </View>
            
            <View style={styles.detailsContainer}>
                <Text numberOfLines={1} style={styles.title}>
                {item.name}
                </Text>
                
                <View style={styles.organiserContainer}>
                <MaterialIcons name="person" size={16} color="#666" />
                <Text numberOfLines={1} style={styles.organiserName}>{organiserMapping[item.organiserID]}</Text>
                </View>
            </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.sectionTitle}>Latest Added Events</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Events")}>
                <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={latestEvents}
                renderItem={renderEventCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 20}
                decelerationRate="fast"
                pagingEnabled
                contentContainerStyle={styles.listContent}
            />
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
      marginBottom: 20,
      height: 250,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingRight: 20,
      marginLeft: 20,
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    viewAllText: {
      color: '#007AFF', // iOS blue color
      fontSize: 14,
    },
    listContent: {
      paddingHorizontal: 10,
    },
    card: {
      width: CARD_WIDTH,
      height: 205,
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
      overflow: 'hidden',
    },
    imageContainer: {
      height: IMAGE_HEIGHT,
      width: '100%',
    },
    image: {
      width: '100%',
      height: '100%',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    detailsContainer: {
      padding: 12,
      backgroundColor: 'white',
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    organiserContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 10,
    },
    organiserName: {
      marginLeft: 6,
      fontSize: 14,
      color: '#666',
    },
});

export default LatestEvents
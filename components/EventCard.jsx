import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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

const EventCard = ({ event }) => {
    const formatDate = (firebaseTimestamp) => {
        if (!firebaseTimestamp) return '';

        const date = firebaseTimestamp.toDate();

        const options = { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        };

        return date.toLocaleDateString('en-US', options);
    };

    return (
        <View style={styles.card}>
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: `data:image/png;base64,${event.thumbnail}` }}
                    style={styles.image}
                    resizeMode="cover"
                />
            </View>

            <View style={styles.detailsContainer}>
                <Text style={styles.eventName}>{event.eventName}</Text>

                <View style={styles.detailRow}>
                    <View style={styles.labelContainer}>
                        <MaterialCommunityIcons name="calendar-start" size={16} color="#888888" />
                        <Text style={styles.detailLabel}>Starts</Text>
                    </View>
                    <Text>{formatDate(event.eventStartDateTime)}</Text>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.labelContainer}>
                        <MaterialCommunityIcons name="calendar-end" size={16} color="#888888" />
                        <Text style={styles.detailLabel}>Ends</Text>
                    </View>
                    <Text style={styles.detailValue}>{formatDate(event.eventEndDateTime)}</Text>
                </View>
                    
                <View style={styles.detailRow}>
                    <View style={styles.labelContainer}>
                        <MaterialCommunityIcons name="calendar-clock" size={16} color="#888888" />
                        <Text style={styles.detailLabel}>Register Before</Text>
                    </View>
                    <Text style={styles.detailValue}>{formatDate(event.registrationClosingDate)}</Text>
                </View>
                    
                <View style={styles.organizerContainer}>
                    <Text style={styles.organizer}>Organized by: {organiserMapping[event.organiserID]}</Text>
                </View>
            </View>
        </View>
    )
};

export default EventCard;

const styles = StyleSheet.create({
    card: {
      width: width - 32, // Full width minus margin
      backgroundColor: '#ffffff',
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      marginHorizontal: 16,
      marginVertical: 10,
    },
    imageContainer: {
      width: '100%',
      height: 180,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    detailsContainer: {
      padding: 16,
    },
    eventName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333333',
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      marginBottom: 8,
      alignItems: 'flex-start',
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 160,
    },
    detailLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: '#888888',
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: 14,
      color: '#333333',
      flex: 1,
    },
    organizerContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#eeeeee',
    },
    organizer: {
      fontSize: 14,
      fontStyle: 'italic',
      color: '#666666',
    },
});
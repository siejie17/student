import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const FACULTY_SHORT_MAPPING = {
  1: "FACA",
  2: "FBE",
  3: "FCSHD",
  4: "FCSIT",
  5: "FEB",
  6: "FELC",
  7: "FENG",
  8: "FMHS",
  9: "FRST",
  10: "FSSH",
};

// Helper function to get faculty accent color
const getFacultyColor = (id) => {
    const colors = {
        1: "rgba(255, 82, 82, 0.3)", // Arts - Red
        2: "rgba(139, 195, 74, 0.3)", // Built Environment - Green
        3: "rgba(171, 71, 188, 0.3)", // Cognitive Sciences - Purple
        4: "rgba(33, 150, 243, 0.3)", // Computer Science - Blue
        5: "rgba(255, 193, 7, 0.3)", // Economics - Amber
        6: "rgba(127, 0, 255, 0.3)", // Education - Violet
        7: "rgba(102, 153, 204, 0.3)", // Engineering - Blue Grey
        8: "rgba(222, 205, 53, 0.3)", // Medicine - Yellow
        9: "rgba(240, 46, 198, 0.3)", // Resource Science - Pink
        10: "rgba(150, 75, 0, 0.3)", // Social Sciences - Brown
    };
    return colors[id] || "#757575"; // Default grey if not found
};

const EventCard = ({ event, onPress }) => {
    const formatDate = (firebaseTimestamp) => {
        if (!firebaseTimestamp) return 'TBA';

        const date = firebaseTimestamp.toDate();
        
        // Format for date display
        const dateOptions = { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric'
        };
        
        // Format for time display
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return {
            date: date.toLocaleDateString('en-US', dateOptions),
            time: date.toLocaleTimeString('en-US', timeOptions)
        };
    };

    const startDT = new Date(event.eventStartDateTime.seconds * 1000);
    const endDT = new Date(event.eventEndDateTime.seconds * 1000);

    const startDateStr = startDT.toISOString().split('T')[0];
    const endDateStr = endDT.toISOString().split('T')[0];
    
    const startDateTime = formatDate(event.eventStartDateTime);
    const endDateTime = startDateStr === endDateStr
    ? endDT.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    : endDT.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true }) + " (" + endDT.toLocaleDateString("en-GB") + ")";
    const registrationDeadline = formatDate(event.registrationClosingDate);
    
    const facultyColor = getFacultyColor(event.organiserID);
    
    // Calculate days remaining until registration closes
    const getDaysRemaining = () => {
        if (!event.registrationClosingDate) return null;
        
        const now = new Date();
        const deadline = event.registrationClosingDate.toDate();
        const diffTime = deadline - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 0 ? diffDays : 0;
    };
    
    const daysRemaining = getDaysRemaining();

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
            {/* Tag showing organizing faculty */}
            <View style={[styles.facultyTag, { backgroundColor: facultyColor }]}>
                <Text style={styles.facultyTagText} numberOfLines={1}>
                    {FACULTY_SHORT_MAPPING[event.organiserID]}
                </Text>
            </View>
            
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: `data:image/png;base64,${event.thumbnail}` }}
                    style={styles.image}
                    resizeMode="cover"
                />
                
                {/* Date badge overlaid on image */}
                {startDateTime !== 'TBA' && (
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeDay}>
                            {startDateTime.date.split(' ')[2]}
                        </Text>
                        <Text style={styles.dateBadgeMonth}>
                            {startDateTime.date.split(' ')[1]}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.detailsContainer}>
                <Text style={styles.eventName} numberOfLines={2}>{event.eventName}</Text>
                
                <View style={styles.timeRow}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#757575" />
                    <Text style={styles.timeText}>
                        {startDateTime.time} - {endDateTime}
                    </Text>
                </View>
                
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color="#757575" />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {event.locationName || "Location TBA"}
                    </Text>
                </View>
                
                {/* Registration deadline info */}
                <View style={styles.registrationContainer}>
                    {daysRemaining !== null && (
                        <View style={[
                            styles.deadlineBadge, 
                            daysRemaining <= 2 ? styles.urgentDeadline : {}
                        ]}>
                            <Text style={styles.deadlineText}>
                                {daysRemaining === 0 ? 'Last day!' : `${daysRemaining} days left`}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.registrationText}>
                        Register by {registrationDeadline.date} • {registrationDeadline.time}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default EventCard;

const styles = StyleSheet.create({
    card: {
        width: width - 32,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        marginHorizontal: 16,
        marginVertical: 12,
    },
    facultyTag: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1,
    },
    facultyTagText: {
        color: '#322D31',
        fontSize: 12,
        fontWeight: '600',
    },
    imageContainer: {
        width: '100%',
        height: 160,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    dateBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        width: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    dateBadgeDay: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    dateBadgeMonth: {
        fontSize: 14,
        color: '#555',
        textTransform: 'uppercase',
    },
    detailsContainer: {
        padding: 16,
    },
    eventName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 10,
        lineHeight: 24,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    timeText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#555',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    locationText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#555',
    },
    registrationContainer: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    registrationText: {
        fontSize: 12,
        color: '#777',
        flex: 1,
    },
    deadlineBadge: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    urgentDeadline: {
        backgroundColor: '#FFE0E0',
    },
    deadlineText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333030',
    },
});
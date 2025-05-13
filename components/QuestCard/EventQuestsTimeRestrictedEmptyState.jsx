import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EventQuestsTimeRestrictedEmptyState = () => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="clock" size={48} color="#3B82F6" style={styles.icon} />
        <Text style={styles.title}>
          Quests Coming Soon
        </Text>
        <Text style={styles.subtitle}>
          Event quests will be available 1 hour before the event starts
        </Text>
        <View style={styles.timelineContainer}>
          <MaterialCommunityIcons name="calendar" size={20} color="#6B7280" style={styles.calendarIcon} />
          <Text style={styles.timelineText}>
            Check back closer to the event time
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
  },
  card: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  timelineContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginRight: 8,
  },
  timelineText: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default EventQuestsTimeRestrictedEmptyState;
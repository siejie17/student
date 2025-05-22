import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const EmptyNetworkState = ({ onScanQRPress }) => {
  return (
    <Animatable.View 
      style={styles.container}
      animation="fadeIn"
      duration={800}
      useNativeDriver
    >
      <Animatable.View
        animation="bounceIn"
        delay={300}
        useNativeDriver
      >
        <Image 
          source={require('../../assets/network/lonely_student.png')} 
          style={styles.image}
          resizeMode="contain"
        />
      </Animatable.View>

      <Animatable.Text 
        style={styles.title}
        animation="fadeInUp"
        delay={500}
        useNativeDriver
      >
        Your Network Is Feeling Empty!
      </Animatable.Text>
      
      <Animatable.Text 
        style={styles.subtitle}
        animation="fadeInUp"
        delay={700}
        useNativeDriver
      >
        Even introverts need connections... just fewer of them!
      </Animatable.Text>
      
      <Animatable.View
        style={styles.infoContainer}
        animation="fadeInUp"
        delay={900}
        useNativeDriver
      >
        <View style={styles.bulletPoint}>
          <Ionicons name="people-circle-outline" size={24} color="#415881" />
          <Text style={styles.bulletText}>Meet awesome people at campus events</Text>
        </View>
        
        <View style={styles.bulletPoint}>
          <Ionicons name="qr-code-outline" size={24} color="#415881" />
          <Text style={styles.bulletText}>Scan their QR codes to add them here</Text>
        </View>
        
        <View style={styles.bulletPoint}>
          <Ionicons name="school-outline" size={24} color="#415881" />
          <Text style={styles.bulletText}>Build your campus network and find study buddies</Text>
        </View>
      </Animatable.View>
      
      <Animatable.Text 
        style={styles.funnyQuote}
        animation="fadeIn"
        delay={1100}
        useNativeDriver
      >
        "Networking is just one QR code away from being less awkward."
      </Animatable.Text>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  infoContainer: {
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 30,
    backgroundColor: '#f5f8ff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletText: {
    fontSize: 14,
    color: '#455B7C',
    marginLeft: 10,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#415881',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  funnyQuote: {
    fontSize: 13,
    color: '#888888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default EmptyNetworkState;
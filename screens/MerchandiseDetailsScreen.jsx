import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native'
import { useRef } from 'react'
import { Entypo, MaterialIcons } from '@expo/vector-icons';

import MerchandiseFooter from '../components/Merchandise/MerchandiseFooter';

const { width } = Dimensions.get('window');

const MerchandiseDetailsScreen = ({ route, navigation }) => {
  const { merch, balanceDiamonds } = route?.params;

  const scrollViewRef = useRef(null);

  const ADMIN_MAPPING = {
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

  return (
    <View style={styles.background}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Entypo name="chevron-left" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.merchBriefDetailsContainer}>
          <Text style={styles.merchNameHeader} numberOfLines={1} ellipsizeMode="tail">
            {merch.name}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.imageContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {merch.images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image
                  source={{ uri: `data:image/png;base64,${image}` }}
                  style={styles.image}
                />
                <View style={styles.indicator}>
                  <Text style={styles.indicatorText}>
                    {index + 1} / {merch.images.length}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.adminContainer}>
          <View style={styles.adminCard}>
            <View style={styles.adminContent}>
              <View style={styles.adminIconContainer}>
                <MaterialIcons name="person" size={24} color="#fff" />
              </View>
              <View style={styles.adminTextContainer}>
                <Text style={styles.adminLabel}>Managed by</Text>
                <Text style={styles.adminName} numberOfLines={1} ellipsizeMode='tail'>{ADMIN_MAPPING[merch.adminID]}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialIcons name="description" size={22} color="#708090" />
              <Text style={styles.infoHeaderText}>Description</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.descriptionText}>{merch.description}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialIcons name="location-pin" size={22} color="#708090" />
              <Text style={styles.infoHeaderText}>Collection Place</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.descriptionText}>{merch.collectionLocationName}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <MerchandiseFooter
        merch={merch}
        balanceDiamonds={balanceDiamonds}
      />
    </View>
  )
}

export default MerchandiseDetailsScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(165, 165, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchBriefDetailsContainer: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  merchNameHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16, // Add some padding at the bottom so content doesn't get hidden behind the footer
  },
  imageContainer: {
    height: 250,
    position: 'relative',
    marginTop: 15,
  },
  imageWrapper: {
    width,
    height: 250,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5, // for Android
  },
  image: {
    width: width - 20, // Account for horizontal padding
    height: 250,
    resizeMode: 'contain',
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  indicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginRight: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  indicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  adminContainer: {
    marginHorizontal: 8,
    marginVertical: 8,
  },
  adminCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
  },
  adminContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d3d3d3', // A beautiful blue color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B7FFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  adminTextContainer: {
    marginLeft: 15,
  },
  adminLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dividerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    width: '90%',
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  detailsContainer: {
    marginHorizontal: 7,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    backgroundColor: '#fafbfc',
  },
  infoHeaderText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  infoContent: {
    padding: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    textAlign: "justify"
  },
  footer: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 10,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});
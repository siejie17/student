import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { getItem } from '../utils/asyncStorage';
import RedemptionCard from '../components/Merchandise/RedemptionCard';
import EmptyListComponent from '../components/Merchandise/EmptyListComponent';

const RedemptionListingScreen = () => {
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe; // Store unsubscribe function

    const fetchStudentRedemption = async () => {
      setIsLoading(true);
      try {
        const studentID = await getItem("studentID");
        if (!studentID) {
          setIsLoading(false);
          return;
        }

        const redemptionRef = collection(db, "redemption");
        const redemptionQuery = query(redemptionRef, where("studentID", "==", studentID), orderBy("collected", "asc"), orderBy("redeemedTime", "desc"));

        unsubscribe = onSnapshot(redemptionQuery, async (snapshot) => {
          let redemptionData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Extract unique merchandiseIDs
          const merchandiseIDs = [...new Set(redemptionData.map(item => item.merchandiseID))];

          // Fetch merchandise details
          const merchandiseData = {};
          await Promise.all(merchandiseIDs.map(async (id) => {
            const merchandiseDocRef = doc(db, "merchandise", id);
            const merchandiseDoc = await getDoc(merchandiseDocRef);
            if (merchandiseDoc.exists()) {
              merchandiseData[id] = {
                name: merchandiseDoc.data().name,
                collectionLocationName: merchandiseDoc.data().collectionLocationName,
                category: merchandiseDoc.data().category,
              };
            }
          }));

          // Merge merchandise details into redemption data
          const mergedData = redemptionData.map(item => ({
            ...item,
            name: merchandiseData[item.merchandiseID]?.name || "Unknown",
            collectionLocationName: merchandiseData[item.merchandiseID]?.collectionLocationName || "Unknown",
            category: merchandiseData[item.merchandiseID]?.category || "Unknown",
          }));

          setRedemptions(mergedData);
          setIsLoading(false);
        });

      } catch (error) {
        console.error("Error fetching data:", error);
        setRedemptions([]);
        setIsLoading(false);
      }
    };

    fetchStudentRedemption();

    return () => {
      if (unsubscribe) unsubscribe(); // Cleanup listener on unmount
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A6FA5" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <FlatList
        data={redemptions}
        renderItem={({ item }) => <RedemptionCard item={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyListComponent />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  )
}

export default RedemptionListingScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 16,
    color: '#36454F',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  separator: {
    height: 16,
  },
});
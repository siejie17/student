import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { getItem } from '../utils/asyncStorage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import EventQuestCard from '../components/EventQuestCard';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import EarlyBirdQuestSheet from '../components/Quests/EarlyBirdQuestSheet';

const EventQuestsScreen = ({ route }) => {
  const { eventID } = route.params || {};

  const [selectedQuest, setSelectedQuest] = useState(null);
  const [userQuestsList, setUserQuestsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuestSheetVisible, setIsQuestSheetVisible] = useState(false);

  const snapPoints = useMemo(() => ['50%', '75%'], []);

  const bottomSheetRef = useRef(null);

  useEffect(() => {
    const fetchUserQuests = async () => {
      try {
        setIsLoading(true);

        const studentID = await getItem("studentID");
        if (!studentID) return;

        let quests = [];
        let questProgress = [];

        const questProgressListQuery = query(
          collection(db, "questProgress"), 
          where("studentID", "==", studentID), 
          where("eventID", "==", eventID)
        );

        const questProgressSnapshots = await getDocs(questProgressListQuery);

        for (const docSnapshot of questProgressSnapshots.docs) {
          const questProgressDocID = docSnapshot.id; // Get the document ID

          // Reference the subcollection inside the specific document
          const subcollectionRef = collection(db, "questProgress", questProgressDocID, "questProgressList"); 

          // Fetch subcollection documents
          const subcollectionSnapshots = await getDocs(subcollectionRef);

          subcollectionSnapshots.forEach((subDoc) => {
            questProgress.push(subDoc.data());
          });
        };

        const eventQuestQuery = query(collection(db, "quest"), where("eventID", "==", eventID));

        const eventQuestSnapshots = await getDocs(eventQuestQuery);

        for (const eventQuestDoc of eventQuestSnapshots.docs) {
          const eventQuestID = eventQuestDoc.id;

          const questListRef = collection(db, "quest", eventQuestID, "questList");

          const questListSnapshots = await getDocs(questListRef);

          questListSnapshots.forEach((doc) => {
            quests.push({
              questID: doc.id, // Include the document ID
              ...doc.data() // Spread the document data
            });
          })
        }

        const userQuests = quests.map(q => {
          const progressData = questProgress.find(qp => qp.questID === q.questID) || {};
          return { ...q, ...progressData }
        })

        setUserQuestsList(userQuests);
        setIsLoading(false);
      } catch (error) {
        console.error("Error when fetching user quests", error);
        setIsLoading(false);
      }
    }

    fetchUserQuests();
  }, []);

  const handleSheetClose = (index) => {
    setIsQuestSheetVisible(index > 0);
  };

  const handleClosePress = useCallback(() => {
      bottomSheetRef.current?.close();
      setSelectedQuest(null);
  }, []);

  const handleQuestPress = (quest) => {
    setSelectedQuest(quest); // Store selected quest
    setIsQuestSheetVisible(true);
    bottomSheetRef.current?.expand(); // Open bottom sheet
  };

  const renderQuestCard = ({ item, index }) => (
    <EventQuestCard
      questNumber={index + 1}
      title={item.questName}
      diamondsRewards={item.diamondsRewards}
      pointsRewards={item.pointsRewards}
      onPress={() => handleQuestPress(item)}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <FlatList
        data={userQuestsList}
        renderItem={renderQuestCard}
        keyExtractor={item => item.questID}
      />

      <BottomSheet 
        ref={bottomSheetRef} 
        index={isQuestSheetVisible ? 1 : -1} 
        enablePanDownToClose
        snapPoints={snapPoints}
        onChange={handleSheetClose}
        handleIndicatorStyle={styles.handleIndicatorStyle}
        handleStyle={styles.handleStyle}
        style={styles.bottomSheetStyles}
        enableHandlePanningGesture
        enableOverDrag={false}
      >
        <BottomSheetView style={{ padding: 8 }}>
          {selectedQuest && (
            <>
            {selectedQuest.questType === "earlyBird" &&  
              <EarlyBirdQuestSheet 
                selectedQuest={selectedQuest}
                onCancel={handleClosePress}
                eventID={eventID}
              />
            }
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  )
}

export default EventQuestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  bottomSheetStyles: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    backgroundColor: "rgba(91, 126, 254, 0.1)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicatorStyle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  handleStyle: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "transparent"
  },
  backgroundStyle: {
    backgroundColor: 'transparent',
  }
})
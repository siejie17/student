import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { getItem } from '../utils/asyncStorage';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import EventQuestCard from '../components/QuestCard/EventQuestCard';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import EarlyBirdQuestSheet from '../components/Quests/EarlyBirdQuestSheet';
import FeedbackQuestSheet from '../components/Quests/FeedbackQuestSheet';
import QuestionAnswerQuestSheet from '../components/Quests/QuestionAnswerQuestSheet';
import NetworkingQuestSheet from '../components/Quests/NetworkingQuestSheet';
import AttendanceQuestSheet from '../components/Quests/AttendanceQuestSheet';

const EventQuestsScreen = ({ route, navigation }) => {
  const { eventID, categoryID, latitude, longitude, registrationID } = route.params || {};

  const [selectedQuest, setSelectedQuest] = useState(null);
  const [userQuestsList, setUserQuestsList] = useState([]);
  const [quests, setQuests] = useState([]);
  const [questProgress, setQuestProgress] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuestSheetVisible, setIsQuestSheetVisible] = useState(false);

  const snapPoints = useMemo(() => ['50%', '75%', '110%'], []);

  const bottomSheetRef = useRef(null);

  const updateQuestStatus = async () => {
    try {
      const studentID = await getItem("studentID");
      if (!studentID) return;

      const questProgressListQuery = query(
        collection(db, "questProgress"),
        where("studentID", "==", studentID),
        where("eventID", "==", eventID)
      );

      const questProgressSnapshots = await getDocs(questProgressListQuery);

      questProgressSnapshots.forEach(async (questList) => {
        let questListID = questList.id;

        const questRef = doc(db, "questProgress", questListID, "questProgressList", selectedQuest.id);

        await updateDoc(questRef, {
          rewardsClaimed: true,
        })
      })
    } catch (error) {
      console.error("Error when updating quest status", error);
    }
  }

  const fetchUserQuests = async () => {
    try {
      setIsLoading(true);

      const studentID = await getItem("studentID");
      if (!studentID) return;

      let unsubscribes = [];

      // Fetch user quest progress with real-time updates
      const questProgressListQuery = query(
        collection(db, "questProgress"),
        where("studentID", "==", studentID),
        where("eventID", "==", eventID)
      );

      const questProgressSnapshots = await getDocs(questProgressListQuery);

      for (const docSnapshot of questProgressSnapshots.docs) {
        const questProgressDocID = docSnapshot.id;
        const subcollectionRef = collection(db, "questProgress", questProgressDocID, "questProgressList");

        const unsubscribeQuestProgress = onSnapshot(subcollectionRef, (querySnapshot) => {
          const updatedQuestProgress = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          setQuestProgress(updatedQuestProgress); // Update state
        });

        unsubscribes.push(unsubscribeQuestProgress);
      }

      // Fetch event quests with real-time updates
      const eventQuestQuery = query(collection(db, "quest"), where("eventID", "==", eventID));

      const unsubscribeEventQuests = onSnapshot(eventQuestQuery, (eventQuestSnapshots) => {
        let allQuests = [];

        const unsubQuestLists = eventQuestSnapshots.docs.map(eventQuestDoc => {
          const eventQuestID = eventQuestDoc.id;
          const questListRef = collection(db, "quest", eventQuestID, "questList");

          return onSnapshot(questListRef, (questListSnapshots) => {
            const updatedQuests = questListSnapshots.docs.map(doc => ({
              questID: doc.id,
              ...doc.data(),
            }));

            allQuests = [...allQuests, ...updatedQuests];

            setQuests(allQuests); // Update state
          });
        });

        unsubscribes.push(...unsubQuestLists);
      });

      unsubscribes.push(unsubscribeEventQuests);

      setIsLoading(false);

      return () => {
        unsubscribes.forEach(unsub => unsub());
      };

    } catch (error) {
      console.error("Error when fetching user quests", error);
      setIsLoading(false);
    }
  };

  // Add this useEffect to update selectedQuest when data changes
  useEffect(() => {
    if (selectedQuest && userQuestsList.length > 0) {
      const updatedSelectedQuest = userQuestsList.find(
        quest => quest.questID === selectedQuest.questID
      );

      if (updatedSelectedQuest) {
        setSelectedQuest(updatedSelectedQuest);
      }
    }
  }, [userQuestsList]);

  // Automatically update user quests list when quests or progress change
  useEffect(() => {
    setUserQuestsList(
      quests.map(q => ({
        ...q,
        ...(questProgress.find(qp => qp.questID === q.questID) || {}),
      }))
    );
  }, [quests, questProgress]);

  // Use inside useEffect
  useEffect(() => {
    let unsubscribe = () => { };

    fetchUserQuests().then((cleanup) => {
      if (typeof cleanup === "function") {
        unsubscribe = cleanup;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSheetClose = (index) => {
    setIsQuestSheetVisible(index > 0);
  };

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
    setSelectedQuest(null);
  }, []);

  const handleQuestPress = (quest) => {
    // Find the most current version of this quest from userQuestsList
    const currentQuest = userQuestsList.find(q => q.questID === quest.questID);
    setSelectedQuest(currentQuest || quest); // Fallback to passed quest if not found
    setIsQuestSheetVisible(true);
    bottomSheetRef.current?.expand(); // Open bottom sheet
  };

  const renderQuestCard = ({ item, index }) => (
    <EventQuestCard
      questNumber={index + 1}
      title={item.questName}
      isCompleted={item.isCompleted}
      rewardsClaimed={item.rewardsClaimed}
      diamondsRewards={item.diamondsRewards}
      pointsRewards={item.pointsRewards}
      questType={item.questType}
      maxEarlyBird={item.questType === "earlyBird" ? item.maxEarlyBird : null}
      eventID={eventID}
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
        <BottomSheetScrollView
          style={{ flexGrow: 1, padding: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {selectedQuest && (
            <>
              {selectedQuest.questType === "earlyBird" &&
                <EarlyBirdQuestSheet
                  selectedQuest={selectedQuest}
                  onCancel={handleClosePress}
                  eventID={eventID}
                  updateQuestStatus={updateQuestStatus}
                />
              }
              {selectedQuest.questType === "feedback" &&
                <FeedbackQuestSheet
                  selectedQuest={selectedQuest}
                  onCancel={handleClosePress}
                  eventID={eventID}
                  updateQuestStatus={updateQuestStatus}
                  navigation={navigation}
                  registrationID={registrationID}
                />
              }
              {selectedQuest.questType === "q&a" &&
                <QuestionAnswerQuestSheet
                  selectedQuest={selectedQuest}
                  onCancel={handleClosePress}
                  eventID={eventID}
                  updateQuestStatus={updateQuestStatus}
                  navigation={navigation}
                  registrationID={registrationID}
                />
              }
              {selectedQuest.questType === "networking" &&
                <NetworkingQuestSheet
                  selectedQuest={selectedQuest}
                  onCancel={handleClosePress}
                  eventID={eventID}
                  updateQuestStatus={updateQuestStatus}
                  navigation={navigation}
                  registrationID={registrationID}
                />
              }
              {selectedQuest.questType === "attendance" &&
                <AttendanceQuestSheet
                  selectedQuest={selectedQuest}
                  onCancel={handleClosePress}
                  eventID={eventID}
                  categoryID={categoryID}
                  updateQuestStatus={updateQuestStatus}
                  navigation={navigation}
                  registrationID={registrationID}
                  latitude={latitude}
                  longitude={longitude}
                />
              }
            </>
          )}
        </BottomSheetScrollView>
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
    flex: 1,
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
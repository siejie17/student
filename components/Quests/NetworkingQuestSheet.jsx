import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image, Modal, Easing, Platform } from 'react-native';
import { collection, setDoc, getDocs, increment, query, updateDoc, where, getDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import CryptoJS from 'react-native-crypto-js';
import * as Haptics from 'expo-haptics';

import { db } from '../../utils/firebaseConfig';
import { getItem } from '../../utils/asyncStorage';

import NetworkScannedModal from '../Modal/NetworkScannedModal';
import QuestCompletedModal from '../Modal/QuestCompletedModal';
import NetworkingFailureModal from '../Modal/NetworkingFailureModal';

const FACULTY_MAPPING = {
    1: "FACA",
    2: "FBE",
    3: "FCSHD",
    4: "FCSIT",
    5: "FEB",
    6: "FELC",
    7: "FENG",
    8: "FMSH",
    9: "FRST",
    10: "FSSH",
}

const NetworkingQuestSheet = ({ selectedQuest, onCancel, eventID, updateQuestStatus, registrationID, navigation }) => {
    // Mode state: 'display' for showing QR, 'scan' for scanning QR
    const [mode, setMode] = useState('display');

    // QR code generation states
    const [qrData, setQrData] = useState('');

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const [animatingDiamonds, setAnimatingDiamonds] = useState(false);

    const [userDetails, setUserDetails] = useState();
    const [isLoading, setIsLoading] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [scannedModalVisible, setScannedModalVisible] = useState(false);
    const [completedModalVisible, setCompletedModalVisible] = useState(false);
    const [networkingFailureModalVisible, setNetworkingFailureModalVisible] = useState(false);
    const [networkingFailureModalContent, setNetworkingFailureModalContent] = useState({
        title: '',
        subtitle: '',
    })

    // Camera and scanning states
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    // New state for scan success modal
    const [scanSuccessModalVisible, setScanSuccessModalVisible] = useState(false);
    const scanFadeAnim = useRef(new Animated.Value(0)).current;
    const scanScaleAnim = useRef(new Animated.Value(0.8)).current;
    const scanCheckmarkScale = useRef(new Animated.Value(0)).current;
    const scanCheckmarkOpacity = useRef(new Animated.Value(0)).current;
    const scanProgressAnim = useRef(new Animated.Value(0)).current;

    // Get encryption key
    const secretKey = Constants.expoConfig?.extra?.encryptionKey;

    const diamondAnims = useRef([...Array(30)].map(() => ({
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.5),
        opacity: new Animated.Value(0),
        rotate: new Animated.Value(0),
    }))).current;

    const pointAnims = useRef([...Array(30)].map(() => ({
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.5),
        opacity: new Animated.Value(0),
        rotate: new Animated.Value(0),
    }))).current;

    if (!selectedQuest) return null;

    useEffect(() => {
        setIsLoading(true);
        setScanned(false);
        generateNetworkQR();

        // Animate QR code entrance
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();

        fetchUserDetails();
        setIsLoading(false);
    }, []);

    const generateNetworkQR = async () => {
        const networkID = await getItem("studentID");

        const dataToEncrypt = {
            networkID,
            eventID,
        };

        try {
            const jsonData = JSON.stringify(dataToEncrypt);
            const encryptedData = CryptoJS.AES.encrypt(jsonData, secretKey).toString();
            setQrData(encryptedData);
        } catch (error) {
            console.error('Error encrypting data:', error);
            setQrData('');
        }
    };

    const fetchUserDetails = async () => {
        try {
            const studentID = await getItem("studentID");
            if (!studentID) return;

            const studentRef = doc(db, "user", studentID);
            const studentSnap = await getDoc(studentRef);

            if (!studentSnap.exists()) {
                console.log("No such user exists");
                return;
            }

            const studentSnapData = studentSnap.data();

            const studentData = {
                firstName: studentSnapData.firstName,
                lastName: studentSnapData.lastName,
                yearOfStudy: studentSnapData.yearOfStudy,
                facultyID: studentSnapData.facultyID
            }

            setUserDetails(studentData);
        } catch (error) {
            console.error("Error when fetching user details:", error);
            setUserDetails({});
        }
    }

    const addUserToNetworkList = async (scannedUserID, scannerUserID, eventID) => {
        try {
            // Check if scanned user already has the scanner in their network list
            const networkRef = collection(db, "network");
            const networkQuery = query(networkRef, where("studentID", "==", scannedUserID));
            const networkSnap = await getDocs(networkQuery);

            let scannedUserDocRef;
            let isNewConnection = false;

            if (networkSnap.empty) {
                // Create new network document for scanned user
                const newDocRef = await addDoc(networkRef, { studentID: scannedUserID });
                scannedUserDocRef = doc(db, "network", newDocRef.id);
                isNewConnection = true;
            } else {
                // Use existing network document
                scannedUserDocRef = doc(db, "network", networkSnap.docs[0].id);

                // Check if scanner is already in the network list
                const existingNetworkListRef = collection(scannedUserDocRef, "networkList");
                const existingNetworkListSnap = await getDocs(existingNetworkListRef);

                const existingNetworkIDs = existingNetworkListSnap.docs.map(doc => doc.data().networkID);

                if (existingNetworkIDs.includes(scannerUserID)) {
                    // Connection already exists, don't add again
                    console.log("Connection already exists for scanned user");
                    return;
                }

                isNewConnection = true;
            }

            // Add scanner to scanned user's network list
            const networkListRef = collection(scannedUserDocRef, "networkList");
            await addDoc(networkListRef, {
                eventID: eventID,
                networkID: scannerUserID,
                scannedTime: serverTimestamp(),
            });

            // If this is a new connection, update the scanned user's quest progress
            if (isNewConnection) {
                await updateScannedUserQuestProgress(scannedUserID, eventID);
                await updateScannedUserBadgeProgress(scannedUserID);
            }

            console.log(`Added ${scannerUserID} to ${scannedUserID}'s network list`);
        } catch (error) {
            console.error("Error adding user to network list:", error);
        }
    }

    const updateScannedUserQuestProgress = async (scannedUserID, eventID) => {
        try {
            // Get networking quests from questList subcollection under the event document
            const eventQuestRef = query(collection(db, "quest"), where("eventID", "==", eventID));
            const eventQuestSnap = await getDocs(eventQuestRef);
            const eventQuestID = eventQuestSnap.docs[0]?.id;

            const questListRef = collection(doc(db, "quest", eventQuestID), "questList");
            const questQuery = query(questListRef, where("questType", "==", "networking"));
            const questSnap = await getDocs(questQuery);

            if (questSnap.empty) {
                console.log("No networking quests found for this event");
                return;
            }

            // Update progress for each networking quest
            for (const questDoc of questSnap.docs) {
                const questData = questDoc.data();

                const questProgressQuery = query(
                    collection(db, "questProgress"),
                    where("eventID", "==", eventID),
                    where("studentID", "==", scannedUserID)
                );
                const questProgressSnap = await getDocs(questProgressQuery);

                if (!questProgressSnap.empty) {
                    const questProgressID = questProgressSnap.docs[0].id;
                    const userQuestProgressRef = collection(db, "questProgress", questProgressID, "questProgressList");
                    const userQuestQuery = query(userQuestProgressRef, where("questID", "==", questDoc.id));

                    // Get current progress
                    const currentProgressDoc = await getDocs(userQuestQuery);
                    let currentProgress = 0;

                    if (!currentProgressDoc.empty) {
                        currentProgress = currentProgressDoc.docs[0].data().progress || 0;
                    }

                    const currentProgressDocRef = currentProgressDoc.docs[0]?.ref;

                    const newProgress = currentProgress + 1;

                    if (newProgress >= questData.completionNum) {
                        // Quest completed
                        await setDoc(currentProgressDocRef, {
                            isCompleted: true,
                            progress: newProgress
                        }, { merge: true });
                    } else {
                        // Update progress
                        await setDoc(currentProgressDocRef, {
                            progress: newProgress
                        }, { merge: true });
                    }
                }
            }
        } catch (error) {
            console.error("Error updating scanned user quest progress:", error);
        }
    }

    const updateScannedUserBadgeProgress = async (scannedUserID) => {
        try {
            // Get networking badge
            const networkBadgeQuery = query(collection(db, "badge"), where("badgeType", "==", "networking"));
            const networkBadgeSnap = await getDocs(networkBadgeQuery);

            if (networkBadgeSnap.empty) {
                console.log("No networking badge found");
                return;
            }

            const networkBadge = networkBadgeSnap.docs[0].data();

            // Get user's badge progress
            const badgeProgressQuery = query(
                collection(db, "badgeProgress"),
                where("studentID", "==", scannedUserID)
            );
            const badgeProgressSnap = await getDocs(badgeProgressQuery);

            if (!badgeProgressSnap.empty) {
                const badgeProgressID = badgeProgressSnap.docs[0].id;
                const userNetworkBadgeRef = doc(db, "badgeProgress", badgeProgressID, "userBadgeProgress", networkBadgeSnap.docs[0].id);

                const userNetworkBadgeSnap = await getDoc(userNetworkBadgeRef);

                if (userNetworkBadgeSnap.exists()) {
                    const userNetworkBadgeProgress = userNetworkBadgeSnap.data();

                    if (!userNetworkBadgeProgress.isUnlocked) {
                        const newProgress = (userNetworkBadgeProgress.progress || 0) + 1;

                        if (newProgress >= networkBadge.unlockProgress) {
                            // Badge unlocked
                            await updateDoc(userNetworkBadgeRef, {
                                isUnlocked: true,
                                progress: newProgress,
                                dateUpdated: serverTimestamp()
                            });
                            console.log(`Networking badge unlocked for user ${scannedUserID}`);
                        } else {
                            // Update progress
                            await updateDoc(userNetworkBadgeRef, {
                                progress: newProgress,
                                dateUpdated: serverTimestamp()
                            });
                            console.log(`Updated badge progress for user ${scannedUserID}: ${newProgress}/${networkBadge.unlockProgress}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error updating scanned user badge progress:", error);
        }
    }

    const networkPercentage = Math.min(
        (selectedQuest.progress / selectedQuest.completionNum) * 100,
        100
    );

    const renderDisplayMode = () => {
        return (
            <BlurView intensity={10} style={styles.blurContainer}>
                <Animated.View
                    style={[
                        styles.qrContainer,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { scale: scaleAnim }
                            ]
                        }
                    ]}
                >
                    {qrData ? (
                        <QRCode
                            value={qrData}
                            size={125}
                            color="#000000"
                            backgroundColor="transparent"
                        />
                    ) : (
                        <ActivityIndicator size="large" color="#6c63ff" />
                    )}
                </Animated.View>

                {!isLoading && userDetails && (
                    <>
                        <View style={styles.profileInfoContainer}>
                            <Text style={[styles.nameText, { color: "#000000" }]}>
                                {userDetails.firstName || 'User'} {userDetails.lastName || ''}
                            </Text>
                        </View>
                        <View style={styles.academicInfo}>
                            <View style={styles.infoItem}>
                                <Ionicons name="book-outline" size={18} color="#000000" />
                                <Text style={styles.infoText}>Year {userDetails.yearOfStudy || "Loading..."}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Ionicons name="school-outline" size={18} color="#000000" />
                                <Text style={styles.infoText}>{FACULTY_MAPPING[userDetails.facultyID] || "Loading..."}</Text>
                            </View>
                        </View>
                    </>
                )}
            </BlurView>
        )
    }

    const renderScanMode = () => {
        return (
            <View>
                {!permission?.granted ? (
                    <View style={styles.permissionContainer}>
                        <Text style={styles.permissionTitle}>
                            Camera permission is required to scan QR codes
                        </Text>
                        <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={requestPermission}
                        >
                            <Text style={styles.permissionButtonText}>
                                Grant Permission
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.scannerContainer}>
                        <CameraView
                            style={styles.camera}
                            facing="back"
                            barCodeScannerSettings={{
                                barCodeTypes: ['qr'],
                            }}
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        />

                        <View style={styles.scanOverlay}>
                            <View style={styles.scanFrame} />
                        </View>
                    </View>
                )}
            </View>
        )
    }

    const handleBarCodeScanned = async ({ type, data }) => {
        setScanned(true);

        let userNetworkStudentIDList = [];

        try {
            const decryptedBytes = CryptoJS.AES.decrypt(data, secretKey);
            const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
            const parsedData = JSON.parse(decryptedText);

            if (parsedData.networkID && parsedData.eventID) {
                const studentID = await getItem("studentID");

                const allUserRef = collection(db, "user");
                const allUserSnapshots = await getDocs(allUserRef);

                const allUserIDs = allUserSnapshots.docs.map(doc => doc.id);

                const userIdExists = allUserIDs.includes(parsedData.networkID);

                if (!userIdExists) {
                    setNetworkingFailureModalContent({
                        title: 'Unregistered User Detected',
                        subtitle: 'The scanned user has not been registered in the system. Please ensure the user has joined the platform before attempting to connect.'
                    });
                    setNetworkingFailureModalVisible(true);
                    setMode('display');
                    setScanned(false);
                    return;
                }

                if (studentID === parsedData.networkID) {
                    setNetworkingFailureModalContent({
                        title: 'Invalid Scan Attempt',
                        subtitle: 'You cannot scan your own QR code. Networking requires connecting with other participants.'
                    });
                    setNetworkingFailureModalVisible(true);
                    setMode('display');
                    setScanned(false);
                    return;
                }

                if (eventID !== parsedData.eventID) {
                    setNetworkingFailureModalContent({
                        title: 'Event Mismatch',
                        subtitle: 'The scanned QR code belongs to a different event. Please ensure you are scanning a valid code for this event.'
                    });
                    setNetworkingFailureModalVisible(true);
                    setMode('display');
                    setScanned(false);
                    return;
                }

                if (!studentID) return;

                // Add User 1 (scanner) to User 2's (scanned user) network list
                await addUserToNetworkList(parsedData.networkID, studentID, eventID);

                const networkRef = collection(db, "network");
                const networkQuery = query(networkRef, where("studentID", "==", studentID));
                const networkSnap = await getDocs(networkQuery);

                let studentDocRef;

                if (networkSnap.empty) {
                    const newDocRef = await addDoc(networkRef, { studentID });
                    studentDocRef = doc(db, "network", newDocRef.id);

                    const newUserNetworkList = collection(studentDocRef, "networkList");

                    await addDoc(newUserNetworkList, {
                        eventID: parsedData.eventID,
                        networkID: parsedData.networkID,
                        scannedTime: serverTimestamp(),
                    });
                } else {
                    // Use exisitng document
                    studentDocRef = doc(db, "network", networkSnap.docs[0].id);

                    const existingUserNetworkListRef = collection(studentDocRef, "networkList");
                    const existingUserNetworkListSnap = await getDocs(existingUserNetworkListRef);

                    existingUserNetworkListSnap.forEach((userNetworkDoc) => {
                        userNetworkStudentIDList.push(userNetworkDoc.data().networkID);
                    })

                    const hasFoundNetwork = userNetworkStudentIDList.includes(parsedData.networkID);

                    if (hasFoundNetwork) {
                        setMode('display');
                        setScanned(false);
                        setScannedModalVisible(true);
                    } else {
                        await addDoc(existingUserNetworkListRef, {
                            eventID: parsedData.eventID,
                            networkID: parsedData.networkID,
                            scannedTime: serverTimestamp(),
                        });
                        updateQuestProgress(studentID);
                        updateBadgeProgress(studentID);
                        // Show beautiful success modal
                        scanFadeAnim.setValue(0);
                        scanScaleAnim.setValue(0.8);
                        scanCheckmarkScale.setValue(0);
                        scanCheckmarkOpacity.setValue(0);
                        scanProgressAnim.setValue(0);
                        setScanSuccessModalVisible(true);
                        if (Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                        Animated.parallel([
                            Animated.timing(scanFadeAnim, {
                                toValue: 1,
                                duration: 300,
                                useNativeDriver: true,
                                easing: Easing.out(Easing.cubic)
                            }),
                            Animated.timing(scanScaleAnim, {
                                toValue: 1,
                                duration: 350,
                                useNativeDriver: true,
                                easing: Easing.out(Easing.back(1.5))
                            })
                        ]).start();
                        setTimeout(() => {
                            Animated.sequence([
                                Animated.parallel([
                                    Animated.timing(scanCheckmarkOpacity, {
                                        toValue: 1,
                                        duration: 200,
                                        useNativeDriver: true
                                    }),
                                    Animated.timing(scanCheckmarkScale, {
                                        toValue: 1.2,
                                        duration: 300,
                                        useNativeDriver: true,
                                        easing: Easing.out(Easing.back(2))
                                    })
                                ]),
                                Animated.timing(scanCheckmarkScale, {
                                    toValue: 1,
                                    duration: 200,
                                    useNativeDriver: true,
                                    easing: Easing.inOut(Easing.ease)
                                })
                            ]).start();
                        }, 150);
                        Animated.timing(scanProgressAnim, {
                            toValue: 1,
                            duration: 2000,
                            useNativeDriver: false
                        }).start();
                        setTimeout(() => setScanSuccessModalVisible(false), 2000);
                    }
                }
            } else {
                setNetworkingFailureModalContent({
                    title: 'Invalid QR Code',
                    subtitle: 'The scanned QR code is missing required information. Please verify the code and try again.'
                });
                setNetworkingFailureModalVisible(true);
            }
        } catch (error) {
            setNetworkingFailureModalContent({
                title: 'Invalid QR Code',
                subtitle: 'The scanned QR code could not be processed due to missing or invalid data. Please try again with a valid code.'
            });
            setNetworkingFailureModalVisible(true);
        } finally {
            setMode('display');
            setScanned(false);
        }
    }

    const updateBadgeProgress = async (studentID) => {
        try {
            let networkBadge;
            let badgeProgressID;

            const networkBadgeQuery = query(collection(db, "badge"), where("badgeType", "==", selectedQuest.questType));
            const networkBadgeSnap = await getDocs(networkBadgeQuery);

            networkBadgeSnap.forEach((badge) => {
                networkBadge = {
                    id: badge.id,
                    ...badge.data(),
                }
            });

            const badgeProgressQuery = query(
                collection(db, "badgeProgress"),
                where("studentID", "==", studentID)
            );

            const badgeProgressSnap = await getDocs(badgeProgressQuery);

            badgeProgressSnap.forEach(async (badgeProgress) => {
                badgeProgressID = badgeProgress.id;

                const userNetworkBadgeRef = doc(db, "badgeProgress", badgeProgressID, "userBadgeProgress", networkBadge.id);
                const userNetworkBadgeSnap = await getDoc(userNetworkBadgeRef);

                if (userNetworkBadgeSnap.exists()) {
                    let userNetworkBadgeProgress = userNetworkBadgeSnap.data();

                    if (!userNetworkBadgeProgress.isUnlocked) {
                        let userProgress = userNetworkBadgeProgress.progress;

                        userProgress++;

                        if (userProgress === networkBadge.unlockProgress) {
                            await updateDoc(userNetworkBadgeRef, {
                                isUnlocked: true,
                                progress: increment(1),
                                dateUpdated: serverTimestamp()
                            });
                        } else {
                            await updateDoc(userNetworkBadgeRef, {
                                progress: increment(1),
                                dateUpdated: serverTimestamp()
                            });
                        }
                    }
                } else {
                    console.error("No user networking badge progress has been found");
                }
            })
        } catch (error) {
            console.log("Error when updating networking badge progress:", error);
        }
    }

    const updateQuestProgress = async (studentID) => {
        try {

            const questProgressQuery = query(collection(db, "questProgress"), where("eventID", "==", eventID), where("studentID", "==", studentID));
            const questProgressSnap = await getDocs(questProgressQuery);

            questProgressSnap.forEach(async (questProgress) => {
                const questProgressID = questProgress.id;

                const userQuestProgressRef = doc(db, "questProgress", questProgressID, "questProgressList", selectedQuest.id);

                let currentNetworkNum = selectedQuest.progress;

                currentNetworkNum++;

                if (currentNetworkNum == selectedQuest.completionNum) {
                    await updateDoc(userQuestProgressRef, {
                        isCompleted: true,
                        progress: increment(1),
                    })
                    setCompletedModalVisible(true);
                } else {
                    await updateDoc(userQuestProgressRef, {
                        progress: increment(1),
                    })
                }
            })
        } catch (error) {
            console.log("Error when updating networking quest progress:", error);
        }
    }

    const claimRewards = () => {
        setClaimed(true);
        setAnimatingDiamonds(true);

        // Reset animations
        diamondAnims.forEach(anim => {
            anim.translateX.setValue(0);
            anim.translateY.setValue(0);
            anim.scale.setValue(0.5);
            anim.opacity.setValue(1);
            anim.rotate.setValue(0);
        });

        pointAnims.forEach(anim => {
            anim.translateX.setValue(0);
            anim.translateY.setValue(0);
            anim.scale.setValue(0.5);
            anim.opacity.setValue(1);
            anim.rotate.setValue(0);
        });

        // Create animation sequence for diamonds
        diamondAnims.forEach((anim, index) => {
            const randomX = Math.random() * 300 - 10;
            const randomY = Math.random() * -300 - 100;
            const randomRotate = Math.random() * 360;

            Animated.sequence([
                Animated.delay(index * 50),
                Animated.parallel([
                    Animated.timing(anim.translateX, {
                        toValue: randomX,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.translateY, {
                        toValue: randomY,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.scale, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.rotate, {
                        toValue: randomRotate,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.delay(600),
                        Animated.timing(anim.opacity, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]).start();
        });

        pointAnims.forEach((anim, index) => {
            const randomX = Math.random() * 300 - 250;
            const randomY = Math.random() * -300 - 100;
            const randomRotate = Math.random() * 360;

            Animated.sequence([
                Animated.delay(index * 50),
                Animated.parallel([
                    Animated.timing(anim.translateX, {
                        toValue: randomX,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.translateY, {
                        toValue: randomY,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.scale, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.rotate, {
                        toValue: randomRotate,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.delay(600),
                        Animated.timing(anim.opacity, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]).start();
        });

        setTimeout(() => {
            setAnimatingDiamonds(false);
            updateDatabase();
        }, 1500);
    }

    const updateDatabase = async () => {
        try {
            const studentID = await getItem("studentID");
            const facultyID = await getItem("facultyID");
            if (!studentID && !facultyID) return;

            const studentRef = doc(db, "user", studentID);

            await updateDoc(studentRef, {
                diamonds: increment(selectedQuest.diamondsRewards),
                totalPointsGained: increment(selectedQuest.pointsRewards)
            });

            const leaderboardRef = collection(db, "leaderboard");
            const leaderboardQuery = query(leaderboardRef, where("facultyID", "==", facultyID));
            const leaderboardSnapshot = await getDocs(leaderboardQuery);

            for (const snapDoc of leaderboardSnapshot.docs) {
                const leaderboardID = snapDoc.id;
                const leaderboardEntryRef = collection(db, "leaderboard", leaderboardID, "leaderboardEntries");
                const leaderboardEntryQuery = query(leaderboardEntryRef, where("studentID", "==", studentID));
                const leaderboardEntrySnapshot = await getDocs(leaderboardEntryQuery);

                if (leaderboardEntrySnapshot.empty) {
                    // 🔹 Create a new leaderboard entry
                    const newEntryRef = doc(leaderboardEntryRef); // Auto-generate ID
                    await setDoc(newEntryRef, {
                        studentID: studentID,
                        points: selectedQuest.pointsRewards,
                        lastUpdated: new Date(),
                    });
                    console.log("New leaderboard entry created.");
                } else {
                    // 🔹 Update existing entry
                    const existingEntryDoc = leaderboardEntrySnapshot.docs[0]; // Get first matched entry
                    const existingEntryRef = doc(db, "leaderboard", leaderboardID, "leaderboardEntries", existingEntryDoc.id);

                    await updateDoc(existingEntryRef, {
                        points: increment(selectedQuest.pointsRewards),
                        lastUpdated: new Date(),
                    });
                    console.log("Leaderboard entry updated.");
                }
            }

            updateQuestStatus();
        } catch (error) {
            console.error("Error when adding points and diamonds to Firebase:", error)
        }
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading quest...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Quest Title */}
            <Text style={styles.title}>{selectedQuest.questName}</Text>

            {/* Quest Description */}
            <Text style={styles.description}>{selectedQuest.description}</Text>

            {/* Network Counter */}
            <View style={styles.networkContainer}>
                <View style={styles.networkCard}>
                    <View style={styles.progressBarContainer}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${networkPercentage}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.networkText}>
                        <Text style={styles.currentNetworkNumber}>{selectedQuest.progress}</Text>
                        <Text style={styles.slashText}> / </Text>
                        <Text style={styles.requiredNetworkNumber}>{selectedQuest.completionNum}</Text>
                    </Text>
                    <Text style={styles.networkLabel}>Networks Made</Text>
                </View>
            </View>

            <View style={styles.networkContainer}>
                <View style={styles.networkCard}>
                    {mode === 'display' ? renderDisplayMode() : renderScanMode()}
                </View>
            </View>

            {/* Rewards Section */}
            <View style={styles.rewardsSection}>
                <Text style={styles.cardTitle}>Rewards</Text>
                <View style={styles.rewardsContainer}>
                    <View style={styles.rewardItem}>
                        <View style={styles.iconContainer}>
                            <Image source={require("../../assets/icons/diamond.png")} style={styles.iconImage} />
                        </View>
                        <View style={styles.rewardTextContainer}>
                            <Text style={styles.rewardValue}>{selectedQuest.diamondsRewards}</Text>
                            <Text style={styles.rewardType}>diamonds</Text>
                        </View>
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.rewardItem}>
                        <View style={[styles.iconContainer, styles.pointsIconContainer]}>
                            <Image source={require("../../assets/icons/point.png")} style={styles.iconImage} />
                        </View>
                        <View style={styles.rewardTextContainer}>
                            <Text style={styles.rewardValue}>{selectedQuest.pointsRewards}</Text>
                            <Text style={styles.rewardType}>points</Text>
                        </View>
                    </View>
                </View>
            </View>

            {!selectedQuest.isCompleted && (mode === 'scan' ? (
                <TouchableOpacity style={[styles.showQRButton, { marginBottom: 5 }]} onPress={() => setMode('display')}>
                    <Text style={styles.showQRButtonText}>Show My Network QR</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={[styles.showQRButton, { marginBottom: 5 }]} onPress={() => setMode('scan')}>
                    <Text style={styles.showQRButtonText}>Scan Other Participant's QR</Text>
                </TouchableOpacity>
            ))}

            {!selectedQuest.rewardsClaimed && selectedQuest.progress === selectedQuest.completionNum && selectedQuest.isCompleted && (
                <TouchableOpacity
                    style={[styles.rewardsButton, { marginBottom: 5 }, claimed && styles.claimedButton]}
                    disabled={claimed}
                    onPress={claimRewards}
                >
                    <Text style={styles.rewardsButtonText}>Claim Rewards</Text>
                </TouchableOpacity>
            )}

            {/* Animated diamonds */}
            {diamondAnims.map((anim, index) => (
                <Animated.View
                    key={`diamond-${index}`}
                    style={[
                        styles.animatedDiamond,
                        {
                            transform: [
                                { translateX: anim.translateX },
                                { translateY: anim.translateY },
                                { scale: anim.scale },
                                {
                                    rotate: anim.rotate.interpolate({
                                        inputRange: [0, 360],
                                        outputRange: ['0deg', '360deg']
                                    })
                                },
                            ],
                            opacity: anim.opacity,
                        },
                    ]}
                >
                    <Image source={require('../../assets/icons/diamond.png')} style={styles.diamondImage} />
                </Animated.View>
            ))}

            {/* Animated diamonds */}
            {pointAnims.map((anim, index) => (
                <Animated.View
                    key={`diamond-${index}`}
                    style={[
                        styles.animatedPoint,
                        {
                            transform: [
                                { translateX: anim.translateX },
                                { translateY: anim.translateY },
                                { scale: anim.scale },
                                {
                                    rotate: anim.rotate.interpolate({
                                        inputRange: [0, 360],
                                        outputRange: ['0deg', '360deg']
                                    })
                                },
                            ],
                            opacity: anim.opacity,
                        },
                    ]}
                >
                    <Image source={require('../../assets/icons/point.png')} style={styles.pointImage} />
                </Animated.View>
            ))}

            {/* Cancel Button */}
            <TouchableOpacity style={[styles.cancelButton, { marginTop: 5 }]} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <NetworkScannedModal
                isVisible={scannedModalVisible}
                onClose={() => setScannedModalVisible(false)}
            />

            {completedModalVisible && (
                <QuestCompletedModal
                    isVisible={completedModalVisible}
                    onClose={() => setCompletedModalVisible(false)}
                    questName={selectedQuest.questName}
                    autoDismissTime={2000}
                />
            )}

            {networkingFailureModalVisible && (
                <NetworkingFailureModal
                    isVisible={networkingFailureModalVisible}
                    onClose={() => setNetworkingFailureModalVisible(false)}
                    title={networkingFailureModalContent.title}
                    subtitle={networkingFailureModalContent.subtitle}
                />
            )}

            {scanSuccessModalVisible && (
                <Modal
                    animationType="none"
                    transparent={true}
                    visible={scanSuccessModalVisible}
                    onRequestClose={() => setScanSuccessModalVisible(false)}
                    statusBarTranslucent
                >
                    <Animated.View 
                        style={[
                            styles.centeredView, 
                            { opacity: scanFadeAnim }
                        ]}
                        accessible={true}
                        accessibilityLabel="Networking scan successful modal"
                        accessibilityRole="alert"
                    >
                        <Animated.View 
                            style={[
                                styles.modalView, 
                                { 
                                    transform: [{ scale: scanScaleAnim }],
                                    opacity: scanFadeAnim 
                                }
                            ]}
                        >
                            <Animated.View style={{
                                transform: [{ scale: scanCheckmarkScale }],
                                opacity: scanCheckmarkOpacity
                            }}>
                                <View style={styles.iconBackground}>
                                    <Ionicons
                                        name="checkmark-circle"
                                        color="#4CAF50"
                                        size={80}
                                        style={styles.icon}
                                        accessibilityLabel="Check mark icon"
                                    />
                                </View>
                            </Animated.View>
                            <Text style={styles.titleText}>Networking Successful!</Text>
                            <Text style={styles.eventNameText}>
                                You are now connected!
                            </Text>
                            <View style={styles.animatedBar}>
                                <Animated.View 
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: scanProgressAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%']
                                            })
                                        }
                                    ]} 
                                />
                            </View>
                        </Animated.View>
                    </Animated.View>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 32,
        marginHorizontal: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#252A34',
    },
    description: {
        fontSize: 16,
        color: '#555',
        marginBottom: 24,
        lineHeight: 22,
    },
    networkContainer: {
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
    },
    networkCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E9ECEF',
        borderRadius: 4,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#5E96CE',
        borderRadius: 4,
    },
    networkText: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 4,
    },
    currentNetworkNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#5E96CE',
    },
    slashText: {
        color: '#888',
    },
    requiredNetworkNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#252A34',
    },
    networkLabel: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
    },
    rewardsSection: {
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#252A34',
    },
    rewardsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    rewardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#5E96CE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconImage: {
        width: 22,
        height: 22,
    },
    pointsIconContainer: {
        backgroundColor: '#FCA311',
    },
    rewardTextContainer: {
        flex: 1,
    },
    rewardValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#252A34',
    },
    rewardType: {
        fontSize: 14,
        color: '#777',
    },
    separator: {
        width: 1,
        height: '80%',
        backgroundColor: '#E9ECEF',
        marginHorizontal: 10,
    },
    submitButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#5E96CE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    submitButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    disabledSubmit: {
        backgroundColor: '#B0BEC5',
        opacity: 0.7,
    },
    rewardsButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#50A653',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    claimedButton: {
        backgroundColor: "#7e967f",
    },
    rewardsButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    cancelButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F1F3F5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    cancelButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        color: "#3b82f6"
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#1e3a8a',
    },
    animatedDiamond: {
        position: 'absolute',
        bottom: -30,
        left: 0,
        zIndex: 10,
    },
    diamondImage: {
        height: 22,
        width: 22,
        resizeMode: 'contain',
    },
    animatedPoint: {
        position: 'absolute',
        bottom: -30,
        right: 0,
        zIndex: 10,
    },
    pointImage: {
        height: 22,
        width: 22,
        resizeMode: 'contain',
    },
    scannerContainer: {
        width: "100%",
        aspectRatio: 1.5,
        overflow: 'hidden',
        borderRadius: 20,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    scanOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: '90%',
        height: '90%',
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 20,
    },
    scanModeContainer: {
        backgroundColor: '#F7F9FC',
        borderRadius: 16,
    },
    scanFrameBorder: {
        position: 'absolute',
        backgroundColor: 'white',
        width: 30,
        height: 4,
        borderRadius: 2,
    },
    scanFrameBorderHorizontal: {
        transform: [{ rotate: '90deg' }],
    },
    scanInstructions: {
        marginTop: 20,
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    permissionContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    permissionTitle: {
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
    },
    permissionDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    permissionButton: {
        width: '100%',
        maxWidth: 300,
        height: 40,
        backgroundColor: '#6200EE',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    permissionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    blurContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        overflow: 'hidden',
        paddingHorizontal: 10,
        paddingVertical: 5
    },
    qrContainer: {
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    profileInfoContainer: {
        width: '100%',
        alignItems: 'center',
    },
    nameText: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    academicInfo: {
        flexDirection: 'row',
        gap: 10,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    infoText: {
        fontSize: 14,
        color: '#000000',
        marginLeft: 5,
    },
    showQRButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#50A653',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    showQRButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    testQRSection: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderStyle: 'dashed',
    },
    testQRTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#495057',
        textAlign: 'center',
    },
    testQRSubtitle: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 12,
        textAlign: 'center',
    },
    testQRContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    testQRInfo: {
        fontSize: 12,
        color: '#6c757d',
        textAlign: 'center',
        marginBottom: 2,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20
    },
    modalView: {
        width: 340,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 6
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10
    },
    iconBackground: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    icon: {
        shadowColor: 'rgba(76, 175, 80, 0.5)',
        shadowOffset: {
            width: 0,
            height: 4
        },
        shadowOpacity: 0.5,
        shadowRadius: 8
    },
    titleText: {
        marginBottom: 16,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        letterSpacing: 0.5
    },
    eventNameText: {
        textAlign: 'center',
        fontSize: 18,
        lineHeight: 24,
        color: '#333',
        marginBottom: 24
    },
    animatedBar: {
        width: '100%',
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 8
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50'
    },
});

export default NetworkingQuestSheet;
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image } from 'react-native';
import { collection, setDoc, getDocs, increment, query, updateDoc, where, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebaseConfig';
import { getItem } from '../../utils/asyncStorage';
import Constants from 'expo-constants';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CryptoJS from 'react-native-crypto-js';
import * as Location from 'expo-location';
import QuestCompletedModal from '../Modal/QuestCompletedModal';
import { getDistance } from 'geolib';
import { Ionicons } from '@expo/vector-icons';
import AttendanceFailureModal from '../Modal/AttendanceFailureModal';

const EVENT_TYPE_MAPPING = {
    1: "academic",
    2: "volunteering",
    3: "entertainment",
    5: "sports",
    6: "health_wellness",
}

const NetworkingQuestSheet = ({ selectedQuest, onCancel, eventID, categoryID, latitude, longitude, updateQuestStatus, registrationID }) => {
    // Mode state: 'display' for showing QR, 'scan' for scanning QR
    const [mode, setMode] = useState('display');

    // Animation values
    const [animatingDiamonds, setAnimatingDiamonds] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [attendanceFailureModalVisible,setAttendanceFailureModalVisible] = useState(false);
    const [completedModalVisible, setCompletedModalVisible] = useState(false);
    const [attendanceFailureModalContent, setAttendanceFailureModalContent] = useState({
        title: '',
        subtitle: '',
    })

    // Camera, location and scanning states
    const [permission, requestPermission] = useCameraPermissions({
        message: 'We need access to your camera to scan QR codes and take photos.',
        title: 'Camera Access Required'
    });
    const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions({
        message: 'We need your location to verify your distance to the event location.',
        title: 'Location Access Needed'
    });
    const [scanned, setScanned] = useState(false);

    // Get encryption key
    const secretKey = Constants.expoConfig?.extra?.encryptionKey || 'UniEXP2025';

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
        (async () => {
            // Request camera and location permissions
            if (!permission?.granted) {
                await requestPermission();
            }

            if (!locationPermission?.granted) {
                await requestLocationPermission();
            }
        })();
    }, []);

    const handleBarCodeScanned = async ({ type, data }) => {
        setScanned(true);

        try {
            const decryptedBytes = CryptoJS.AES.decrypt(data, secretKey);
            const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
            const parsedData = JSON.parse(decryptedText);

            if (!parsedData.eventID && !parsedData.timestamp) {
                setMode('display');
                setScanned(false);
                throw new Error('Invalid QR Code');
            }

            if (parsedData.eventID != eventID) {
                setMode('display');
                setScanned(false);
                throw new Error('Owh no... You scanned the wrong event attendance QR code');
            }

            const currentTimestamp = new Date().getTime();
            const timestampDifference = currentTimestamp - parsedData.timestamp;

            if (timestampDifference <= 5000) {
                const location = await Location.getCurrentPositionAsync({});

                const distance = getDistance(
                    {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    },
                    {
                        latitude: latitude,
                        longitude: longitude,
                    }
                );

                if (distance <= 150) {
                    const registrationRef = doc(db, "registration", registrationID);
                    const registrationSnap = await getDoc(registrationRef);

                    if (registrationSnap.exists()) {
                        await updateDoc(registrationRef, {
                            isAttended: true,
                            attendanceScannedTime: serverTimestamp(),
                        })
                    } else {
                        console.log("No such registration exists");
                    }

                    const studentID = await getItem("studentID");

                    updateQuestProgress(studentID);

                    if (EVENT_TYPE_MAPPING.hasOwnProperty(categoryID)) {
                        updateBadgeProgress(studentID);
                    }
                } else {
                    console.log("The user is too far away from the event location.");
                    setAttendanceFailureModalContent({
                        title: 'Distance Denied!',
                        subtitle: 'Halt, valiant warrior! Your current position is too far from the quest zone. Teleport closer or prepare for an epic trek! 🗺️'
                    });
                    setAttendanceFailureModalVisible(true);
                }
            } else {
                setAttendanceFailureModalContent({
                    title: "Time Warp Warning!",
                    subtitle: "Whoa, brave adventurer! The QR code has expired! 🕰️"
                });
                setAttendanceFailureModalVisible(true);
            }
            setScanned(false);
            setMode('display');
        } catch (error) {
            console.error('Error processing QR code:', error);
            setAttendanceFailureModalContent({
                title: "Oops, Invalid QR Code!",
                subtitle: "Looks like your QR scroll got a bit wonky. Please try again! 🕹️"
              });
            setAttendanceFailureModalVisible(true);
        }
    }

    const updateQuestProgress = async (studentID) => {
        try {
            const questProgressQuery = query(collection(db, "questProgress"), where("eventID", "==", eventID), where("studentID", "==", studentID));
            const questProgressSnap = await getDocs(questProgressQuery);

            questProgressSnap.forEach(async (questProgress) => {
                const questProgressID = questProgress.id;

                const userQuestProgressRef = doc(db, "questProgress", questProgressID, "questProgressList", selectedQuest.id);

                await updateDoc(userQuestProgressRef, {
                    isCompleted: true,
                    progress: increment(1),
                })
                setCompletedModalVisible(true);
            })
        } catch (error) {
            console.log("Error when updating networking quest progress:", error);
        }
    }

    const updateBadgeProgress = async (studentID) => {
        try {
            let eventBadge;
            let badgeProgressID;

            const eventBadgeQuery = query(collection(db, "badge"), where("badgeType", "==", EVENT_TYPE_MAPPING[categoryID]));
            const eventBadgeSnap = await getDocs(eventBadgeQuery);

            eventBadgeSnap.forEach((badge) => {
                eventBadge = {
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

                const userEventBadgeRef = doc(db, "badgeProgress", badgeProgressID, "userBadgeProgress", eventBadge.id);
                const userEventBadgeSnap = await getDoc(userEventBadgeRef);

                if (userEventBadgeSnap.exists()) {
                    let userEventBadgeProgress = userEventBadgeSnap.data();

                    if (!userEventBadgeProgress.isUnlocked) {
                        let userProgress = userEventBadgeProgress.progress;

                        userProgress++;

                        if (userProgress === eventBadge.unlockProgress) {
                            await updateDoc(userEventBadgeRef, {
                                isUnlocked: true,
                                progress: increment(1),
                                dateUpdated: serverTimestamp()
                            });
                        } else {
                            await updateDoc(userEventBadgeRef, {
                                progress: increment(1),
                                dateUpdated: serverTimestamp()
                            });
                        }
                    }
                } else {
                    console.error(`No user ${EVENT_TYPE_MAPPING(categoryID)} badge progress has been found`);
                }
            })
        } catch (error) {
            console.log(`Error when updating ${EVENT_TYPE_MAPPING(categoryID)} badge progress:`, error);
        }
    }

    const claimRewards = () => {
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
                diamonds: increment(selectedQuest.diamondsRewards)
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


    const renderDisplayMode = () => {
        return (
            <View style={styles.contentWrapper}>
                <View style={styles.cameraIconContainer}>
                    <Ionicons
                        name='camera-sharp'
                        size={40}
                        color="#4A4A4A"
                    />
                </View>
                <Text style={styles.instructionText}>
                    Scan Event QR Code
                </Text>
                <Text style={styles.subtitleText}>
                    Tap the button below to mark your attendance
                </Text>
            </View>
        )
    }

    const renderScanMode = () => {
        return (
            <View>
                {!locationPermission?.granted ? (
                    <View style={styles.permissionContainer}>
                        <Text style={styles.permissionTitle}>
                            Location permission is required to proceed
                        </Text>
                        <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={requestLocationPermission}
                        >
                            <Text style={styles.permissionButtonText}>
                                Grant Location Permission
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : !permission?.granted ? (
                    <View style={styles.permissionContainer}>
                        <Text style={styles.permissionTitle}>
                            Camera permission is required to scan QR codes
                        </Text>
                        <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={requestPermission}
                        >
                            <Text style={styles.permissionButtonText}>
                                Grant Camera Permission
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

            {!selectedQuest.isCompleted && (
                <View style={styles.attendanceContainer}>
                    <View style={styles.attendanceCard}>
                        {mode === 'display' ? renderDisplayMode() : renderScanMode()}
                    </View>
                </View>
            )}

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
                    <Text style={styles.showQRButtonText}>Close QR Scanner </Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={[styles.showQRButton, { marginBottom: 5 }]} onPress={() => setMode('scan')}>
                    <Text style={styles.showQRButtonText}>Scan Attendance QR</Text>
                </TouchableOpacity>
            ))}

            {!selectedQuest.rewardsClaimed && selectedQuest.progress === selectedQuest.completionNum && selectedQuest.isCompleted && (
                <TouchableOpacity
                    style={[styles.rewardsButton, { marginBottom: 5 }, animatingDiamonds && styles.claimedButton]}
                    disabled={animatingDiamonds}
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

            {completedModalVisible && (
                <QuestCompletedModal
                    isVisible={completedModalVisible}
                    onClose={() => setCompletedModalVisible(false)}
                    questName={selectedQuest.questName}
                    autoDismissTime={2000}
                />
            )}

            {attendanceFailureModalVisible && (
                <AttendanceFailureModal
                    isVisible={attendanceFailureModalVisible}
                    onClose={() => setAttendanceFailureModalVisible(false)}
                    title={attendanceFailureModalContent.title}
                    subtitle={attendanceFailureModalContent.subtitle}
                />
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
    attendanceContainer: {
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
    },
    attendanceCard: {
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
    contentWrapper: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    cameraIconContainer: {
        backgroundColor: '#F0F0F0',
        borderRadius: 50,
        padding: 16,
        marginBottom: 16,
    },
    instructionText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitleText: {
        fontSize: 14,
        color: '#6A6A6A',
        textAlign: 'center',
        lineHeight: 20,
    }
});

export default NetworkingQuestSheet;
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image } from 'react-native';
import { collection, setDoc, getDocs, increment, query, updateDoc, where, getDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebaseConfig';
import { getItem } from '../../utils/asyncStorage';
import Constants from 'expo-constants';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import CryptoJS from 'react-native-crypto-js';
import NetworkScannedModal from '../Modal/NetworkScannedModal';
import QuestCompletedModal from '../Modal/QuestCompleteModal';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

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

    // Camera and scanning states
    const [permission, requestPermission] = useCameraPermissions();
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
        setIsLoading(true);
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

            // console.log(studentData);

            setUserDetails(studentData);
        } catch (error) {
            console.error("Error when fetching user details:", error);
            setUserDetails({});
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

        // console.log(data);

        try {
            const decryptedBytes = CryptoJS.AES.decrypt(data, secretKey);
            const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
            const parsedData = JSON.parse(decryptedText);

            if (parsedData.networkID && parsedData.eventID) {
                const studentID = await getItem("studentID");
                if (!studentID) return;

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
                    console.log("New network document created.");
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
                        console.log("New network added successfully.");
                        // Error here
                        updateQuestProgress(studentID);
                        updateBadgeProgress(studentID);
                        setMode('display');
                        setScanned(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing QR code:', error);
            Alert.alert('Error', 'Invalid QR code. Please try again.');
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

            console.log(questProgressSnap.empty);
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
            // addDiamondsToDatabase();
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

            leaderboardSnapshot.forEach(async (snapDoc) => {
                const leaderboardID = snapDoc.id;

                const leaderboardEntryRef = collection(db, "leaderboard", leaderboardID, "leaderboardEntries");
                const leaderboardEntryQuery = query(leaderboardEntryRef, where("studentID", "==", studentID));
                const leaderboardEntrySnapshot = await getDocs(leaderboardEntryQuery);

                if (leaderboardEntrySnapshot.empty) {
                    // 🔹 No entry exists, create a new one
                    const newEntryRef = doc(leaderboardEntryRef); // Auto-generate ID
                    await setDoc(newEntryRef, {
                        studentID: studentID,
                        points: selectedQuest.pointsRewards, // Initial points for the new student
                        lastUpdated: new Date(),
                    });
                    console.log("New leaderboard entry created.");
                } else {
                    // 🔹 Entry exists, update the points
                    const existingEntryDoc = leaderboardEntrySnapshot.docs[0]; // Get the first match
                    const existingEntryRef = doc(db, "leaderboard", leaderboardID, "leaderboardEntries", existingEntryDoc.id);

                    const existingEntrySnap = await getDoc(existingEntryRef);

                    console.log(existingEntrySnap.data());

                    await updateDoc(existingEntryRef, {
                        points: increment(selectedQuest.pointsRewards), // Increment points
                        lastUpdated: new Date(),
                    });
                    console.log("Leaderboard entry updated.");
                }
            });

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
                        <Text style={styles.showQRButtonText}>Scan Other's QR</Text>
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
});

export default NetworkingQuestSheet;
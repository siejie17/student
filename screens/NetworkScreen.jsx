import { View, Text, ActivityIndicator, StyleSheet, Animated, ImageBackground, TouchableOpacity, FlatList } from 'react-native'
import React, { useEffect, useState } from 'react';
import { Entypo } from '@expo/vector-icons';
import { getItem } from '../utils/asyncStorage';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import NetworkCard from '../components/Network/NetworkCard';
import EmptyNetworkState from '../components/Network/EmptyNetworkState';

const NetworkScreen = () => {
    const [networks, setNetworks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const animatedValues = networks.map(() => new Animated.Value(0.95));

    const navigation = useNavigation();

    useEffect(() => {
        const fetchUserNetworks = async () => {
            try {
                setIsLoading(true);
                const studentID = await getItem("studentID");

                const networkQuery = query(
                    collection(db, "network"),
                    where("studentID", "==", studentID)
                );

                const networkSnap = await getDocs(networkQuery);

                if (networkSnap.empty) {
                    console.log("No network found for this student.");
                    setNetworks([]);
                    return;
                }

                const networkDoc = networkSnap.docs[0];
                const networkListRef = collection(networkDoc.ref, "networkList");

                const networkListSnap = await getDocs(networkListRef);
                if (networkListSnap.empty) {
                    console.log("No network list records found.");
                    setNetworks([]);
                    return;
                }

                const networkListDocs = networkListSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const networkListDetailsPromises = networkListDocs.map(async (network) => {
                    const userRef = doc(db, "user", network.networkID);
                    const userSnap = await getDoc(userRef);

                    const eventRef = doc(db, "event", network.eventID);
                    const eventSnap = await getDoc(eventRef);

                    return (userSnap.exists() && eventSnap.exists())
                        ? {
                            id: network.id,
                            networkName: userSnap.data().firstName + " " + userSnap.data().lastName,
                            yearOfStudy: userSnap.data().yearOfStudy,
                            facultyID: userSnap.data().facultyID,
                            profilePic: userSnap.data().profilePicture,
                            eventName: eventSnap.data().eventName,
                            scannedTime: network.scannedTime,
                        }
                        : null;
                });

                const resolvedNetworkList = (await Promise.all(networkListDetailsPromises)).filter(Boolean);

                setNetworks(resolvedNetworkList);
            } catch (error) {
                console.error("Error when fetching network information,", error);
                setNetworks([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchUserNetworks();
    }, []);

    useEffect(() => {
        const animations = networks.map((_, index) => {
            return Animated.spring(animatedValues[index], {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
                delay: index * 100,
            });
        });
        
        Animated.stagger(100, animations).start();
    }, [networks]);

    const handleCardPress = (index) => {
        // Create bubble animation effect on press
        Animated.sequence([
            Animated.timing(animatedValues[index], {
                toValue: 1.05,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(animatedValues[index], {
                toValue: 1,
                tension: 50,
                friction: 5,
                useNativeDriver: true,
            }),
        ]).start();
    }

    const renderNetworkCard = (item, index) => {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleCardPress(index)}
            >
                <NetworkCard
                    item={item}
                    index={index}
                    animatedValues={animatedValues}
                />
            </TouchableOpacity>
        )
    }

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#415881" />
                    <Text style={styles.loadingText}>Loading networks...</Text>
                </View>
            </View>
        );
    }

    return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Entypo name="chevron-left" size={24} color="#000" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Networks</Text>
                    </View>
                </View>

                <View style={styles.promptContainer}>
                    <Text style={styles.promptText}>Explore all the connections you've made by scanning QR codes at various events around campus.</Text>
                </View>

                <FlatList
                    data={networks}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.cardList, 
                        networks.length === 0 && styles.emptyListContainer
                    ]}
                    renderItem={({ item, index }) => renderNetworkCard(item, index)}
                    ListEmptyComponent={
                        <EmptyNetworkState />
                    }
                />
            </View>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        backgroundColor: "transparent",
    },
    container: {
        flex: 1,
        backgroundColor: "white"
    },
    header: {
        flexDirection: "row",
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
    },
    promptContainer: {
        backgroundColor: '#EFF8FF',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginHorizontal: 16,
        marginVertical: 12,
    },
    promptText: {
        fontSize: 13,
        fontStyle: "italic",
        color: '#455B7C',
        justifyContent: "center",
        textAlign: "center",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#415881',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(165, 165, 165, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardList: {
        padding: 12,
    },
    emptyListContainer: {
        flexGrow: 1,
    },
});

export default NetworkScreen;
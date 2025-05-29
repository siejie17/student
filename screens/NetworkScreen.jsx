import { View, Text, ActivityIndicator, StyleSheet, Animated, TouchableOpacity, FlatList } from 'react-native';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Entypo } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

import { db } from '../utils/firebaseConfig';
import { getItem } from '../utils/asyncStorage';

import NetworkCard from '../components/Network/NetworkCard';
import EmptyNetworkState from '../components/Network/EmptyNetworkState';
import SearchBar from '../components/EventListing/SearchBar';

const ITEMS_PER_PAGE = 5; // Number of items to load per page

const NetworkScreen = () => {
    const [networks, setNetworks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const listenersRef = useRef([]);

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

                // Cancel any existing listeners before setting new ones
                listenersRef.current.forEach(unsub => unsub());
                listenersRef.current = [];

                const networkListDetailsPromises = networkListDocs.map(async (network) => {
                    const userRef = doc(db, "user", network.networkID);
                    const userSnap = await getDoc(userRef);

                    const eventRef = doc(db, "event", network.eventID);
                    const eventSnap = await getDoc(eventRef);

                    if (!userSnap.exists() || !eventSnap.exists()) return null;

                    // Create chat document ID by sorting and joining IDs
                    const sortedIds = [studentID, network.networkID].sort();
                    const chatDocId = sortedIds.join('_');
                    const chatRef = doc(db, "chats", chatDocId);
                    const messagesRef = collection(chatRef, "messages");

                    // Initial unread check
                    const messagesQuery = query(
                        messagesRef,
                        where("senderID", "==", network.networkID),
                        where("read", "==", false)
                    );
                    const messagesSnap = await getDocs(messagesQuery);
                    const hasUnread = !messagesSnap.empty;

                    const newNetwork = {
                        id: network.id,
                        studentID: userSnap.id,
                        networkName: `${userSnap.data().firstName} ${userSnap.data().lastName}`,
                        yearOfStudy: userSnap.data().yearOfStudy,
                        facultyID: userSnap.data().facultyID,
                        profilePic: userSnap.data().profilePicture,
                        eventName: eventSnap.data().eventName,
                        scannedTime: network.scannedTime,
                        hasUnread: hasUnread
                    };

                    // Set up real-time listener
                    const unsub = onSnapshot(
                        query(messagesRef, where("senderID", "==", network.networkID), where("read", "==", false)),
                        (snapshot) => {
                            const newHasUnread = !snapshot.empty;
                            setNetworks(prev =>
                                prev
                                    .map(n => n.id === newNetwork.id
                                        ? { ...n, hasUnread: newHasUnread }
                                        : n
                                    )
                                    .sort((a, b) => {
                                        if (a.hasUnread && !b.hasUnread) return -1;
                                        if (!a.hasUnread && b.hasUnread) return 1;
                                        return 0;
                                    })
                            );
                        }
                    );

                    listenersRef.current.push(unsub);

                    return newNetwork;
                });

                const resolvedNetworkList = (await Promise.all(networkListDetailsPromises)).filter(Boolean);

                resolvedNetworkList.sort((a, b) => {
                    if (a.hasUnread && !b.hasUnread) return -1;
                    if (!a.hasUnread && b.hasUnread) return 1;
                    return 0;
                });

                setTotalItems(resolvedNetworkList.length);
                setTotalPages(Math.ceil(resolvedNetworkList.length / ITEMS_PER_PAGE));
                setNetworks(resolvedNetworkList);
            } catch (error) {
                console.error("Error when fetching network information,", error);
                setNetworks([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchUserNetworks();

        // Cleanup function to remove all listeners
        return () => {
            listenersRef.current.forEach(unsub => unsub());
            listenersRef.current = [];
        };
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

    const handleNetworkCardPress = (item, index) => {
        handleCardPress(index);
        navigation.navigate("Messaging", { studentID: item.studentID, fullName: item.networkName, profilePic: item.profilePic });
    }

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handlePageChange = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const PageSelector = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <View style={styles.paginationContainer}>
                <TouchableOpacity
                    style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                    onPress={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                >
                    <Text style={styles.pageButtonText}>{"<<"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                    onPress={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <Text style={styles.pageButtonText}>{"<"}</Text>
                </TouchableOpacity>

                {startPage > 1 && (
                    <Text style={styles.pageEllipsis}>...</Text>
                )}

                {pageNumbers.map(number => (
                    <TouchableOpacity
                        key={number}
                        style={[
                            styles.pageButton,
                            currentPage === number && styles.pageButtonActive
                        ]}
                        onPress={() => handlePageChange(number)}
                    >
                        <Text style={[
                            styles.pageButtonText,
                            currentPage === number && styles.pageButtonTextActive
                        ]}>
                            {number}
                        </Text>
                    </TouchableOpacity>
                ))}

                {endPage < totalPages && (
                    <Text style={styles.pageEllipsis}>...</Text>
                )}

                <TouchableOpacity
                    style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                    onPress={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <Text style={styles.pageButtonText}>{">"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                    onPress={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    <Text style={styles.pageButtonText}>{">>"}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const filteredAndPaginatedNetworks = useMemo(() => {
        let filtered = networks;

        if (searchQuery.trim()) {
            filtered = filtered.filter(item =>
                item.networkName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.eventName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;

        return filtered.slice(startIndex, endIndex);
    }, [networks, searchQuery, currentPage]);

    const renderNetworkCard = (item, index) => {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleNetworkCardPress(item, index)}
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

            <SearchBar
                onSearch={handleSearch}
                placeholder="Search networks..."
                style={styles.searchBar}
            />

            <View style={styles.promptContainer}>
                <Text style={styles.promptText}>Explore all the connections you've made by scanning QR codes at various events around campus.</Text>
            </View>

            <FlatList
                data={filteredAndPaginatedNetworks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.cardList,
                    filteredAndPaginatedNetworks.length === 0 && styles.emptyListContainer
                ]}
                renderItem={({ item, index }) => renderNetworkCard(item, index)}
                ListEmptyComponent={
                    <EmptyNetworkState />
                }
            />
            {filteredAndPaginatedNetworks.length > 0 && totalPages > 1 && <PageSelector />}
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
    searchBar: {
        marginBottom: 5,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    pageButton: {
        minWidth: 35,
        height: 35,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        backgroundColor: '#f5f5f5',
    },
    pageButtonActive: {
        backgroundColor: '#6284bf',
    },
    pageButtonDisabled: {
        backgroundColor: '#f5f5f5',
        opacity: 0.5,
    },
    pageButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    pageButtonTextActive: {
        color: 'white',
    },
    pageEllipsis: {
        marginHorizontal: 8,
        color: '#666',
    },
});

export default NetworkScreen;
import { View, Text, ActivityIndicator, StyleSheet, Animated, TouchableOpacity, FlatList, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Entypo } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { db } from '../utils/firebaseConfig';
import { getItem } from '../utils/asyncStorage';

import NetworkCard from '../components/Network/NetworkCard';
import EmptyNetworkState from '../components/Network/EmptyNetworkState';
import SearchBar from '../components/EventListing/SearchBar';

const ITEMS_PER_PAGE = 5; // Number of items to load per page

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
};

const CATEGORIES = [
    "All",
    "Academic",
    "Volunteering",
    "Entertainment",
    "Cultural",
    "Sports",
    "Health & Wellness",
    "Others"
];

const CATEGORIES_MAPPING = {
    1: "Academic",
    2: "Volunteering",
    3: "Entertainment",
    4: "Cultural",
    5: "Sports",
    6: "Health & Wellness",
    7: "Others",
    "Not Available": "None",
    "N/A": "None",
};

const NetworkScreen = () => {
    const [networks, setNetworks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('All');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const flatListRef = useRef(null);

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

                listenersRef.current.forEach(unsub => unsub());
                listenersRef.current = [];

                const networkListDetailsPromises = networkListDocs.map(async (network) => {
                    const userRef = doc(db, "user", network.networkID);
                    const userSnap = await getDoc(userRef);

                    const eventRef = doc(db, "event", network.eventID);
                    const eventSnap = await getDoc(eventRef);

                    if (!userSnap.exists() || !eventSnap.exists()) return null;

                    const sortedIds = [studentID, network.networkID].sort();
                    const chatDocId = sortedIds.join('_');
                    const chatRef = doc(db, "chats", chatDocId);
                    const messagesRef = collection(chatRef, "messages");

                    let lastAttendedEventName = "Not Available";
                    let lastAttendedEventCategory = "Not Available";

                    const lastAttendedEventQuery = query(
                        collection(db, "registration"),
                        where("studentID", "==", network.networkID),
                        where("isAttended", "==", true),
                        orderBy("attendanceScannedTime", "desc"),
                        limit(1)
                    );
                    const lastAttendedEventSnap = await getDocs(lastAttendedEventQuery);

                    if (!lastAttendedEventSnap.empty) {
                        const lastEventDoc = lastAttendedEventSnap.docs[0];
                        const lastEventID = lastEventDoc.data().eventID;

                        const lastEventRef = doc(db, "event", lastEventID);
                        const lastEventSnap = await getDoc(lastEventRef);
                        if (lastEventSnap.exists()) {
                            lastAttendedEventName = lastEventSnap.data().eventName || "Not Available";
                            lastAttendedEventCategory = lastEventSnap.data().category || "Not Available";
                        }
                    }

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
                        hobbies: userSnap.data().hobbies,
                        lastAttendedEventName,
                        lastAttendedEventCategory,
                        eventName: eventSnap.data().eventName,
                        scannedTime: network.scannedTime,
                        hasUnread: hasUnread
                    };

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

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleCardPress = (index) => {
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
    };

    const handleNetworkCardPress = (item, index) => {
        handleCardPress(index);
        navigation.navigate("Messaging", { studentID: item.studentID, fullName: item.networkName, profilePic: item.profilePic, hobbies: item.hobbies, lastAttendedEventName: item.lastAttendedEventName, yearOfStudy: item.yearOfStudy, faculty: FACULTY_MAPPING[item.facultyID], connectedAt: item.eventName });
    };

    const filteredNetworks = useMemo(() => {
        let filtered = networks;
        // Explicit filtering by category
        if (selectedCategory === 'None') {
            filtered = filtered.filter(item =>
                CATEGORIES_MAPPING[item.lastAttendedEventCategory] === 'None' ||
                item.lastAttendedEventCategory === 'N/A'
            );
        } else if (selectedCategory !== 'All') {
            filtered = filtered.filter(item =>
                CATEGORIES_MAPPING[item.lastAttendedEventCategory] === selectedCategory ||
                item.lastAttendedEventCategory === selectedCategory
            );
        }
        // Search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(item =>
                item.networkName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (Array.isArray(item.hobbies) && item.hobbies.some(hobby => hobby.toLowerCase().includes(searchQuery.toLowerCase())))
            );
        }
        return filtered;
    }, [networks, searchQuery, selectedCategory]);

    const filteredAndPaginatedNetworks = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredNetworks.slice(startIndex, endIndex);
    }, [filteredNetworks, currentPage]);

    const handleCategoryPress = useCallback((category) => {
        setSelectedCategory(category);
        // Refresh animations when category changes
        fadeAnim.setValue(0);
        slideAnim.setValue(50);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start();
    }, [fadeAnim, slideAnim]);

    const renderCategoryItem = useCallback(({ item }) => {
        const isSelected = selectedCategory === item;
        return (
            <TouchableOpacity onPress={() => handleCategoryPress(item)} activeOpacity={0.7}>
                <LinearGradient
                    colors={isSelected ? ['#3f6bc4', '#6d93e3'] : ['#FFFFFF', '#F8F8F8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                >
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                        {item}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    }, [selectedCategory, handleCategoryPress]);

    const renderNetworkCard = (item, index) => (
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleNetworkCardPress(item, index)}>
            <NetworkCard item={item} index={index} animatedValues={animatedValues} />
        </TouchableOpacity>
    );

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
                    onPress={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                >
                    <Text style={styles.pageButtonText}>{"<<"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                    onPress={() => setCurrentPage(currentPage - 1)}
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
                        onPress={() => setCurrentPage(number)}
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
                    onPress={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <Text style={styles.pageButtonText}>{">"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                    onPress={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    <Text style={styles.pageButtonText}>{">>"}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Custom empty state for category
    const CategoryEmptyComponent = (
        <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={70} color="#CCCCCC" />
            <Text style={styles.emptyText}>No one has attended this category of event recently</Text>
            <Text style={styles.emptySubText}>Try selecting a different category or check back later.</Text>
        </View>
    );

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
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Entypo name="chevron-left" size={24} color="#000" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Networks</Text>
                        </View>
                    </View>

                    <SearchBar onSearch={handleSearch} placeholder="Search networks by name or hobby..." style={styles.searchBar} />

                    <View style={styles.categoryLabelContainer}>
                        <Text style={styles.categoryLabel}>Filter networks by last attended event category</Text>
                    </View>

                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={CATEGORIES}
                        renderItem={renderCategoryItem}
                        keyExtractor={item => item}
                        contentContainerStyle={styles.categoriesList}
                    />
                </View>
            </TouchableWithoutFeedback>

            <View style={styles.promptContainer}>
                <Text style={styles.promptText}>
                    Explore all the connections you've made by scanning QR codes at various events around campus.
                </Text>
            </View>

            <View style={{ flex: 1, paddingBottom: 80 }}>
                <FlatList
                    data={filteredAndPaginatedNetworks}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.cardList,
                        filteredAndPaginatedNetworks.length === 0 && styles.emptyListContainer
                    ]}
                    renderItem={({ item, index }) => renderNetworkCard(item, index)}
                    ListEmptyComponent={
                        selectedCategory !== 'All' && filteredNetworks.length === 0
                            ? CategoryEmptyComponent
                            : <EmptyNetworkState />
                    }
                />
            </View>

            {filteredNetworks.length > ITEMS_PER_PAGE && (
                <View style={styles.floatingPaginationContainer}>
                    <PageSelector />
                </View>
            )}
        </View>
    );
};

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
        marginTop: 8,
        marginBottom: 12,
        alignItems: 'flex-start', // Left align
    },
    promptText: {
        fontSize: 13,
        fontStyle: "italic",
        color: '#455B7C',
        textAlign: "left", // Left align
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
    categoryLabelContainer: {
        paddingHorizontal: 20,
        paddingBottom: 4,
    },
    categoryLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: 'white',
        borderRadius: 25,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    pageButton: {
        minWidth: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
        backgroundColor: '#f5f5f5',
    },
    pageButtonActive: {
        backgroundColor: '#3f6bc4',
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
    categoriesList: {
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
    },
    categoryItem: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        marginRight: 12,
        borderRadius: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    categoryItemSelected: {
        elevation: 4,
        shadowOpacity: 0.2,
    },
    categoryText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    categoryTextSelected: {
        color: '#fff',
    },
    floatingPaginationContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
    },
    emptyContainer: {
        display: 'flex',
        flex: 1,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 22,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
    },
});

export default NetworkScreen;
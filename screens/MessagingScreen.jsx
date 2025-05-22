import { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
    Animated,
} from 'react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons, Ionicons, Entypo } from '@expo/vector-icons';
import { auth, db } from '../utils/firebaseConfig';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

const MessagingScreen = ({ navigation, route }) => {
    const { studentID, fullName, profilePic } = route.params;

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    const getChatID = () => {
        return [studentID, auth.currentUser.uid].sort().join("_");
    }

    const chatID = getChatID(studentID, auth.currentUser.uid);

    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef();
    const typingAnimation = useRef(new Animated.Value(0)).current;
    const messageInputAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const messagesRef = collection(db, 'chats', chatID, 'messages');
        const chatRef = doc(db, 'chats', chatID);

        const unsubscribe = onSnapshot(chatRef, async (chatDoc) => {
            if (!chatDoc.exists()) {
                setMessages([]);
                return;
            }

            // Mark unread messages as read
            const unreadQuery = query(messagesRef, where('read', '==', false));
            const unreadSnapshot = await getDocs(unreadQuery);

            const unreadMessages = unreadSnapshot.docs.filter((msgDoc) => {
                const data = msgDoc.data();
                return data.senderID !== auth.currentUser.uid;
            });

            const updatePromises = unreadMessages.map((msgDoc) =>
                updateDoc(doc(db, 'chats', chatID, 'messages', msgDoc.id), {
                    read: true
                })
            );

            await Promise.all(updatePromises);

            // Now set up a real-time listener on the messages subcollection
            const q = query(messagesRef, orderBy('timestamp', 'asc'));
            const unsubscribeMessages = onSnapshot(q, (snapshot) => {
                const messages = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMessages(messages);
            });

            // Clean up messages listener when chat changes
            return unsubscribeMessages;
        });

        // Cleanup on unmount
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // Animate typing indicator
    useEffect(() => {
        let typingTimeout;
        if (isTyping) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(typingAnimation, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(typingAnimation, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Simulate typing end after 3 seconds
            typingTimeout = setTimeout(() => setIsTyping(false), 3000);
        }

        return () => clearTimeout(typingTimeout);
    }, [isTyping]);

    // Message input animation
    useEffect(() => {
        Animated.spring(messageInputAnim, {
            toValue: message.length > 0 ? 1 : 0,
            useNativeDriver: true,
            friction: 8,
        }).start();
    }, [message]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const ProfileHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.headerContent}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                >
                    <Entypo name="chevron-left" size={18} color="#000" />
                </TouchableOpacity>
                <View style={styles.profileInfo}>
                    <Image
                        source={{ uri: `data:image/png;base64,${profilePic}` }}
                        style={styles.profileImage}
                    />
                    <View style={styles.nameContainer}>
                        <Text style={styles.profileName}>{fullName}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const playMessageSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sound/message_sent.mp3')
            );
            await sound.playAsync();
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

    const sendMessage = async () => {
        if (message.trim()) {
            setMessage('');
            // Haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Play sound
            playMessageSound();

            const newMessage = {
                text: message,
                senderID: auth.currentUser.uid,
                timestamp: serverTimestamp(),
                read: false
            };

            const chatRef = doc(db, 'chats', chatID);
            const chatSnap = await getDoc(chatRef);
            if (!chatSnap.exists()) {
                await setDoc(chatRef, {
                    participants: [studentID, auth.currentUser.uid],
                    lastMessage: message,
                    lastTimestamp: serverTimestamp()
                });
            }

            const messageRef = collection(db, 'chats', chatID, 'messages');

            await addDoc(messageRef, newMessage);

            await updateDoc(chatRef, {
                lastMessage: message,
                lastTimestamp: serverTimestamp()
            });

            // Update userChats for both sender and receiver
            const userChatsUpdate = async (userId, otherUserId) => {
                const userChatRef = doc(db, 'user', userId, 'userChats', chatID);
                await setDoc(userChatRef, {
                    otherUserId,
                    lastMessage: message,
                    lastTimestamp: serverTimestamp()
                });
            };

            await userChatsUpdate(auth.currentUser.uid, studentID);
            await userChatsUpdate(studentID, auth.currentUser.uid);
        }
    };

    const groupMessagesByDate = () => {
        const groups = {};
        messages.forEach((msg) => {
            if (!msg.timestamp) return;
            const date = format(msg.timestamp.toDate(), 'yyyy-MM-dd');
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(msg);
        });
        return groups;
    };

    const renderDateHeader = (date) => {
        const messageDate = new Date(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let displayDate;
        if (format(messageDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
            displayDate = 'Today';
        } else if (format(messageDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
            displayDate = 'Yesterday';
        } else {
            displayDate = format(messageDate, 'MMMM d, yyyy');
        }

        return (
            <View style={styles.dateHeaderContainer}>
                <Text style={styles.dateHeaderText}>{displayDate}</Text>
            </View>
        );
    };

    const renderMessageStatus = (read) => {
        let icon;
        let color = '#A5B4FC';

        if (!read) {
            icon = 'check-all';
        } else {
            icon = 'check-all';
            color = '#60A5FA';
        }

        return (
            <MaterialCommunityIcons name={icon} size={14} color={color} style={styles.messageStatus} />
        );
    };

    const groupedMessages = groupMessagesByDate();

    return (
        <View style={styles.container}>
            <ProfileHeader />
            <KeyboardAvoidingView
                style={styles.messageContentContainer}
            >
                <ScrollView
                    style={styles.messagesContainer}
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={Object.keys(groupedMessages).length === 0 ? styles.emptyMessageContainer : null}
                >
                    {Object.keys(groupedMessages).length === 0 ? (
                        // Empty state when no messages exist
                        <View style={styles.noMessagesContainer}>
                            <View style={styles.noMessagesIconContainer}>
                                <MaterialCommunityIcons name="message-reply-text-outline" size={40} color="#3B6FC9" strokeWidth={1.5} />
                            </View>
                            <Text style={styles.noMessagesTitle}>No messages yet</Text>
                            <Text style={styles.noMessagesSubtitle}>
                                Start the conversation by sending a message below
                            </Text>
                        </View>
                    ) : (
                        Object.entries(groupedMessages).map(([date, msgs]) => (
                            <View key={date}>
                                {renderDateHeader(date)}
                                {msgs.map((msg) => (
                                    <View
                                        key={msg.id}
                                        style={[
                                            styles.messageContainer,
                                            msg.senderID === auth.currentUser.uid.toString()
                                                ? styles.userMessageContainer
                                                : styles.receiverMessageContainer,
                                        ]}
                                    >
                                        {msg.senderID === studentID && (
                                            <Image
                                                source={{ uri: `data:image/png;base64,${profilePic}` }}
                                                style={styles.messageProfileImage}
                                            />
                                        )}
                                        <View
                                            style={[
                                                styles.messageBubble,
                                                msg.senderID === auth.currentUser.uid
                                                    ? styles.userMessageBubble
                                                    : styles.receiverMessageBubble,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.messageText,
                                                    msg.senderID === auth.currentUser.uid
                                                        ? styles.userMessageText
                                                        : styles.receiverMessageText,
                                                ]}
                                            >
                                                {msg.text}
                                            </Text>
                                            <View style={styles.messageInfoContainer}>
                                                {msg.timestamp && (
                                                    <Text
                                                        style={[
                                                            styles.timeText,
                                                            msg.senderID === auth.currentUser.uid
                                                                ? styles.userTimeText
                                                                : styles.receiverTimeText,
                                                        ]}
                                                    >
                                                        {format(msg.timestamp.toDate(), 'HH:mm')}
                                                    </Text>
                                                )}
                                                {msg.senderID === auth.currentUser.uid && renderMessageStatus(msg.read)}
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))
                    )}

                    {isTyping && (
                        <View style={styles.typingContainer}>
                            <Image
                                source={{ uri: `data:image/png;base64,${profilePic}` }}
                                style={styles.messageProfileImage}
                            />
                            <View style={styles.typingBubble}>
                                <Animated.View
                                    style={[
                                        styles.typingDot,
                                        {
                                            opacity: typingAnimation.interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.3, 1, 0.3],
                                            }),
                                        },
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.typingDot,
                                        {
                                            opacity: typingAnimation.interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.5, 1, 0.5],
                                            }),
                                            marginHorizontal: 4,
                                        },
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.typingDot,
                                        {
                                            opacity: typingAnimation.interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.7, 1, 0.7],
                                            }),
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    )}
                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* <BlurView intensity={80} tint="light" style={styles.inputContainerBlur}> */}
                <View style={styles.inputContainer}>
                    <View style={styles.textInputContainer}>
                        <TextInput
                            style={styles.input}
                            value={message}
                            onChangeText={setMessage}
                            placeholder="Message..."
                            placeholderTextColor="#DEDEDE"
                            multiline
                            maxHeight={100}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                !message.trim() && styles.sendButtonDisabled,
                            ]}
                            onPress={sendMessage}
                            disabled={!message.trim()}
                        >
                            <Ionicons name="send" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    background: {
        flex: 1,
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'ios' ? 44 : 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: 'rgba(165, 165, 165, 0.1)',
    },
    profileInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    profileImage: {
        width: 35,
        height: 35,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        marginRight: 12,
    },
    nameContainer: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ADE80',
        marginRight: 5,
    },
    statusText: {
        fontSize: 14,
        color: '#E0E7FF',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    emptyMessageContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    noMessagesContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    noMessagesIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EEF3FC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    noMessagesTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    noMessagesSubtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    messageContentContainer: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    dateHeaderContainer: {
        alignItems: 'center',
        marginVertical: 14,
    },
    dateHeaderText: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        color: '#666',
    },
    messageContainer: {
        marginVertical: 6,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    userMessageContainer: {
        justifyContent: 'flex-end',
    },
    receiverMessageContainer: {
        justifyContent: 'flex-start',
        marginRight: 60,
    },
    messageProfileImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 16,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    userMessageBubble: {
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    receiverMessageBubble: {
        backgroundColor: '#F0F0F0',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    userMessageText: {
        color: '#FFFFFF',
    },
    receiverMessageText: {
        color: '#1F2937',
    },
    messageInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 2,
    },
    timeText: {
        fontSize: 11,
        marginRight: 4,
    },
    userTimeText: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    receiverTimeText: {
        color: '#9CA3AF',
    },
    messageStatus: {
        marginLeft: 2,
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: 8,
        marginBottom: 12,
    },
    typingBubble: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        borderBottomLeftRadius: 4,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6366F1',
    },
    inputContainerBlur: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        alignItems: 'center',
    },
    inputActionButtons: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    inputActionButton: {
        marginRight: 16,
    },
    textInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 16,
        marginRight: 10,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: '#DEDEDE',
        color: '#1F2937',
    },
    sendButton: {
        backgroundColor: '#007AFF',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    sendButtonDisabled: {
        backgroundColor: '#007AFF',
        opacity: 0.5
    },
});

export default MessagingScreen;
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'

const MerchandiseCard = ({ item, balanceDiamonds, navigation }) => {
    // Mapping for adminID values
    const adminMapping = {
        "1": "FACA",
        "2": "FBE",
        "3": "FCSHD",
        "4": "FCSIT",
        "5": "FEB",
        "6": "FELC",
        "7": "FENG",
        "8": "FMHS",
        "9": "FRST",
        "10": "FSSH",
    };

    // Get faculty text based on adminID or use a default
    const getFacultyText = () => {
        return adminMapping[item.adminID] || "General";
    }

    return (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("MerchandiseDetails", { merch: item, balanceDiamonds: balanceDiamonds })}>
            <Image
                source={{ uri: `data:image/png;base64,${item.images[0]}` }}
                style={styles.cardImage}
            />
            <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                        {item.name}
                    </Text>
                    <View style={styles.facultyPill}>
                        <Text style={styles.facultyText}>{getFacultyText()}</Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.priceContainer}>
                    <View style={styles.diamondContainer}>
                        <Image source={require('../../assets/icons/diamond.png')} style={styles.diamondIcon} />
                        <Text style={styles.diamondValue}>{item.diamondsToRedeem}</Text>
                    </View>
                    <Text style={styles.diamondLabel}>Diamonds</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default MerchandiseCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        overflow: 'hidden',
        height: 'auto',
        marginHorizontal: 5,
        marginBottom: 10,
        // Shadow properties for iOS
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        // Shadow for Android
        elevation: 3,
    },
    cardImage: {
        width: '100%',
        height: 160,
        resizeMode: 'cover',
    },
    cardContent: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        flex: 1,
        letterSpacing: 0.3,
        marginRight: 8,
    },
    facultyPill: {
        backgroundColor: 'rgba(98, 132, 191, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    facultyText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6284bf',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    diamondContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(98, 132, 191, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    diamondIcon: {
        height: 18,
        width: 18,
        marginRight: 6,
    },
    diamondValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6284bf',
    },
    diamondLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        marginLeft: 4,
    },
});
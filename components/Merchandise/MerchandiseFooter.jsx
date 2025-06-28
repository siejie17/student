import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { addDoc, collection, doc, increment, updateDoc } from 'firebase/firestore';

import RedemptionSuccessModal from '../Modal/RedemptionSuccessModal';

import { getItem } from '../../utils/asyncStorage';
import { db } from '../../utils/firebaseConfig';

const MerchandiseFooter = ({ merch, balanceDiamonds }) => {
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [totalDiamonds, setTotalDiamonds] = useState(merch.diamondsToRedeem);
    const [isFocus, setIsFocus] = useState(false);

    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redemptionSuccessModal, setRedemptionSuccessModal] = useState(false);

    // Format sizes for dropdown
    const sizeOptions = merch.sizes ? merch.sizes.map(size => ({ label: size, value: size })) : [];

    // Update total diamonds when quantity changes
    useEffect(() => {
        setTotalDiamonds(quantity * merch.diamondsToRedeem);
    }, [quantity, merch.diamondsToRedeem]);

    // Increment/decrement quantity
    const incrementQuantity = () => setQuantity(prev => prev + 1);
    const decrementQuantity = () => {
        if (quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    // Check if redeem button should be disabled
    const isRedeemDisabled = totalDiamonds > balanceDiamonds ||
        (merch.category === "Clothing" && !selectedSize) ||
        isRedeeming;

    const handleRedemption = async () => {
        setIsRedeeming(true);
        try {
            const studentID = await getItem("studentID");
            if (!studentID) return;

            const studentRef = doc(db, "user", studentID);

            await updateDoc(studentRef, {
                diamonds: increment(-totalDiamonds),
            });

            let redemptionData = {
                merchandiseID: merch.id,
                redemptionID: new Date().getTime().toString() + Math.random().toString(36).substr(2, 5),
                redeemedTime: new Date(),
                studentID: studentID,
                quantity: quantity,
                collected: false,
            };

            if (merch.category === "Clothing") {
                redemptionData.selectedSize = selectedSize;
            }

            await addDoc(collection(db, "redemption"), redemptionData);

            setRedemptionSuccessModal(true);
        } catch (error) {
            console.error("Error when handling redemption:", error);
        }
    };


    return (
        <>
            <View style={styles.footer}>
                {/* Diamond Balance */}
                <View style={styles.balanceContainer}>
                    <View style={styles.balanceTextContainer}>
                        <Text style={styles.balanceLabel}>Diamonds Balance:</Text>
                    </View>
                    <View style={styles.diamondsContainer}>
                        <Image source={require('../../assets/icons/diamond.png')} style={styles.diamondIcon} />
                        <Text style={styles.balanceValue}>{balanceDiamonds}</Text>
                    </View>
                </View>

                {/* Size & Quantity Selection */}
                <View style={styles.selectionContainer}>
                    {merch.category === "Clothing" ? (
                        // Two-column layout for clothing
                        <>
                            <View style={styles.sizeContainer}>
                                <Dropdown
                                    style={[styles.dropdown, isFocus && styles.dropdownFocus]}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    iconStyle={styles.iconStyle}
                                    data={sizeOptions}
                                    maxHeight={200}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Select size"
                                    value={selectedSize}
                                    onFocus={() => setIsFocus(true)}
                                    onBlur={() => setIsFocus(false)}
                                    onChange={item => {
                                        setSelectedSize(item.value);
                                        setIsFocus(false);
                                    }}
                                    renderLeftIcon={() => (
                                        <MaterialIcons name="straighten" size={20} color="#5B7FFF" style={styles.dropdownIcon} />
                                    )}
                                    dropdownPosition="top"
                                />
                            </View>
                            <View style={styles.quantityContainer}>
                                <View style={styles.quantityWrapper}>
                                    <TouchableOpacity
                                        style={[styles.quantityBtn, quantity <= 1 && styles.quantityBtnDisabled]}
                                        onPress={decrementQuantity}
                                        disabled={quantity <= 1}
                                    >
                                        <Ionicons name="remove" size={18} color={quantity <= 1 ? "#ccc" : "#5B7FFF"} />
                                    </TouchableOpacity>
                                    <Text style={styles.quantityText}>{quantity}</Text>
                                    <TouchableOpacity style={styles.quantityBtn} onPress={incrementQuantity}>
                                        <Ionicons name="add" size={18} color="#5B7FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    ) : (
                        // Single column layout for non-clothing
                        <View style={styles.fullWidthQuantityContainer}>
                            <Text style={styles.quantityLabel}>Quantity:</Text>
                            <View style={styles.quantityWrapper}>
                                <TouchableOpacity
                                    style={[styles.quantityBtn, quantity <= 1 && styles.quantityBtnDisabled]}
                                    onPress={decrementQuantity}
                                    disabled={quantity <= 1}
                                >
                                    <Ionicons name="remove" size={18} color={quantity <= 1 ? "#ccc" : "#5B7FFF"} />
                                </TouchableOpacity>
                                <Text style={styles.quantityText}>{quantity}</Text>
                                <TouchableOpacity style={styles.quantityBtn} onPress={incrementQuantity}>
                                    <Ionicons name="add" size={18} color="#5B7FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Redeem Button */}
                <TouchableOpacity
                    style={[styles.redeemButton, isRedeemDisabled && styles.redeemButtonDisabled]}
                    disabled={isRedeemDisabled}
                    onPress={handleRedemption}
                >
                    <MaterialIcons name="redeem" size={20} color="#fff" style={styles.redeemIcon} />
                    <Text style={styles.redeemText}>
                        Redeem with {totalDiamonds} diamonds
                    </Text>
                </TouchableOpacity>

                {/* Optional warning message when balance is insufficient */}
                {totalDiamonds > balanceDiamonds && (
                    <Text style={styles.warningText}>
                        Not enough diamonds in your balance
                    </Text>
                )}
            </View>
            {/* Success Modal */}
            <RedemptionSuccessModal
                visible={redemptionSuccessModal}
                onClose={() => setRedemptionSuccessModal(false)}
                merchandise={merch}
                quantity={quantity}
                selectedSize={selectedSize}
                totalDiamonds={totalDiamonds}
            />
        </>
    );
};

const styles = StyleSheet.create({
    footer: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    balanceTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    diamondsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f4ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    diamondIcon: {
        height: 18,
        width: 18,
    },
    balanceValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#5B7FFF',
        marginLeft: 5,
    },
    selectionContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    sizeContainer: {
        flex: 1,
        marginRight: 8,
    },
    quantityContainer: {
        flex: 1,
        marginLeft: 8,
        justifyContent: 'center',
    },
    fullWidthQuantityContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quantityLabel: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    quantityWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    quantityBtn: {
        padding: 8,
        backgroundColor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 40,
    },
    quantityBtnDisabled: {
        backgroundColor: '#f5f5f5',
    },
    quantityText: {
        fontSize: 16,
        fontWeight: '600',
        paddingHorizontal: 15,
        minWidth: 60,
        textAlign: 'center',
    },
    dropdown: {
        height: 40,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 8,
        backgroundColor: '#fff',
    },
    dropdownFocus: {
        borderColor: '#5B7FFF',
    },
    placeholderStyle: {
        fontSize: 14,
        color: '#999',
    },
    selectedTextStyle: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    dropdownIcon: {
        marginRight: 8,
    },
    redeemButton: {
        backgroundColor: '#5B7FFF',
        borderRadius: 10,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#5B7FFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    redeemButtonDisabled: {
        backgroundColor: '#a0b0e8',
        shadowOpacity: 0,
        elevation: 0,
    },
    redeemIcon: {
        marginRight: 8,
    },
    redeemText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    warningText: {
        color: '#ff6b6b',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
});

export default MerchandiseFooter;
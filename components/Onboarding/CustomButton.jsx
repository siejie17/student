import { StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { setItem } from '../../utils/asyncStorage';

const CustomButton = ({flatListRef, flatListIndex, dataLength}) => {
    const navigation = useNavigation();

    const buttonAnimationStyle = useAnimatedStyle(() => {
        return {
            width:
            flatListIndex.value === dataLength - 1
                ? withSpring(140)
                : withSpring(60),
            height: 60,
        };
    });

    const arrowAnimationStyle = useAnimatedStyle(() => {
        return {
            width: 30,
            height: 30,
            opacity:
                flatListIndex.value === dataLength - 1 ? withTiming(0) : withTiming(1),
            transform: [
                {
                    translateX:
                    flatListIndex.value === dataLength - 1
                        ? withTiming(100)
                        : withTiming(0),
                },
            ],
        };
    });
  
    const textAnimationStyle = useAnimatedStyle(() => {
        return {
            opacity:
            flatListIndex.value === dataLength - 1 ? withTiming(1) : withTiming(0),
            transform: [
                {
                    translateX:
                    flatListIndex.value === dataLength - 1
                        ? withTiming(0)
                    : withTiming(-100),
                },
            ],
        };
    });

    return (
        <TouchableWithoutFeedback
            onPress={() => {
                if (flatListIndex.value < dataLength - 1) {
                    flatListRef.current.scrollToIndex({index: flatListIndex.value + 1});
                } else {
                    navigation.navigate('SignIn');
                    setItem('onboarded', '1');
                }
        }}>
        <Animated.View style={[styles.container, buttonAnimationStyle]}>
            <Animated.Text style={[styles.textButton, textAnimationStyle]}>
                Get Started
            </Animated.Text>
        <Animated.Image
          source={require('../../assets/onboarding/ArrowIcon.png')}
          style={[styles.arrow, arrowAnimationStyle]}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'blue',
        padding: 10,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    arrow: {
        position: 'absolute',
    },
    textButton: {
        color: 'white', 
        fontSize: 16, 
        position: 'absolute'
    },
});
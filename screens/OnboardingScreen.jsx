import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Pagination from '../components/Onboarding/Pagination.jsx';
import CustomButton from '../components/Onboarding/CustomButton.jsx';
import { SafeAreaView } from 'react-native-safe-area-context';

const data = [
    {
      id: 1,
      image: require('../assets/onboarding/event.png'),
      title: 'UniEXP: Your Event Companion',
      text: 'Where Campus Events Meet Gamification!',
    },
    {
      id: 2,
      image: require('../assets/onboarding/university.png'),
      title: 'Level Up Your Campus Experience',
      text: 'Turn your university life into a gamified adventure!',
    },
    {
      id: 3,
      image: require('../assets/onboarding/firstPlace.png'),
      title: 'Your Journey to the Top Begins Here',
      text: 'Earn Rewards, Top the Leaderboard, and Make Every Event Count!',
    },
];

const OnboardingScreen = () => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const flatListRef = useAnimatedRef(null);
    const x = useSharedValue(0);
    const flatListIndex = useSharedValue(0);

    const onViewableItemsChanged = ({viewableItems}) => {
        flatListIndex.value = viewableItems[0].index;
    };

    const onScroll = useAnimatedScrollHandler({
        onScroll: event => {
            x.value = event.contentOffset.x;
        },
    });

    const RenderItem = ({item, index}) => {
        const imageAnimationStyle = useAnimatedStyle(() => {
            const opacityAnimation = interpolate(
                x.value,
                [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                ],
                [0, 1, 0],
                Extrapolation.CLAMP,
            );
            const translateYAnimation = interpolate(
                x.value,
                [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                ],
                [100, 0, 100],
                Extrapolation.CLAMP,
            );
            return {
                opacity: opacityAnimation,
                width: SCREEN_WIDTH * 0.8,
                height: SCREEN_WIDTH * 0.8,
                transform: [{translateY: translateYAnimation}],
            };
        });
        const textAnimationStyle = useAnimatedStyle(() => {
            const opacityAnimation = interpolate(
                x.value,
                [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                ],
                [0, 1, 0],
                Extrapolation.CLAMP,
            );
            const translateYAnimation = interpolate(
                x.value,
                [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                ],
                [100, 0, 100],
                Extrapolation.CLAMP,
            );

            return {
                opacity: opacityAnimation,
                transform: [{translateY: translateYAnimation}],
            };
        });
        return (
            <View style={[styles.itemContainer, {width: SCREEN_WIDTH}]}>
                <Animated.Image source={item.image} style={imageAnimationStyle} />
                <Animated.View style={textAnimationStyle}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemText}>{item.text}</Text>
                </Animated.View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.FlatList
                ref={flatListRef}
                onScroll={onScroll}
                data={data}
                renderItem={({item, index}) => {
                    return <RenderItem item={item} index={index} />;
                }}
                keyExtractor={item => item.id}
                scrollEventThrottle={16}
                horizontal={true}
                bounces={false}
                pagingEnabled={true}
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{
                minimumViewTime: 300,
                viewAreaCoveragePercentThreshold: 10,
                }}
            />
            <View style={styles.bottomContainer}>
            <Pagination data={data} x={x} screenWidth={SCREEN_WIDTH} />
            <CustomButton
                flatListRef={flatListRef}
                flatListIndex={flatListIndex}
                dataLength={data.length}
            />
        </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    itemContainer: {
        flex: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    itemTitle: {
        textAlign: 'center',
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 10,
        color: 'black',
        paddingHorizontal: 50
    },
    itemText: {
        textAlign: 'center',
        marginHorizontal: 35,
        color: 'black',
        lineHeight: 20,
    },
    bottomContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingVertical: 20,
    },
});
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ImageBackground,
    Dimensions,
    TouchableOpacity,
    StatusBar,
    Animated,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Facebook, Github, Chrome } from 'lucide-react-native';
import { adminApi } from '../api/admin';
import { BASE_URL } from '../api/client';

const { width, height } = Dimensions.get('window');

const FALLBACK_SLIDES = [
    {
        id: '0',
        image: require('../../assets/onboarding1.jpg'),
        title: "Revolutionizing Waste",
        text: "Join the future of smart waste management in Ghana. Fast, efficient, and green.",
        buttonText: "Next",
    },
    {
        id: '1',
        image: require('../../assets/onboarding2.jpg'),
        title: "Earn Every Time you Recycle",
        text: "Turn your waste into instant rewards. Get paid directly to your mobile wallet.",
        buttonText: "Get Started",
    }
];

export default function OnboardingScreen() {
    const navigation = useNavigation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAuthView, setShowAuthView] = useState(false);
    const [dynamicSlides, setDynamicSlides] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

    const slides = dynamicSlides && dynamicSlides.length > 0 ? dynamicSlides : FALLBACK_SLIDES;

    useEffect(() => {
        fetchOnboarding();
    }, []);

    const fetchOnboarding = async () => {
        try {
            const data = await adminApi.getOnboardingScreens();
            if (data && data.length > 0) {
                // Map API data to slide format
                const formatted = data.map(screen => ({
                    id: screen.id.toString(),
                    image: screen.image || screen.image_url,
                    title: screen.title,
                    text: screen.description,
                    buttonText: screen.button_text || "Next",
                    isRemote: true
                }));
                setDynamicSlides(formatted);
            }
        } catch (error) {
            console.log('Error fetching dynamic onboarding:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
        } else {
            setShowAuthView(true);
        }
    };

    const finishOnboarding = async (target) => {
        await AsyncStorage.setItem('has_seen_onboarding', 'true');
        navigation.navigate(target);
    };

    const renderItem = ({ item }) => {
        const imageSource = item.isRemote
            ? {
                uri: typeof item.image === 'string' && !item.image.startsWith('http')
                    ? `${BASE_URL}${item.image}`
                    : item.image
            }
            : item.image;

        return (
            <ImageBackground source={imageSource} style={styles.image}>
                <View style={styles.overlay} />
                <SafeAreaView style={styles.slideContent}>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.description}>{item.text}</Text>
                    </View>
                </SafeAreaView>
            </ImageBackground>
        );
    };

    if (showAuthView) {
        return (
            <View style={[styles.container, { backgroundColor: '#F0F7F4' }]}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

                {/* Background Shapes */}
                <View style={styles.topShape}>
                    <LinearGradient colors={['rgba(215, 255, 235, 0.8)', 'rgba(215, 255, 235, 0)']} style={StyleSheet.absoluteFill} />
                </View>
                <View style={styles.bottomShape}>
                    <LinearGradient colors={['rgba(224, 231, 255, 0.8)', 'rgba(224, 231, 255, 0)']} style={StyleSheet.absoluteFill} />
                </View>

                <SafeAreaView style={styles.authContainer}>
                    <View style={styles.authContent}>
                        <Image
                            source={require('../../assets/auth_illustration.png')}
                            style={styles.heroIllustration}
                            resizeMode="contain"
                        />
                        <View style={styles.welcomeTextContainer}>
                            <Text style={styles.welcomeHeading}>Welcome !</Text>
                            <View style={styles.brandRow}>
                                <Text style={styles.brandTextDark}>Re</Text>
                                <Text style={styles.brandTextGreen}>Vesta</Text>
                            </View>
                        </View>

                        <View style={styles.authActionArea}>
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => finishOnboarding('Register')}
                            >
                                <Text style={styles.primaryBtnText}>Sign up</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => finishOnboarding('Login')}
                            >
                                <Text style={styles.secondaryBtnText}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            <FlatList
                data={slides}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                })}
                scrollEventThrottle={32}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                ref={slidesRef}
            />

            <SafeAreaView style={styles.skipContainer}>
                <TouchableOpacity onPress={() => setShowAuthView(true)}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </SafeAreaView>

            <View style={styles.footer}>
                <View style={styles.indicatorContainer}>
                    {slides.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 30, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                style={[styles.dot, { width: dotWidth, opacity }]}
                                key={i.toString()}
                            />
                        );
                    })}
                </View>

                <TouchableOpacity style={styles.button} onPress={scrollTo}>
                    <Text style={styles.buttonText}>
                        {currentIndex === slides.length - 1 ? "Get Started" : "Next"} →
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    image: {
        width,
        height,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    slideContent: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 30,
        paddingBottom: 150,
    },
    textContainer: {
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 10,
    },
    description: {
        fontSize: 18,
        color: '#eee',
        lineHeight: 26,
    },
    skipContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    },
    skipText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        padding: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        paddingHorizontal: 30,
    },
    indicatorContainer: {
        flexDirection: 'row',
        height: 40,
        marginBottom: 20,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2E7D32',
        marginHorizontal: 4,
    },
    button: {
        backgroundColor: '#2E7D32',
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    authContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    authContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 40,
        paddingTop: 30,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 10,
        marginTop: 20,
        zIndex: 10,
    },
    topShape: {
        position: 'absolute',
        top: -100,
        left: -100,
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        overflow: 'hidden',
    },
    bottomShape: {
        position: 'absolute',
        bottom: -150,
        right: -100,
        width: width,
        height: width,
        borderRadius: width * 0.5,
        overflow: 'hidden',
    },
    heroIllustration: {
        width: 180,
        height: 180,
        marginBottom: 25,
    },
    welcomeTextContainer: {
        alignItems: 'center',
        marginBottom: 35,
    },
    welcomeHeading: {
        fontSize: 32,
        fontWeight: '900',
        color: '#2E7D32',
        marginBottom: 5,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandTextDark: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    brandTextGreen: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    authActionArea: {
        width: '100%',
    },
    primaryBtn: {
        width: '100%',
        height: 58,
        backgroundColor: '#1E3A8A', // Deep blue as in reference
        borderRadius: 29,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryBtn: {
        width: '100%',
        height: 58,
        backgroundColor: '#fff',
        borderRadius: 29,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

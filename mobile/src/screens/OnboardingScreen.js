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
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
                <LinearGradient
                    colors={['#2E7D32', '#1B5E20', '#123D15']}
                    style={StyleSheet.absoluteFill}
                />

                <SafeAreaView style={styles.authContainer}>
                    <View style={styles.whiteCard}>
                        <View style={styles.logoBranding}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logoImageLarge}
                            />
                            <Text style={styles.cardTitle}>ReVesta</Text>
                            <Text style={styles.cardSubtitle}>Recycle. Reward. Repeat.</Text>
                        </View>

                        <View style={styles.authActionArea}>
                            <Text style={styles.mainActionHeading}>Sign Up</Text>
                            <Text style={styles.mainActionSub}>It's easier to sign up now</Text>

                            <TouchableOpacity
                                style={styles.facebookBtn}
                                onPress={() => console.log('Facebook login')}
                            >
                                <Facebook size={20} color="#fff" />
                                <Text style={styles.facebookBtnText}>Continue with Facebook</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.emailBtn}
                                onPress={() => finishOnboarding('Register')}
                            >
                                <Text style={styles.emailBtnText}>I'll use email or phone</Text>
                            </TouchableOpacity>

                            <View style={styles.socialRow}>
                                <TouchableOpacity style={styles.socialIconBtn}>
                                    <Chrome size={22} color="#EA4335" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.socialIconBtn}>
                                    <View style={{ backgroundColor: '#000', borderRadius: 12, padding: 4 }}>
                                        <Github size={16} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.socialIconBtn}>
                                    <Mail size={22} color="#4B5563" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.loginFooterRow}
                            onPress={() => finishOnboarding('Login')}
                        >
                            <Text style={styles.loginFooterText}>Already have account? </Text>
                            <Text style={styles.loginLink}>Login</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.cardTagline}>
                        JOIN THE MOVEMENT FOR A CLEANER GHANA
                    </Text>
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
        paddingHorizontal: 25,
    },
    whiteCard: {
        backgroundColor: '#fff',
        borderRadius: 40,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    logoImageLarge: {
        width: 100,
        height: 100,
        borderRadius: 30,
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2E7D32',
        letterSpacing: -1,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        marginTop: 2,
    },
    authActionArea: {
        width: '100%',
        alignItems: 'center',
        marginTop: 40,
    },
    mainActionHeading: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    mainActionSub: {
        fontSize: 14,
        color: '#999',
        marginTop: 4,
        marginBottom: 30,
    },
    facebookBtn: {
        width: '100%',
        height: 60,
        backgroundColor: '#4E6AFF',
        borderRadius: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#4E6AFF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    facebookBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emailBtn: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
    },
    emailBtnText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
    },
    socialRow: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 30,
        marginBottom: 10,
    },
    socialIconBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginFooterRow: {
        flexDirection: 'row',
        marginTop: 30,
    },
    loginFooterText: {
        color: '#999',
        fontSize: 14,
    },
    loginLink: {
        color: '#2E7D32',
        fontSize: 14,
        fontWeight: 'bold',
    },
    cardTagline: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        textAlign: 'center',
        marginTop: 30,
    },
});

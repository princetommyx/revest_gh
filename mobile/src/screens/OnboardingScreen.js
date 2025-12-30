import React, { useState, useRef } from 'react';
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
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');

const slides = [
    {
        id: '0',
        image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=1600",
        title: "Revolutionizing Waste",
        text: "Join the future of smart waste management in Ghana. Fast, efficient, and green.",
        buttonText: "Next",
    },
    {
        id: '1',
        image: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=1600",
        title: "Earn Every Time you Recycle",
        text: "Turn your waste into instant rewards. Get paid directly to your mobile wallet.",
        buttonText: "Get Started",
    }
];

export default function OnboardingScreen() {
    const navigation = useNavigation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAuthView, setShowAuthView] = useState(false);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

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
        await SecureStore.setItemAsync('has_seen_onboarding', 'true');
        navigation.navigate(target);
    };

    const renderItem = ({ item }) => (
        <ImageBackground source={{ uri: item.image }} style={styles.image}>
            <View style={styles.overlay} />
            <SafeAreaView style={styles.slideContent}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.text}</Text>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );

    if (showAuthView) {
        return (
            <ImageBackground source={{ uri: slides[1].image }} style={styles.image}>
                <View style={[styles.overlay, { backgroundColor: 'rgba(46, 125, 50, 0.4)' }]} />
                <SafeAreaView style={styles.authContainer}>
                    <View style={styles.logoBranding}>
                        <View style={styles.logoCircle}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logoImage}
                            />
                        </View>
                        <Text style={styles.authTitle}>ReVesta</Text>
                        <Text style={styles.authSubtitle}>Recycle. Reward. Repeat.</Text>
                    </View>

                    <View style={styles.authButtons}>
                        <TouchableOpacity
                            style={styles.loginBtn}
                            onPress={() => finishOnboarding('Login')}
                        >
                            <Text style={styles.loginBtnText}>Login</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.registerBtn}
                            onPress={() => finishOnboarding('Register')}
                        >
                            <Text style={styles.registerBtnText}>Create Account</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.tagline}>
                        Join the movement for a cleaner Ghana
                    </Text>
                </SafeAreaView>
            </ImageBackground>
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
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    logoBranding: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    logoImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    authTitle: {
        fontSize: 48,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -1,
    },
    authSubtitle: {
        fontSize: 18,
        color: '#E8F5E9',
        fontWeight: '500',
        marginTop: 5,
    },
    authButtons: {
        width: '100%',
        gap: 15,
        marginBottom: 40,
    },
    loginBtn: {
        backgroundColor: '#2E7D32',
        height: 65,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    loginBtnText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    registerBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        height: 65,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    registerBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    tagline: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 2,
        textAlign: 'center',
        marginTop: 20,
    },
});

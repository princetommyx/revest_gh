import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, TextInput, Image } from 'react-native';
import { Star, X } from 'lucide-react-native';

export default function RatingModal({ visible, onClose, onSubmit, job }) {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.8));

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
            setRating(0);
            setFeedback('');
        }
    }, [visible]);

    const handleSubmit = () => {
        if (rating > 0) {
            onSubmit(rating, feedback);
            onClose();
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View 
                    style={[
                        styles.modalContainer, 
                        { 
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <X size={20} color="#666" />
                    </TouchableOpacity>

                    {/* Illustration Header */}
                    <View style={styles.illustrationContainer}>
                        <View style={styles.illustrationCircle}>
                            <Star size={48} color="#F59E0B" fill="#F59E0B" />
                        </View>
                    </View>

                    <Text style={styles.title}>Rate your pickup!</Text>
                    <Text style={styles.subtitle}>
                        Your items have been collected. How was your experience with {job?.collector?.first_name || 'the collector'}?
                    </Text>

                    {/* Star Rating */}
                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity 
                                key={star} 
                                onPress={() => setRating(star)}
                                style={styles.starBtn}
                                activeOpacity={0.7}
                            >
                                <Star 
                                    size={40} 
                                    color={star <= rating ? "#F59E0B" : "#E5E7EB"} 
                                    fill={star <= rating ? "#F59E0B" : "transparent"} 
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Optional Feedback Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Add a comment (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={feedback}
                        onChangeText={setFeedback}
                        multiline
                    />

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]} 
                        onPress={handleSubmit}
                        disabled={rating === 0}
                    >
                        <Text style={styles.submitBtnText}>Send Rating</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    illustrationContainer: {
        marginBottom: 20,
        marginTop: 10,
    },
    illustrationCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    starBtn: {
        padding: 4,
    },
    input: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        paddingTop: 16,
        fontSize: 15,
        color: '#111',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 24,
    },
    submitBtn: {
        width: '100%',
        height: 56,
        backgroundColor: '#111',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: '#9CA3AF',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

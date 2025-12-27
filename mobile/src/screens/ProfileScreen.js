import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../api/auth';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen() {
    const navigation = useNavigation();

    const handleLogout = async () => {
        await authApi.logout();
        await SecureStore.deleteItemAsync('access_token');
        // Reload/Redirect logic here handled by Navigator or Context
        console.log("Logout clicked");
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.text}>Profile Screen</Text>
            <TouchableOpacity style={styles.btn} onPress={handleLogout}>
                <Text style={styles.btnText}>Logout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 20, marginBottom: 20 },
    btn: { backgroundColor: 'red', padding: 10, borderRadius: 5 },
    btnText: { color: 'white' }
});

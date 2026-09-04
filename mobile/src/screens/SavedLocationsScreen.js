import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, StatusBar, Modal, FlatList, ActivityIndicator,
    KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Home, Briefcase, MapPin, Plus, Search, X, Trash2, Bookmark } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { placesApi } from '../api/places';
import { useSavedLocations } from '../hooks/useSavedLocations';
import PageLoader from '../components/PageLoader';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const KIND_META = {
    // Token names, not hex - this map is module scope, resolved at render.
    HOME: { Icon: Home, tone: 'accent', softTone: 'accentSoft' },
    WORK: { Icon: Briefcase, tone: 'info', softTone: 'infoSoft' },
    OTHER: { Icon: MapPin, tone: 'warning', softTone: 'warningSoft' },
};

const LocationRow = ({ item, onDelete, isLast }) => {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const meta = KIND_META[item.kind] || KIND_META.OTHER;
    const { Icon } = meta;
    return (
        <View style={[styles.locationItem, isLast && styles.locationItemLast]}>
            <View style={[styles.iconContainer, { backgroundColor: colors[meta.softTone] }]}>
                <Icon size={18} color={colors[meta.tone]} strokeWidth={2} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.label}</Text>
                <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
            </View>
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDelete(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Trash2 size={18} color={colors.textMuted} />
            </TouchableOpacity>
        </View>
    );
};

export default function SavedLocationsScreen({ navigation }) {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const { savedLocations, addLocation, removeLocation, isLoaded } = useSavedLocations();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [pendingKind, setPendingKind] = useState('OTHER');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef(null);

    const runSearch = useCallback((text) => {
        setQuery(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (text.trim().length < 3) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const found = await placesApi.searchPlaces(text.trim());
                setResults(found);
            } catch (e) {
                Toast.show({ type: 'error', text1: 'Search failed', text2: 'Check your connection and try again.' });
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 400);
    }, []);

    const openPicker = (kind) => {
        setPendingKind(kind);
        setQuery('');
        setResults([]);
        setPickerOpen(true);
    };

    const closePicker = () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        setPickerOpen(false);
    };

    const handleSelectPlace = (place) => {
        const label =
            pendingKind === 'HOME' ? 'Home'
                : pendingKind === 'WORK' ? 'Work'
                    : (place.name || place.address);

        addLocation({
            label,
            address: place.address || place.name,
            latitude: place.lat,
            longitude: place.lon,
            kind: pendingKind,
        });
        closePicker();
        Toast.show({ type: 'success', text1: 'Location saved', text2: label });
    };

    const handleDelete = (item) => {
        Alert.alert(
            'Remove location',
            `Remove "${item.label}" from your saved locations?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        removeLocation(item.id);
                        Toast.show({ type: 'success', text1: 'Location removed' });
                    },
                },
            ]
        );
    };

    const favorites = savedLocations.filter(l => l.kind === 'HOME' || l.kind === 'WORK');
    const others = savedLocations.filter(l => l.kind !== 'HOME' && l.kind !== 'WORK');
    const hasHome = savedLocations.some(l => l.kind === 'HOME');
    const hasWork = savedLocations.some(l => l.kind === 'WORK');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Saved Locations</Text>
                <View style={{ width: 40 }} />
            </View>

            {!isLoaded ? (
                <PageLoader label="Loading your locations..." />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Quick-add shortcuts for the two places people reuse most */}
                    {(!hasHome || !hasWork) && (
                        <View style={styles.quickAddRow}>
                            {!hasHome && (
                                <TouchableOpacity style={styles.quickAddCard} onPress={() => openPicker('HOME')} activeOpacity={0.8}>
                                    <View style={[styles.quickAddIcon, { backgroundColor: colors.accentSoft }]}>
                                        <Home size={20} color={colors.accent} />
                                    </View>
                                    <Text style={styles.quickAddLabel}>Add Home</Text>
                                </TouchableOpacity>
                            )}
                            {!hasWork && (
                                <TouchableOpacity style={styles.quickAddCard} onPress={() => openPicker('WORK')} activeOpacity={0.8}>
                                    <View style={[styles.quickAddIcon, { backgroundColor: colors.infoSoft }]}>
                                        <Briefcase size={20} color={colors.info} />
                                    </View>
                                    <Text style={styles.quickAddLabel}>Add Work</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {favorites.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>FAVORITES</Text>
                            <View style={styles.listContainer}>
                                {favorites.map((item, i) => (
                                    <LocationRow
                                        key={item.id}
                                        item={item}
                                        onDelete={handleDelete}
                                        isLast={i === favorites.length - 1}
                                    />
                                ))}
                            </View>
                        </>
                    )}

                    {others.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>OTHER LOCATIONS</Text>
                            <View style={styles.listContainer}>
                                {others.map((item, i) => (
                                    <LocationRow
                                        key={item.id}
                                        item={item}
                                        onDelete={handleDelete}
                                        isLast={i === others.length - 1}
                                    />
                                ))}
                            </View>
                        </>
                    )}

                    {savedLocations.length === 0 && (
                        <View style={styles.emptyBox}>
                            <Bookmark size={44} color={colors.textMuted} />
                            <Text style={styles.emptyTitle}>No saved locations yet</Text>
                            <Text style={styles.emptyText}>
                                Save the places you request pickups from most, so you don't have to search for them every time.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => openPicker('OTHER')}>
                        <Plus size={20} color={colors.accent} strokeWidth={2.5} style={{ marginRight: 8 }} />
                        <Text style={styles.addBtnText}>Add new location</Text>
                    </TouchableOpacity>

                </ScrollView>
            )}

            {/* Place search */}
            <Modal visible={pickerOpen} animationType="slide" onRequestClose={closePicker}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={closePicker} style={styles.backBtn}>
                            <X size={22} color={colors.text} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {pendingKind === 'HOME' ? 'Set Home' : pendingKind === 'WORK' ? 'Set Work' : 'Add Location'}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                    >
                        <View style={styles.searchWrap}>
                            <Search size={18} color={colors.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search for a place in Ghana"
                                placeholderTextColor={colors.textMuted}
                                value={query}
                                onChangeText={runSearch}
                                autoFocus
                                returnKeyType="search"
                            />
                            {query.length > 0 && (
                                <TouchableOpacity onPress={() => runSearch('')}>
                                    <X size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {searching ? (
                            <View style={styles.searchStatus}>
                                <ActivityIndicator size="small" color={colors.text} />
                            </View>
                        ) : (
                            <FlatList
                                data={results}
                                keyExtractor={(item) => item.id}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingHorizontal: 24 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.resultRow} onPress={() => handleSelectPlace(item)}>
                                        <View style={styles.resultIcon}>
                                            <MapPin size={16} color={colors.textSecondary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.searchHint}>
                                        {query.trim().length < 3
                                            ? 'Type at least 3 characters to search.'
                                            : 'No places found. Try a different search.'}
                                    </Text>
                                }
                            />
                        )}
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: c.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginBottom: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: c.text,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 60,
    },
    quickAddRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    quickAddCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: c.surfaceAlt,
        borderRadius: 16,
        padding: 14,
    },
    quickAddIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickAddLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: c.text,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: c.textMuted,
        letterSpacing: 1.2,
        marginBottom: 12,
        marginTop: 28,
    },
    listContainer: {
        backgroundColor: c.surfaceAlt,
        borderRadius: 18,
        paddingHorizontal: 14,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
    },
    locationItemLast: {
        borderBottomWidth: 0,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: c.text,
        marginBottom: 3,
    },
    address: {
        fontSize: 13,
        color: c.textSecondary,
    },
    deleteBtn: {
        padding: 6,
    },
    emptyBox: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: c.text,
        marginTop: 16,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        color: c.textMuted,
        textAlign: 'center',
        lineHeight: 19,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 28,
        paddingVertical: 12,
    },
    addBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: c.accent,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: c.surfaceSunken,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        marginHorizontal: 24,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: c.text,
    },
    searchStatus: {
        paddingTop: 24,
        alignItems: 'center',
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
    },
    resultIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
        color: c.text,
        marginBottom: 2,
    },
    resultAddress: {
        fontSize: 13,
        color: c.textSecondary,
    },
    searchHint: {
        fontSize: 13,
        color: c.textMuted,
        textAlign: 'center',
        marginTop: 32,
    },
}));

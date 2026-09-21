import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, Modal, TouchableOpacity, TextInput, FlatList,
    ActivityIndicator, Platform,
} from 'react-native';
import { Search, MapPin, Navigation, X, Home, Briefcase, Bookmark } from 'lucide-react-native';
import { placesApi } from '../api/places';
import { useSavedLocations } from '../hooks/useSavedLocations';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const KIND_ICON = { HOME: Home, WORK: Briefcase };

/**
 * Picker behind the location chip in the Home header.
 *
 * The chip shows where the feed is centred, so tapping it has to be able to
 * move that centre - previously it navigated to the profile screen, which
 * had nothing to do with location. Selection is by coordinates, not by a
 * place name: the listings endpoint filters on lat/lon within 20km, while
 * its `location` field is an exact string match that a geocoded label would
 * almost never hit.
 */
export default function LocationPickerSheet({ visible, onClose, onSelect, currentCoords }) {
    const styles = useStyles();
    const { colors } = useTheme();
    const { savedLocations } = useSavedLocations();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Reset between openings so the last search isn't still on screen.
    useEffect(() => {
        if (!visible) { setQuery(''); setResults([]); }
    }, [visible]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 3) { setResults([]); setSearching(false); return; }

        let cancelled = false;
        setSearching(true);
        const handle = setTimeout(async () => {
            try {
                const found = await placesApi.searchPlaces(q, currentCoords?.latitude, currentCoords?.longitude);
                if (!cancelled) setResults(found);
            } catch (e) {
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 400);

        return () => { cancelled = true; clearTimeout(handle); };
    }, [query, currentCoords?.latitude, currentCoords?.longitude]);

    const choose = useCallback((picked) => {
        onSelect(picked);
        onClose();
    }, [onSelect, onClose]);

    const Row = ({ icon: Icon, title, subtitle, onPress, accent }) => (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.rowIcon}>
                <Icon size={19} color={accent ? colors.accent : colors.text} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, accent && { color: colors.accent }]} numberOfLines={1}>{title}</Text>
                {!!subtitle && <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handleWrap}><View style={styles.handle} /></View>

                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Change location</Text>
                            <Text style={styles.subtitle}>Pick where you want to see waste and pickups.</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBar}>
                        <Search size={18} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search a town or area"
                            placeholderTextColor={colors.textMuted}
                            value={query}
                            onChangeText={setQuery}
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {searching && <ActivityIndicator size="small" color={colors.textMuted} />}
                    </View>

                    {query.trim().length >= 3 ? (
                        <FlatList
                            data={results}
                            keyExtractor={(item) => item.id}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <Row
                                    icon={MapPin}
                                    title={item.name}
                                    subtitle={item.address}
                                    onPress={() => choose({
                                        label: item.name,
                                        latitude: item.lat,
                                        longitude: item.lon,
                                    })}
                                />
                            )}
                            ListEmptyComponent={!searching ? (
                                <Text style={styles.empty}>No places found for "{query.trim()}".</Text>
                            ) : null}
                        />
                    ) : (
                        <FlatList
                            data={savedLocations}
                            keyExtractor={(item) => String(item.id)}
                            keyboardShouldPersistTaps="handled"
                            ListHeaderComponent={
                                <Row
                                    icon={Navigation}
                                    title="Use my current location"
                                    onPress={() => choose(null)}
                                    accent
                                />
                            }
                            renderItem={({ item }) => (
                                <Row
                                    icon={KIND_ICON[item.kind] || Bookmark}
                                    title={item.label}
                                    subtitle={item.address}
                                    onPress={() => choose({
                                        label: item.label,
                                        latitude: item.latitude,
                                        longitude: item.longitude,
                                    })}
                                />
                            )}
                            ListEmptyComponent={
                                <Text style={styles.empty}>
                                    Search above, or save the places you use most from Profile → Saved Locations.
                                </Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const useStyles = makeStyles((c) => ({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: c.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        height: '72%',
    },
    handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border },
    header: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 16 },
    title: { fontSize: 21, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceSunken,
        alignItems: 'center', justifyContent: 'center', marginLeft: 12,
    },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: c.surfaceAlt, borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 4,
        marginBottom: 8,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.text },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
    rowIcon: {
        width: 38, height: 38, borderRadius: 12, backgroundColor: c.surfaceSunken,
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    rowTitle: { fontSize: 15.5, fontWeight: '600', color: c.text },
    rowSubtitle: { fontSize: 12.5, color: c.textMuted, marginTop: 1 },
    empty: { fontSize: 13.5, color: c.textMuted, lineHeight: 20, paddingVertical: 18 },
}));

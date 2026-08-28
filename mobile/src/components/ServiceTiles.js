import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Truck, Recycle, Store, Package } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const GUTTER = 10;
const ROW_W = width - 40;              // Home's horizontal padding
const COL_W = (ROW_W - GUTTER) / 2;
const TALL_H = 188;
const SHORT_H = (TALL_H - GUTTER) / 2;

/**
 * Yango-style service tiles: two short tiles stacked beside one tall tile,
 * each a soft grey card with the label sitting *below* it.
 *
 * Art direction: each tile takes an optional `art` (a `require()`d image).
 * Until real 3D renders exist, a large icon stands in - which reads as
 * deliberate rather than broken. Dropping art in later is a one-line change
 * per tile in the caller, with no layout work.
 *
 * See assets/services/README.md for the spec those renders should meet.
 */
const Tile = ({ label, meta, art, Icon, tint, height, onPress }) => (
    <TouchableOpacity style={{ width: COL_W }} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.tile, { height, backgroundColor: tint }]}>
            {art ? (
                <Image source={art} style={styles.art} contentFit="contain" />
            ) : (
                <Icon size={height > 100 ? 54 : 30} color="#111" strokeWidth={1.5} />
            )}
        </View>
        <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1}>{label}</Text>
            {!!meta && <Text style={styles.meta} numberOfLines={1}> · {meta}</Text>}
        </View>
    </TouchableOpacity>
);

export default function ServiceTiles({ userRole, navigation }) {
    const go = (screen, params) => {
        Haptics.selectionAsync().catch(() => { });
        navigation.navigate(screen, params);
    };

    const isCollector = userRole === 'COLLECTOR' || userRole === 'RECYCLER';

    // Collectors and recyclers are looking for supply; disposers are choosing
    // how to get rid of something. Different first decision, different tiles.
    const tiles = isCollector
        ? {
            tall: { label: 'Find waste', meta: 'browse all', Icon: Store, tint: '#EAF2EE', onPress: () => go('Marketplace') },
            top: { label: 'Jobs nearby', Icon: Truck, tint: '#F1F2F4', onPress: () => go('Pickups') },
            bottom: { label: 'My pickups', Icon: Package, tint: '#F1F2F4', onPress: () => go('PickupHistory') },
        }
        : {
            // Track A - the pay-to-clear path, and the primary action.
            tall: { label: 'Clear my waste', meta: 'pickup in minutes', Icon: Truck, tint: '#F1F2F4', onPress: () => go('Pickups') },
            // Track B - previously only reachable by creating a listing, never
            // surfaced as a choice up front.
            top: { label: 'Sell recyclables', Icon: Recycle, tint: '#EAF2EE', onPress: () => go('CreateListing') },
            bottom: { label: 'My listings', Icon: Package, tint: '#F1F2F4', onPress: () => go('Marketplace') },
        };

    return (
        <View style={styles.row}>
            <View style={{ gap: GUTTER }}>
                <Tile {...tiles.top} height={SHORT_H} />
                <Tile {...tiles.bottom} height={SHORT_H} />
            </View>
            <Tile {...tiles.tall} height={TALL_H} />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: GUTTER,
        marginBottom: 18,
    },
    tile: {
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    art: {
        width: '100%',
        height: '100%',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 7,
        paddingHorizontal: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        flexShrink: 1,
    },
    meta: {
        fontSize: 12,
        color: '#9CA3AF',
        flexShrink: 1,
    },
});

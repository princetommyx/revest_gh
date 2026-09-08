import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Text, Image } from 'react-native';
import MapView, { Marker, Polyline, AnimatedRegion, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../theme/ThemeContext';

/**
 * RevestaTrackingMap
 * A drop-in component for Disposers to track their Collector in real-time.
 * 
 * @param {string} pickupRequestId - The ID of the active pickup request in Supabase.
 * @param {object} pickupLocation - { latitude, longitude } of the pickup point.
 * @param {object} facilityLocation - (Optional) { latitude, longitude } of destination facility.
 */
export default function RevestaTrackingMap({ pickupRequestId, pickupLocation, facilityLocation, customMapStyle, userInterfaceStyle }) {
    const { colors } = useTheme();
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    const [routeCoords, setRouteCoords] = useState([]);
    
    // We use AnimatedRegion to smoothly interpolate the truck marker moving 
    // across the map instead of it instantly teleporting to the new lat/lng.
    const [collectorRegion] = useState(
        new AnimatedRegion({
            latitude: pickupLocation?.latitude || 0,
            longitude: pickupLocation?.longitude || 0,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        })
    );
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        if (!pickupRequestId) return;

        // 1. Fetch the latest known location on mount
        const fetchInitialLocation = async () => {
            const { data, error } = await supabase
                .from('collector_locations')
                .select('latitude, longitude, heading')
                .eq('pickup_request_id', pickupRequestId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (data && !error) {
                const newCoord = { latitude: data.latitude, longitude: data.longitude };
                
                // Immediately snap to initial position without animation
                collectorRegion.setValue(newCoord);
                setHeading(data.heading || 0);
                setRouteCoords([newCoord]);
                
                fitMap(newCoord);
            }
        };

        fetchInitialLocation();

        // 2. Subscribe to Supabase Realtime channel for this specific job
        const channel = supabase
            .channel(`tracking:${pickupRequestId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT', // Could also be UPDATE if the collector just updates one row
                    schema: 'public',
                    table: 'collector_locations',
                    filter: `pickup_request_id=eq.${pickupRequestId}`,
                },
                (payload) => {
                    const { latitude, longitude, heading } = payload.new;
                    const newCoord = { latitude, longitude };

                    // Animate the marker smoothly to the new coordinate
                    if (Platform.OS === 'android') {
                        if (markerRef.current) {
                            markerRef.current.animateMarkerToCoordinate(newCoord, 2000);
                        }
                    } else {
                        collectorRegion.timing({ ...newCoord, duration: 2000, useNativeDriver: false }).start();
                    }

                    setHeading(heading || 0);
                    
                    // Add to the Polyline trace
                    setRouteCoords(prev => {
                        const newRoute = [...prev, newCoord];
                        // Optional: refit the map every X updates to keep both markers in view
                        fitMap(newCoord);
                        return newRoute;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [pickupRequestId]);

    const fitMap = (currentCollectorLoc) => {
        if (mapRef.current && pickupLocation && currentCollectorLoc) {
            const coordinates = [
                pickupLocation,
                currentCollectorLoc
            ];
            
            if (facilityLocation) {
                coordinates.push(facilityLocation);
            }

            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                animated: true,
            });
        }
    };

    if (!pickupLocation || isNaN(pickupLocation.latitude) || isNaN(pickupLocation.longitude)) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text>Waiting for location...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={{ flex: 1, width: '100%', height: '100%' }}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                customMapStyle={customMapStyle}
                userInterfaceStyle={userInterfaceStyle}
                initialRegion={{
                    latitude: pickupLocation.latitude || 0,
                    longitude: pickupLocation.longitude || 0,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                {/* 1. Pickup Point */}
                <Marker
                    coordinate={pickupLocation}
                    title="Pickup Location"
                    pinColor={colors.accent}
                />

                {/* 2. Destination Facility (Optional) */}
                {facilityLocation && (
                    <Marker
                        coordinate={facilityLocation}
                        title="Recycling Facility"
                        pinColor={colors.info}
                    />
                )}

                {/* 3. The Live Collector Vehicle */}
                <Marker.Animated
                    ref={markerRef}
                    coordinate={collectorRegion}
                    rotation={heading}
                    anchor={{ x: 0.5, y: 0.5 }}
                    flat={true} // Keeps it flat on the map so rotation looks like a vehicle turning
                    title="Collector"
                >
                    <View style={styles.vehicleMarkerContainer}>
                        <Image 
                            source={require('../../assets/pickup.jpg')} 
                            style={{
                                width: 40,
                                height: 40,
                                resizeMode: 'contain',
                            }} 
                        />
                    </View>
                </Marker.Animated>

                {/* 4. Live Path Trace */}
                {routeCoords.length > 1 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeColor={colors.accent}
                        strokeWidth={4}
                        lineDashPattern={[1]}
                    />
                )}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB', // Fallback
    },
    collectorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    vehicleMarkerContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
        borderWidth: 2,
        borderColor: '#34D399',
    },
    vehicleMarkerImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    }
});

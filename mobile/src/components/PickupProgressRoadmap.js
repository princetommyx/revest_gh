import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CheckCircle } from 'lucide-react-native';

// Black is the app's primary (every primary button, the tab bar, the sheet
// CTAs) - green is only ever an accent here, so the tracker reads as part of
// the app rather than its own thing. Completed path is solid black against the
// light grey of the stretch that hasn't happened yet.
const TRACK_ACCENT = '#111';
const TRACK_COLOR = '#E5E7EB';
const TRACK_DONE_COLOR = '#111';

// Tightened from 48/92/28: at the old spacing four steps alone stood ~370px
// tall, which was most of what pushed the collector's sheet off the top of the
// screen. Kept loose enough that a node never overlaps the label above it
// (label bottom sits ~NODE_SIZE/2 + 20 below its node centre).
const NODE_SIZE = 42;
const STEP_GAP = 72;
const TOP_PAD = 24;
const LEFT_X = 20;   // percent
const RIGHT_X = 80;  // percent

/**
 * A winding, illustrated milestone tracker for a pickup's real lifecycle -
 * inspired by roadmap-style progress screens (numbered landmark nodes on a
 * curved path) rather than the flat dot-and-line timeline this replaced.
 *
 * Deliberately stays honest about what "done" means: with live GPS tracking
 * unreliable, this doesn't attempt to show *where* the collector is on a
 * map - it shows which real, backend-confirmed milestone the job has
 * reached. `currentIndex` must be a step the job has actually reached; there
 * is no step here that isn't a real PickupRequest status.
 */
export default function PickupProgressRoadmap({ steps, currentIndex, isComplete }) {
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isComplete) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isComplete, currentIndex]);

    const count = steps.length;
    // Steps strictly before the current one are the only ones actually
    // finished - the current one is in progress, not done, unless the whole
    // job is complete (last step reached with a COMPLETED status).
    const doneCount = isComplete ? count : currentIndex;
    const percent = Math.round((doneCount / count) * 100);

    const nodeX = (i) => (i % 2 === 0 ? LEFT_X : RIGHT_X);
    const nodeY = (i) => TOP_PAD + i * STEP_GAP;
    const svgHeight = TOP_PAD * 2 + (count - 1) * STEP_GAP + 36; // + room for the last row's label

    const pathFor = (fromIdx, toIdx) => {
        if (toIdx <= fromIdx) return '';
        let d = `M ${nodeX(fromIdx)} ${nodeY(fromIdx)} `;
        for (let i = fromIdx; i < toIdx; i++) {
            const x0 = nodeX(i), y0 = nodeY(i);
            const x1 = nodeX(i + 1), y1 = nodeY(i + 1);
            const midY = y0 + (y1 - y0) / 2;
            d += `C ${x0} ${midY}, ${x1} ${midY}, ${x1} ${y1} `;
        }
        return d;
    };

    const fullPath = pathFor(0, count - 1);
    const donePath = doneCount > 0 ? pathFor(0, Math.min(doneCount, count - 1)) : '';

    return (
        <View>
            <View style={styles.progressCard}>
                <View>
                    <Text style={styles.progressLabel}>Your Progress</Text>
                    <Text style={styles.progressCaption}>
                        {doneCount}/{count} STEPS COMPLETED
                    </Text>
                </View>
                <Text style={styles.progressPercent}>{percent}%</Text>
            </View>
            <View style={styles.trackBg}>
                <View style={[styles.trackFill, { width: `${percent}%` }]} />
            </View>

            <View style={{ height: svgHeight, marginTop: 20 }}>
                <Svg width="100%" height={svgHeight} viewBox={`0 0 100 ${svgHeight}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                    <Path d={fullPath} stroke={TRACK_COLOR} strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
                    {!!donePath && (
                        <Path d={donePath} stroke={TRACK_DONE_COLOR} strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />
                    )}
                </Svg>

                {steps.map((step, i) => {
                    const Icon = step.icon;
                    const isDone = i < doneCount;
                    const isActive = i === currentIndex && !isComplete;
                    const isFinal = i === count - 1 && isComplete;

                    return (
                        <Animated.View
                            key={step.key}
                            style={[
                                styles.node,
                                {
                                    left: `${nodeX(i)}%`,
                                    top: nodeY(i),
                                    marginLeft: -NODE_SIZE / 2,
                                    marginTop: -NODE_SIZE / 2,
                                },
                                (isDone || isFinal) && styles.nodeDone,
                                isActive && styles.nodeActive,
                                isActive && {
                                    transform: [{
                                        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                                    }],
                                },
                            ]}
                        >
                            {(isDone || isFinal) ? (
                                <CheckCircle size={20} color="#fff" />
                            ) : (
                                <Icon size={18} color={isActive ? TRACK_ACCENT : '#9CA3AF'} />
                            )}
                        </Animated.View>
                    );
                })}

                {steps.map((step, i) => {
                    const isDone = i < doneCount || (i === count - 1 && isComplete);
                    const isActive = i === currentIndex && !isComplete;
                    return (
                        <View
                            key={`${step.key}-label`}
                            style={[
                                styles.labelWrap,
                                {
                                    left: `${nodeX(i)}%`,
                                    top: nodeY(i) + NODE_SIZE / 2 + 6,
                                    marginLeft: -55,
                                },
                            ]}
                        >
                            <Text style={[styles.nodeLabel, (isDone || isActive) && styles.nodeLabelActive]} numberOfLines={1}>
                                {step.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    progressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    progressLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
    progressCaption: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.4, marginTop: 2 },
    progressPercent: { fontSize: 20, fontWeight: '800', color: '#111827' },

    trackBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F3F4F6',
        marginTop: 12,
        overflow: 'hidden',
    },
    trackFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: TRACK_ACCENT,
    },

    node: {
        position: 'absolute',
        width: NODE_SIZE,
        height: NODE_SIZE,
        borderRadius: NODE_SIZE / 2,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#F3F4F6',
    },
    nodeDone: {
        backgroundColor: TRACK_ACCENT,
        borderColor: TRACK_ACCENT,
    },
    nodeActive: {
        // Neutral grey fill rather than the old mint - the black ring is what
        // marks the step you're on.
        backgroundColor: '#F3F4F6',
        borderColor: TRACK_ACCENT,
    },

    labelWrap: {
        position: 'absolute',
        width: 110,
        alignItems: 'center',
    },
    nodeLabel: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#9CA3AF',
        textAlign: 'center',
    },
    nodeLabelActive: {
        color: '#111827',
    },
});

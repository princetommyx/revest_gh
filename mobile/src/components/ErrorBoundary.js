import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCcw } from 'lucide-react-native';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can log the error to an error reporting service here
        console.error("Uncaught Error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Oops! Something went wrong.</Text>
                    <Text style={styles.subtitle}>
                        We encountered an unexpected error. Our team has been notified.
                    </Text>

                    {/* Shown regardless of build type while the app is still in
                        internal testing and there's no crash-reporting service
                        wired up yet - this is the only way to get a crash's
                        actual message back from a tester's device at all.
                        Revisit (gate behind __DEV__ again) once Sentry/Bugsnag
                        or similar is integrated. */}
                    <View style={styles.debugBox}>
                        <Text style={styles.debugText}>
                            {this.state.error?.toString()}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
                        <RefreshCcw size={20} color={'#FFFFFF'} />
                        <Text style={styles.btnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

// Deliberately theme-independent. This is a class component (hooks aren't
// available) and it renders when something upstream has already thrown -
// possibly the theme provider itself - so it must be able to paint without
// reading context.
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#EF4444',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 30
    },
    debugBox: {
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        width: '100%',
        maxHeight: 200
    },
    debugText: {
        fontSize: 12,
        color: '#111111',
        fontFamily: 'monospace'
    },
    btn: {
        flexDirection: 'row',
        backgroundColor: '#111111',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        alignItems: 'center'
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10
    }
});

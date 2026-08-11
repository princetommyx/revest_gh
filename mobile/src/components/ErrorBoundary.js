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

                    {/* Only show error detail in DEV mode */}
                    {__DEV__ && (
                        <View style={styles.debugBox}>
                            <Text style={styles.debugText}>
                                {this.state.error?.toString()}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
                        <RefreshCcw size={20} color="#fff" />
                        <Text style={styles.btnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E74C3C',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30
    },
    debugBox: {
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        width: '100%',
        maxHeight: 200
    },
    debugText: {
        fontSize: 12,
        color: '#333',
        fontFamily: 'monospace'
    },
    btn: {
        flexDirection: 'row',
        backgroundColor: '#111',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        alignItems: 'center'
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10
    }
});

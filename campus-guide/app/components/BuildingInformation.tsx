// BuildingInfoPopup.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Building } from './../../constants/buildings';

interface BuildingInfoPopupProps {
    building: Building;
    onGetDirections: (building: Building) => void;
    onClose: () => void;
}

export default function BuildingInformation({
    building,
    onGetDirections,
    onClose,
}: BuildingInfoPopupProps) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.codeBadge}>
                        <Text style={styles.codeText}>{building.code}</Text>
                    </View>
                    <View style={styles.details}>
                        <Text style={styles.name}>{building.name}</Text>
                        <Text style={styles.campus}>{building.campus} Campus</Text>
                        <Text style={styles.address}>{building.address}</Text>
                    </View>
                </View>
                
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.directionsButton}
                        onPress={() => onGetDirections(building)}
                    >
                        <Ionicons name="navigate" size={16} color="#FFFFFF" />
                        <Text style={styles.directionsButtonText}>Get Directions</Text>
                    </TouchableOpacity>
                    
                </View>
            </View>
            
            <TouchableOpacity testID="close-button" onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 40,
    },
    content: {
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        gap: 12,
    },
    codeBadge: {
        backgroundColor: '#912338',
        borderRadius: 8,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: 60,
    },
    codeText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 20,
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    campus: {
        fontSize: 14,
        color: '#4B5563',
        marginTop: 4,
    },
    address: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    directionsButton: {
        flex: 1,
        backgroundColor: '#912338',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    directionsButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    iconButton: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
});
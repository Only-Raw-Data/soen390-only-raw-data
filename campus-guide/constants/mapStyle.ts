import { MapStyleElement } from 'react-native-maps';

export const CAMPUS_MAP_STYLE: MapStyleElement[] = [
    {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'landscape.man_made',
        elementType: 'geometry.fill',
        stylers: [{ color: '#e0e0e0' }],
    },
    {
        featureType: 'landscape.man_made',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#c0c0c0' }],
    },
    {
        featureType: 'road',
        stylers: [{ visibility: 'on' }],
    },
    {
        featureType: 'road',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }],
    },
    {
        featureType: 'transit',
        stylers: [{ visibility: 'on' }],
    },
    {
        featureType: 'administrative',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#666666' }],
    },
];

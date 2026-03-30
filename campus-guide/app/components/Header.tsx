import { View, Text, StyleSheet} from 'react-native';
import NextClassDirectionsBanner from '@app/components/NextClassDirectionsBanner';

export default function Header() {
    return (
    <View style={styles.header}>
        <Text style={styles.headerTitle}>Concordia Campus Guide</Text>
        <NextClassDirectionsBanner />
    </View> 
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#912338',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
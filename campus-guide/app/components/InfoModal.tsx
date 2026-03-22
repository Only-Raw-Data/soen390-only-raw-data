import * as React from "react";
import { Modal, Pressable, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PointOfInterest } from "@app/types/poi";
import { getPoiInfo } from "@/constants/poi";
import styles from "./InfoModal.styles"; // Assuming styles are extracted

interface InfoModalProps {
  readonly poi: PointOfInterest | null;
  readonly onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ poi, onClose }) => {
  if (!poi) return null;
  const info = getPoiInfo(poi.type);

  return (
    <Modal
      visible={!!poi}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="poi-info-modal"
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
        testID="modal-overlay"
      >
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />

          <View style={styles.modalIconRow}>
            <View
              style={[
                styles.modalIconCircle,
                { backgroundColor: info.color + "22" },
              ]}
            >
              <Ionicons name={info.icon as any} size={32} color={info.color} />
            </View>
          </View>

          <Text style={styles.modalName}>{poi.name}</Text>
          <Text style={styles.modalType}>{poi.type.replaceAll("_", " ")}</Text>

          {poi.distance !== undefined && (
            <View style={styles.modalRow}>
              <Ionicons name="walk-outline" size={16} color="#6B7280" />
              <Text style={styles.modalRowText}>{poi.distance} away</Text>
            </View>
          )}

          {poi.address && (
            <View style={styles.modalRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.modalRowText}>{poi.address}</Text>
            </View>
          )}

          {poi.openingHours && (
            <View style={styles.modalRow}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.modalRowText}>{poi.openingHours}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={onClose}
            testID="modal-close-btn"
          >
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default InfoModal;

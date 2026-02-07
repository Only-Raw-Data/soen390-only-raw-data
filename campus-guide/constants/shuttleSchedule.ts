export interface ShuttleTime {
  loyola: string;  // "09:15" or "18:30*"
  sgw: string | null;  // "09:30" or null for last bus
  isLastBus?: boolean;
}

export interface ShuttleSchedule {
  mondayThursday: ShuttleTime[];
  friday: ShuttleTime[];
}

export const SHUTTLE_SCHEDULE: ShuttleSchedule = {
  mondayThursday: [
    { loyola: '09:15', sgw: '09:30' },
    { loyola: '09:30', sgw: '09:45' },
    { loyola: '09:45', sgw: '10:00' },
    { loyola: '10:00', sgw: '10:15' },
    { loyola: '10:15', sgw: '10:30' },
    { loyola: '10:30', sgw: '10:45' },
    { loyola: '10:45', sgw: '11:00' },
    { loyola: '11:00', sgw: '11:15' },
    { loyola: '11:15', sgw: '11:30' },
    { loyola: '11:30', sgw: '12:15' },
    { loyola: '11:45', sgw: '12:30' },
    { loyola: '12:30', sgw: '12:45' },
    { loyola: '12:45', sgw: '13:00' },
    { loyola: '13:00', sgw: '13:15' },
    { loyola: '13:15', sgw: '13:30' },
    { loyola: '13:30', sgw: '13:45' },
    { loyola: '13:45', sgw: '14:00' },
    { loyola: '14:00', sgw: '14:15' },
    { loyola: '14:15', sgw: '14:30' },
    { loyola: '14:30', sgw: '14:45' },
    { loyola: '14:45', sgw: '15:00' },
    { loyola: '15:00', sgw: '15:15' },
    { loyola: '15:15', sgw: '15:30' },
    { loyola: '15:30', sgw: '16:00' },
    { loyola: '15:45', sgw: '16:15' },
    { loyola: '16:30', sgw: '16:45' },
    { loyola: '16:45', sgw: '17:00' },
    { loyola: '17:00', sgw: '17:15' },
    { loyola: '17:15', sgw: '17:30' },
    { loyola: '17:30', sgw: '17:45' },
    { loyola: '17:45', sgw: '18:00' },
    { loyola: '18:00', sgw: '18:15' },
    { loyola: '18:15', sgw: '18:30*', isLastBus: true },
    { loyola: '18:30*', sgw: null, isLastBus: true },
  ],
  friday: [
    { loyola: '09:15', sgw: '09:45' },
    { loyola: '09:30', sgw: '10:00' },
    { loyola: '09:45', sgw: '10:15' },
    { loyola: '10:15', sgw: '10:45' },
    { loyola: '10:45', sgw: '11:15' },
    { loyola: '11:00', sgw: '11:30' },
    { loyola: '11:15', sgw: '12:15' },
    { loyola: '12:00', sgw: '12:30' },
    { loyola: '12:15', sgw: '12:45' },
    { loyola: '12:45', sgw: '13:15' },
    { loyola: '13:00', sgw: '13:45' },
    { loyola: '13:15', sgw: '14:00' },
    { loyola: '13:45', sgw: '14:15' },
    { loyola: '14:15', sgw: '14:45' },
    { loyola: '14:30', sgw: '15:00' },
    { loyola: '14:45', sgw: '15:15' },
    { loyola: '15:15', sgw: '15:45' },
    { loyola: '15:30', sgw: '16:00' },
    { loyola: '15:45', sgw: '16:45' },
    { loyola: '16:45', sgw: '17:15' },
    { loyola: '17:15', sgw: '17:45' },
    { loyola: '17:45', sgw: '18:15*', isLastBus: true },
    { loyola: '18:15*', sgw: null, isLastBus: true },
  ],
};


// src/utils/vaccineSchedule.ts

import { NEPAL_NIP_SCHEDULE } from '../data/nepaliVaccines';
import { VaccineRecord } from '../types';

export type VaccineStatus = 'given' | 'due' | 'upcoming' | 'missed';

export interface ComputedVaccine {
  id: string;
  name: string;
  nameNepali: string;
  scheduledDate: string;
  dueAge: string;     // e.g., "6 weeks"
  status: VaccineStatus;
  daysUntilDue: number;  // negative if missed
  description: string;
  descriptionNepali: string;
  ageInDays: number;
}

export const computeVaccineSchedule = (
  dateOfBirth: string,
  givenVaccines: VaccineRecord[],
  language: 'en' | 'ne' = 'en'
): ComputedVaccine[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dob = new Date(dateOfBirth);
  dob.setHours(0, 0, 0, 0);
  
  const givenIds = new Set(givenVaccines.filter(v => v.isGiven).map(v => v.vaccineName));

  return NEPAL_NIP_SCHEDULE.map(vaccine => {
    const scheduledDate = new Date(dob.getTime() + vaccine.ageInDays * 24 * 60 * 60 * 1000);
    scheduledDate.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isGiven = givenIds.has(vaccine.id);

    let status: VaccineStatus;
    if (isGiven) {
      status = 'given';
    } else if (daysUntilDue < 0) {
      status = 'missed';      
    } else if (daysUntilDue <= 14) {
      status = 'due';         
    } else {
      status = 'upcoming';    
    }

    // Calculate age label exactly as defined in the protocol
    const days = vaccine.ageInDays;
    let dueAge: string;
    if (language === 'en') {
      if (days === 0) dueAge = 'At Birth';
      else if (days === 42) dueAge = '6 weeks';
      else if (days === 70) dueAge = '10 weeks';
      else if (days === 98) dueAge = '14 weeks';
      else if (days === 274) dueAge = '9 months';
      else if (days === 365) dueAge = '12 months';
      else if (days === 456) dueAge = '15 months';
      else dueAge = `${Math.round(days / 30.44)} months`;
    } else {
      if (days === 0) dueAge = 'जन्मदा';
      else if (days === 42) dueAge = '६ हप्ता';
      else if (days === 70) dueAge = '१० हप्ता';
      else if (days === 98) dueAge = '१४ हप्ता';
      else if (days === 274) dueAge = '९ महिना';
      else if (days === 365) dueAge = '१२ महिना';
      else if (days === 456) dueAge = '१५ महिना';
      else dueAge = `${Math.round(days / 30.44)} महिना`;
    }

    return {
      id: vaccine.id,
      name: vaccine.name,
      nameNepali: vaccine.nameNepali,
      scheduledDate: scheduledDate.toISOString().split('T')[0],
      dueAge,
      status,
      daysUntilDue,
      description: vaccine.description,
      descriptionNepali: vaccine.descriptionNepali,
      ageInDays: vaccine.ageInDays,
    };
  });
};

export const getVaccineSummary = (vaccines: ComputedVaccine[]) => ({
  total: vaccines.length,
  given: vaccines.filter(v => v.status === 'given').length,
  due: vaccines.filter(v => v.status === 'due').length,
  missed: vaccines.filter(v => v.status === 'missed').length,
  upcoming: vaccines.filter(v => v.status === 'upcoming').length,
});

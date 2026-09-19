// src/types/destination.ts
export interface DaySchedule {
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

export type OpeningHoursMap = {
  mon?: DaySchedule;
  tue?: DaySchedule;
  wed?: DaySchedule;
  thu?: DaySchedule;
  fri?: DaySchedule;
  sat?: DaySchedule;
  sun?: DaySchedule;
  [key: string]: DaySchedule | undefined;
};

export interface TodayStatus {
  status: "open" | "closed" | "unset";
  label: string;
  timeRange?: string;
}

export interface Destination {
  id: string | number;
  name: string;
  category?: string;
  description?: string;
  location?: string;
  phone?: string;
  hours?: string;
  min_price?: number;
  max_price?: number;
  image_url?: string;
  images?: string[];
  open_days?: string[];
  opening_hours?: OpeningHoursMap;
  rating?: {
    avg: number;
    count: number;
  };
}
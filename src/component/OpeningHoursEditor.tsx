"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, Check, X, Copy, Sparkles, AlertCircle } from "lucide-react";
import type { DaySchedule, OpeningHoursMap } from "@/types/destination";

export interface DayConfig {
  key: string;
  shortLabel: string;
  fullLabel: string;
  defaultOpenTime: string;
  defaultCloseTime: string;
}

export const DAYS_CONFIG: DayConfig[] = [
  { key: "mon", shortLabel: "จ.", fullLabel: "จันทร์", defaultOpenTime: "08:00", defaultCloseTime: "17:00" },
  { key: "tue", shortLabel: "อ.", fullLabel: "อังคาร", defaultOpenTime: "08:00", defaultCloseTime: "17:00" },
  { key: "wed", shortLabel: "พ.", fullLabel: "พุธ", defaultOpenTime: "08:00", defaultCloseTime: "17:00" },
  { key: "thu", shortLabel: "พฤ.", fullLabel: "พฤหัสบดี", defaultOpenTime: "08:00", defaultCloseTime: "17:00" },
  { key: "fri", shortLabel: "ศ.", fullLabel: "ศุกร์", defaultOpenTime: "08:00", defaultCloseTime: "17:00" },
  { key: "sat", shortLabel: "ส.", fullLabel: "เสาร์", defaultOpenTime: "08:00", defaultCloseTime: "17:00" },
  { key: "sun", shortLabel: "อา.", fullLabel: "อาทิตย์", defaultOpenTime: "08:00", defaultCloseTime: "17:00" },
];

export const DEFAULT_OPENING_HOURS: OpeningHoursMap = DAYS_CONFIG.reduce((acc, d) => {
  acc[d.key] = {
    is_open: true,
    open_time: d.defaultOpenTime,
    close_time: d.defaultCloseTime,
  };
  return acc;
}, {} as OpeningHoursMap);

interface OpeningHoursEditorProps {
  value?: OpeningHoursMap | null;
  openDays?: string[] | null;
  onChange: (hours: OpeningHoursMap, openDaysList: string[], isValid: boolean) => void;
}

export default function OpeningHoursEditor({
  value,
  openDays,
  onChange,
}: OpeningHoursEditorProps) {
  // Initialize schedule from value or openDays
  const [schedule, setSchedule] = useState<OpeningHoursMap>(() => {
    if (value && typeof value === "object" && Object.keys(value).length > 0) {
      const initial: OpeningHoursMap = {};
      DAYS_CONFIG.forEach((d) => {
        const existing = value[d.key];
        if (existing) {
          initial[d.key] = {
            is_open: Boolean(existing.is_open),
            open_time: existing.open_time || d.defaultOpenTime,
            close_time: existing.close_time || d.defaultCloseTime,
          };
        } else {
          initial[d.key] = {
            is_open: true,
            open_time: d.defaultOpenTime,
            close_time: d.defaultCloseTime,
          };
        }
      });
      return initial;
    }

    if (openDays && Array.isArray(openDays) && openDays.length > 0) {
      const initial: OpeningHoursMap = {};
      DAYS_CONFIG.forEach((d) => {
        const isOpen = openDays.includes(d.key);
        initial[d.key] = {
          is_open: isOpen,
          open_time: isOpen ? d.defaultOpenTime : null,
          close_time: isOpen ? d.defaultCloseTime : null,
        };
      });
      return initial;
    }

    return DEFAULT_OPENING_HOURS;
  });

  // Quick apply state
  const [applyTimeOpen, setApplyTimeOpen] = useState("08:00");
  const [applyTimeClose, setApplyTimeClose] = useState("17:00");
  const [showApplySameModal, setShowApplySameModal] = useState(false);

  // Validate schedule
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    DAYS_CONFIG.forEach((d) => {
      const dayData = schedule[d.key];
      if (dayData?.is_open) {
        if (!dayData.open_time || !dayData.close_time) {
          errors[d.key] = "กรุณากรอกเวลาเปิดและปิด";
        } else if (dayData.open_time >= dayData.close_time) {
          errors[d.key] = "เวลาเปิดต้องน้อยกว่าเวลาปิด";
        }
      }
    });
    return errors;
  }, [schedule]);

  const isValid = Object.keys(validationErrors).length === 0;

  // Active open days list
  const activeDaysList = useMemo(() => {
    return DAYS_CONFIG.filter((d) => schedule[d.key]?.is_open).map((d) => d.key);
  }, [schedule]);

  // Sync upwards when schedule changes
  useEffect(() => {
    onChange(schedule, activeDaysList, isValid);
  }, [schedule, activeDaysList, isValid, onChange]);

  const toggleDay = (key: string) => {
    setSchedule((prev) => {
      const current = prev[key] || { is_open: false, open_time: "08:00", close_time: "17:00" };
      const willBeOpen = !current.is_open;
      return {
        ...prev,
        [key]: {
          ...current,
          is_open: willBeOpen,
          open_time: willBeOpen ? current.open_time || "08:00" : null,
          close_time: willBeOpen ? current.close_time || "17:00" : null,
        },
      };
    });
  };

  const updateTime = (key: string, field: "open_time" | "close_time", val: string) => {
    setSchedule((prev) => {
      const current = prev[key] || { is_open: true, open_time: "08:00", close_time: "17:00" };
      return {
        ...prev,
        [key]: {
          ...current,
          is_open: true,
          [field]: val,
        },
      };
    });
  };

  // Quick action: Apply same time to all open days
  const handleApplySameTimeToAll = () => {
    if (!applyTimeOpen || !applyTimeClose || applyTimeOpen >= applyTimeClose) return;

    setSchedule((prev) => {
      const updated: OpeningHoursMap = { ...prev };
      DAYS_CONFIG.forEach((d) => {
        // apply to days that are currently open (or all if none are open)
        const dayData = updated[d.key];
        if (dayData?.is_open || activeDaysList.length === 0) {
          updated[d.key] = {
            is_open: true,
            open_time: applyTimeOpen,
            close_time: applyTimeClose,
          };
        }
      });
      return updated;
    });
    setShowApplySameModal(false);
  };

  // Preset buttons
  const setAllDays = (open: boolean) => {
    setSchedule((prev) => {
      const updated: OpeningHoursMap = { ...prev };
      DAYS_CONFIG.forEach((d) => {
        updated[d.key] = {
          is_open: open,
          open_time: open ? "08:00" : null,
          close_time: open ? "17:00" : null,
        };
      });
      return updated;
    });
  };

  const setWeekdaysOnly = () => {
    setSchedule((prev) => {
      const updated: OpeningHoursMap = { ...prev };
      DAYS_CONFIG.forEach((d) => {
        const isWeekday = ["mon", "tue", "wed", "thu", "fri"].includes(d.key);
        updated[d.key] = {
          is_open: isWeekday,
          open_time: isWeekday ? "08:00" : null,
          close_time: isWeekday ? "17:00" : null,
        };
      });
      return updated;
    });
  };

  const setWeekendOnly = () => {
    setSchedule((prev) => {
      const updated: OpeningHoursMap = { ...prev };
      DAYS_CONFIG.forEach((d) => {
        const isWeekend = ["sat", "sun"].includes(d.key);
        updated[d.key] = {
          is_open: isWeekend,
          open_time: isWeekend ? "08:00" : null,
          close_time: isWeekend ? "17:00" : null,
        };
      });
      return updated;
    });
  };

  // Active and closed days count
  const openCount = activeDaysList.length;
  const closedCount = 7 - openCount;

  return (
    <div className="space-y-3">
      {/* Header with Title and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-zinc-200">
        <div>
          <label className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            วันและเวลาเปิดให้บริการ (7 วัน)
          </label>
          <div className="flex items-center gap-2 mt-0.5 text-xs">
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              เปิด {openCount} วัน
            </span>
            {closedCount > 0 && (
              <span className="font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                ปิด {closedCount} วัน
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setShowApplySameModal(!showApplySameModal)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors border border-blue-200"
          >
            <Copy size={13} />
            ใช้เวลาเดียวกันทุกวัน
          </button>
          <button
            type="button"
            onClick={() => setAllDays(true)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors"
          >
            เปิดทุกวัน
          </button>
          <button
            type="button"
            onClick={setWeekdaysOnly}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors"
          >
            จ.-ศ.
          </button>
          <button
            type="button"
            onClick={setWeekendOnly}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors"
          >
            ส.-อา.
          </button>
          <button
            type="button"
            onClick={() => setAllDays(false)}
            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors border border-rose-200/60"
          >
            ปิดทุกวัน
          </button>
        </div>
      </div>

      {/* "ใช้เวลาเดียวกันทุกวัน" helper drawer/box */}
      {showApplySameModal && (
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-blue-950 block">ตั้งเวลาเปิด-ปิดให้กับทุกวันที่เลือกเปิด:</span>
              <span className="text-[11px] text-blue-700">จะนำเวลานี้ไปใส่ในวันที่เปิดให้บริการทั้งหมดทันที</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="time"
              value={applyTimeOpen}
              onChange={(e) => setApplyTimeOpen(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-zinc-400 font-bold">-</span>
            <input
              type="time"
              value={applyTimeClose}
              onChange={(e) => setApplyTimeClose(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleApplySameTimeToAll}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              นำไปใช้กับทุกวัน
            </button>
            <button
              type="button"
              onClick={() => setShowApplySameModal(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-blue-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 7 Days List Container */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100 bg-white shadow-xs">
        {DAYS_CONFIG.map((day) => {
          const item = schedule[day.key] || { is_open: false, open_time: null, close_time: null };
          const isOpen = Boolean(item.is_open);
          const errorMsg = validationErrors[day.key];

          return (
            <div
              key={day.key}
              className={`p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${
                isOpen ? "bg-white hover:bg-blue-50/20" : "bg-zinc-50/70 hover:bg-zinc-100/60"
              }`}
            >
              {/* Day Toggle & Name */}
              <div className="flex items-center gap-3 select-none min-w-[170px]">
                {/* Status Toggle Button */}
                <button
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                    isOpen
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                      : "bg-zinc-200/80 text-zinc-600 border-zinc-300 hover:bg-zinc-300"
                  }`}
                >
                  {isOpen ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      เปิด
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      ปิดทำการ
                    </>
                  )}
                </button>

                <span
                  onClick={() => toggleDay(day.key)}
                  className={`text-sm font-bold cursor-pointer transition-colors ${
                    isOpen ? "text-zinc-900" : "text-zinc-400"
                  }`}
                >
                  {day.fullLabel}
                </span>
              </div>

              {/* Time inputs or Closed State */}
              <div className="flex items-center gap-2.5 pl-2 sm:pl-0 flex-wrap">
                {isOpen ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200">
                      <span className="text-xs text-zinc-500 font-semibold">เปิด</span>
                      <input
                        type="time"
                        value={item.open_time || "08:00"}
                        onChange={(e) => updateTime(day.key, "open_time", e.target.value)}
                        className={`h-7 px-2 text-xs border rounded-md bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errorMsg ? "border-red-400 bg-red-50/30" : "border-zinc-300 text-zinc-800"
                        }`}
                      />
                      <span className="text-zinc-400 text-xs font-bold">-</span>
                      <span className="text-xs text-zinc-500 font-semibold">ปิด</span>
                      <input
                        type="time"
                        value={item.close_time || "17:00"}
                        onChange={(e) => updateTime(day.key, "close_time", e.target.value)}
                        className={`h-7 px-2 text-xs border rounded-md bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errorMsg ? "border-red-400 bg-red-50/30" : "border-zinc-300 text-zinc-800"
                        }`}
                      />
                      <span className="text-xs text-zinc-400 font-medium">น.</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        updateTime(day.key, "open_time", "00:00");
                        updateTime(day.key, "close_time", "23:59");
                      }}
                      className="text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md border border-blue-200 font-semibold transition-colors"
                      title="ตั้งเป็นเปิดตลอด 24 ชั่วโมง (00:00 - 23:59)"
                    >
                      24 ชม.
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 italic">
                      ปิดทำการ (ไม่เปิดให้บริการในวันนี้)
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                    >
                      + เปิดวันนี้
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <span className="text-xs font-semibold text-red-600 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    <AlertCircle size={13} />
                    {errorMsg}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

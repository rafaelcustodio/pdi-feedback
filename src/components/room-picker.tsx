"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Users, Building2, Loader2 } from "lucide-react";
import { fetchRoomsWithAvailability, hasMicrosoftToken } from "@/app/(dashboard)/feedbacks/actions";
import type { RoomAvailability } from "@/app/(dashboard)/feedbacks/actions";
import type { WizardRoom } from "@/app/(dashboard)/programacao/actions";

interface RoomPickerProps {
  date: string;
  startTime: string;
  endTime: string;
  onSelect: (room: { email: string; displayName: string } | null) => void;
  selectedRoomEmail?: string;
}

export function RoomPicker({
  date,
  startTime,
  endTime,
  onSelect,
  selectedRoomEmail,
}: RoomPickerProps) {
  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check once on mount if user has Microsoft SSO token
  useEffect(() => {
    hasMicrosoftToken().then(setHasToken);
  }, []);

  useEffect(() => {
    // Skip if no SSO token or no date/time
    if (hasToken === false || !date || !startTime) {
      setRooms([]);
      setHasLoaded(false);
      return;
    }
    // Wait for token check to complete
    if (hasToken === null) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const computedEnd = endTime || `${String(parseInt(startTime.split(":")[0]) + 1).padStart(2, "0")}:${startTime.split(":")[1]}`;
        const result = await fetchRoomsWithAvailability(date, startTime, computedEnd);
        setRooms(result);
        setHasLoaded(true);
      } catch {
        setRooms([]);
        setHasLoaded(true);
      }
      setLoading(false);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [date, startTime, endTime, hasToken]);

  // Don't render if no SSO token
  if (hasToken === false) return null;
  // Don't render if no rooms available
  if (!hasLoaded && !loading) return null;
  if (hasLoaded && rooms.length === 0 && !loading) return null;

  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <MapPin size={14} />
        Sala de Reunião
      </label>

      {loading ? (
        <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 size={14} className="animate-spin" />
          Buscando salas disponíveis...
        </div>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
          {/* Option: no room */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              !selectedRoomEmail
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-medium"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Sem sala (reunião virtual ou presencial sem reserva)
          </button>

          {rooms.map(({ room, available }) => (
            <button
              key={room.id}
              type="button"
              disabled={!available}
              onClick={() => onSelect({ email: room.emailAddress, displayName: room.displayName })}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedRoomEmail === room.emailAddress
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-medium"
                  : available
                    ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    : "cursor-not-allowed text-gray-400 dark:text-gray-600 opacity-60"
              }`}
              title={!available ? "Sala ocupada neste horário" : undefined}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                    available ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="truncate">{room.displayName}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {room.building && (
                  <span className="flex items-center gap-0.5">
                    <Building2 size={12} />
                    {room.building}
                    {room.floorNumber != null && `, ${room.floorNumber}º`}
                  </span>
                )}
                {room.capacity != null && (
                  <span className="flex items-center gap-0.5">
                    <Users size={12} />
                    {room.capacity}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Compact variant for the wizard (inline select)
// ============================================================

interface RoomPickerCompactProps {
  rooms: WizardRoom[];
  selectedRoomEmail?: string;
  onSelect: (room: { email: string; displayName: string } | null) => void;
  loading?: boolean;
}

export function RoomPickerCompact({
  rooms,
  selectedRoomEmail,
  onSelect,
  loading,
}: RoomPickerCompactProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 size={14} className="animate-spin" />
        <span>Carregando salas...</span>
      </div>
    );
  }

  if (rooms.length === 0) return null;

  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <MapPin size={14} />
        Sala preferida (opcional)
      </label>
      <select
        value={selectedRoomEmail || ""}
        onChange={(e) => {
          const email = e.target.value;
          if (!email) {
            onSelect(null);
          } else {
            const room = rooms.find((r) => r.emailAddress === email);
            if (room) onSelect({ email: room.emailAddress, displayName: room.displayName });
          }
        }}
        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Sem sala (horário fixo 09:00)</option>
        {rooms.map((room) => (
          <option key={room.emailAddress} value={room.emailAddress}>
            {room.displayName}
            {room.building ? ` — ${room.building}` : ""}
            {room.capacity ? ` (${room.capacity} lug.)` : ""}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Ao selecionar uma sala, os horários serão distribuídos nos slots livres automaticamente.
      </p>
    </div>
  );
}

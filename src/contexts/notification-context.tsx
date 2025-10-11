"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { NotificationContainer } from "@/components/ui/notification";

type NotificationVariant = "default" | "success" | "error";

interface Notification {
  id: string;
  title: string;
  message: string;
  variant?: NotificationVariant;
}

interface NotificationContextType {
  showNotification: (params: { title: string; message: string; variant?: NotificationVariant }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback(
    ({
      title,
      message,
      variant = "default",
    }: { title: string; message: string; variant?: NotificationVariant }) => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications((prev) => [...prev, { id, title, message, variant }]);
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
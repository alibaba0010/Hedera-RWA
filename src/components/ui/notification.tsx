"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationProps {
  id: string;
  title: string;
  message: string;
  variant?: "default" | "success" | "error";
  onClose: (id: string) => void;
  duration?: number;
}

export function Notification({
  id,
  title,
  message,
  variant = "default",
  onClose,
  duration = 5000,
}: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const variantStyles = {
    default:
      "bg-blue-500/90 dark:bg-white text-blue-50 dark:text-gray-900 border dark:border-gray-200",
    success: "bg-green-500/90 dark:bg-green-600/90 text-white",
    error: "bg-red-500/90 dark:bg-red-600/90 text-white",
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`rounded-lg shadow-lg flex flex-col min-w-[300px] max-w-[500px] p-4 ${variantStyles}`}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <p className="text-sm mt-1 pr-4">{message}</p>
    </motion.div>
  );
}

export function NotificationContainer({
  notifications,
  onClose,
}: {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    variant?: "default" | "success" | "error";
  }>;
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            {...notification}
            onClose={onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

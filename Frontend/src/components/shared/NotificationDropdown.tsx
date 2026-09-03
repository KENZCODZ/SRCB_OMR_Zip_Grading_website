import React, { useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  FileText,
  GraduationCap,
  UserCheck,
  AlertCircle,
  Info,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";
import type { AppNotification } from "../../types";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDeleteNotification: (id: string) => void;
  onSelectNotification?: (notification: AppNotification) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDeleteNotification,
  onSelectNotification,
}) => {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const getNotificationIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "exam":
        return <FileText size={16} color="#0062ff" />;
      case "grade":
        return <GraduationCap size={16} color="#059669" />;
      case "user":
        return <UserCheck size={16} color="#7c3aed" />;
      case "warning":
      case "alert":
        return <AlertCircle size={16} color="#e11d48" />;
      case "success":
        return <Sparkles size={16} color="#059669" />;
      case "info":
      default:
        return <Info size={16} color="#0284c7" />;
    }
  };

  const getNotificationBadgeBg = (type: AppNotification["type"]) => {
    switch (type) {
      case "exam":
        return "#eff6ff";
      case "grade":
        return "#ecfdf5";
      case "user":
        return "#f5f3ff";
      case "warning":
      case "alert":
        return "#fff1f2";
      case "success":
        return "#ecfdf5";
      case "info":
      default:
        return "#f0f9ff";
    }
  };

  return (
    <div
      className="header-notifications-dropdown"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: "380px",
        maxWidth: "92vw",
        background: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.18), 0 0 1px 1px rgba(0, 0, 0, 0.05)",
        border: "1px solid #e2e8f0",
        zIndex: 1000,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: "slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.25rem 0.75rem",
          borderBottom: "1px solid #f1f5f9",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span
                style={{
                  background: "#0062ff",
                  color: "#ffffff",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                title="Mark all as read"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0062ff",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "6px",
                }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                title="Clear all notifications"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.2rem 0.35rem",
                  borderRadius: "6px",
                }}
              >
                <Trash2 size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#f8fafc",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: filter === "all" ? "#0062ff" : "#f1f5f9",
              color: filter === "all" ? "#ffffff" : "#64748b",
              transition: "all 0.15s ease",
            }}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: filter === "unread" ? "#0062ff" : "#f1f5f9",
              color: filter === "unread" ? "#ffffff" : "#64748b",
              transition: "all 0.15s ease",
            }}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* List Content */}
      <div
        style={{
          maxHeight: "360px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {filteredNotifications.length === 0 ? (
          <div
            style={{
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.75rem",
                color: "#64748b",
              }}
            >
              <Bell size={20} />
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#334155" }}>
              All Caught Up!
            </div>
            <div style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
              {filter === "unread"
                ? "No unread notifications right now."
                : "No new activity or alerts."}
            </div>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                onMarkAsRead(notif.id);
                if (onSelectNotification) {
                  onSelectNotification(notif);
                }
              }}
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.85rem 1.25rem",
                borderBottom: "1px solid #f8fafc",
                background: notif.read ? "#ffffff" : "#f0f7ff",
                cursor: "pointer",
                transition: "background 0.15s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = notif.read ? "#f8fafc" : "#e0efff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = notif.read ? "#ffffff" : "#f0f7ff";
              }}
            >
              {/* Type Icon */}
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: getNotificationBadgeBg(notif.type),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                {getNotificationIcon(notif.type)}
              </div>

              {/* Text Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    marginBottom: "0.15rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.84rem",
                      fontWeight: notif.read ? 600 : 800,
                      color: notif.read ? "#334155" : "#0f172a",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {notif.title}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", flexShrink: 0 }}>
                    {notif.timestamp}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "0.78rem",
                    color: notif.read ? "#64748b" : "#334155",
                    lineHeight: 1.4,
                  }}
                >
                  {notif.message}
                </p>
              </div>

              {/* Action / Delete / Unread indicator */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                {!notif.read && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#0062ff",
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNotification(notif.id);
                  }}
                  title="Remove"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "2px",
                    borderRadius: "4px",
                    opacity: 0.6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dropdown Footer */}
      <div
        style={{
          padding: "0.6rem 1.25rem",
          background: "#f8fafc",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: "#64748b",
        }}
      >
        <span>SRCB Academic Stream</span>
        <span style={{ display: "flex", alignItems: "center", gap: "2px", color: "#0062ff", fontWeight: 700 }}>
          Real-time <ChevronRight size={12} />
        </span>
      </div>
    </div>
  );
};

export default NotificationDropdown;

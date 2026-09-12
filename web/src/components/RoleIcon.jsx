// components/RoleIcon.jsx — Unified duotone SVG icon set for MeteoX roles
import React from "react";

export default function RoleIcon({ role, size = 24, className = "" }) {
  const normalizedRole = (role || "").toLowerCase();

  switch (normalizedRole) {
    case "farmer":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`role-icon role-icon-farmer ${className}`}
        >
          <path
            d="M12 22V12M12 12C12 7.5 8.5 4 3 4C3 9.5 6.5 13 12 13M12 12C12 7.5 15.5 4 21 4C21 9.5 17.5 13 12 13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 4C3 9.5 6.5 13 12 13C12 7.5 8.5 4 3 4Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path
            d="M21 4C21 9.5 17.5 13 12 13C12 7.5 15.5 4 21 4Z"
            fill="currentColor"
            fillOpacity="0.28"
          />
        </svg>
      );

    case "fisherman":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`role-icon role-icon-fisherman ${className}`}
        >
          <path
            d="M2 16C5 14 7 14 10 16C13 18 15 18 18 16C20 14.67 21.5 15 22 15.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M2 20C5 18 7 18 10 20C13 22 15 22 18 20C20 18.67 21.5 19 22 19.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16 11C18.5 9.5 21 9 22 7C20 6.5 18.5 7.5 16.5 8.5C14.5 5 10.5 4.5 6.5 7C5 8 4 10 4 11.5C6.5 13.5 12 13.5 16 11Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M16 11C18.5 9.5 21 9 22 7C20 6.5 18.5 7.5 16.5 8.5C14.5 5 10.5 4.5 6.5 7C5 8 4 10 4 11.5C6.5 13.5 12 13.5 16 11Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <circle cx="8.5" cy="8" r="1" fill="currentColor" />
        </svg>
      );

    case "city_admin":
    case "cityadmin":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`role-icon role-icon-city ${className}`}
        >
          <path
            d="M3 21H21M4 21V8L12 3L20 8V21M9 21V16H15V21"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 8L12 3L20 8V21H4V8Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path
            d="M8 10H10M14 10H16M8 13H10M14 13H16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "general":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`role-icon role-icon-general ${className}`}
        >
          <path
            d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <circle
            cx="12"
            cy="9"
            r="3"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="currentColor"
            fillOpacity="0.25"
          />
        </svg>
      );

    case "researcher":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`role-icon role-icon-researcher ${className}`}
        >
          <path
            d="M6 21H18M9 21V19M15 21V19M9 19H15M14 8L18 12M9 3L15 9L12 12L6 6L9 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 3L15 9L12 12L6 6L9 3Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <circle
            cx="11"
            cy="15"
            r="3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`role-icon ${className}`}
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path
            d="M12 8V12L15 15"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

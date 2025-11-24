import type { CalendarEvent } from "@/pages/Index";

const CUSTOMER_TITLE_FALLBACK = "No Customer Details Provided";
export const CUSTOMER_NAME_FALLBACK = "No customer details provided";
export const CUSTOMER_EMAIL_FALLBACK = "No customer email provided";
export const CUSTOMER_PHONE_FALLBACK = "No phone number provided";

const sanitizeText = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const getCustomerNameForTitle = (event: CalendarEvent): string => {
  const cleaned = sanitizeText(event.customerName);
  return cleaned ?? CUSTOMER_TITLE_FALLBACK;
};

export const getCustomerNameDisplay = (event: CalendarEvent): string => {
  const cleaned = sanitizeText(event.customerName);
  return cleaned ?? CUSTOMER_NAME_FALLBACK;
};

export const getCustomerEmailDisplay = (event: CalendarEvent): string => {
  const cleaned = sanitizeText(event.customerEmail);
  return cleaned ?? CUSTOMER_EMAIL_FALLBACK;
};

export const getCustomerPhoneDisplay = (event: CalendarEvent): string => {
  const cleaned = sanitizeText(event.phoneNumber);
  return cleaned ?? CUSTOMER_PHONE_FALLBACK;
};

export const getEventDisplayTitle = (event: CalendarEvent): string => {
  const title = sanitizeText(event.title) ?? "Untitled Event";
  return `${getCustomerNameForTitle(event)} - ${title}`;
};


// Form validation and feedback text constants

export const FORMS = {
  // Field validation
  fieldRequired: (field: string) => `${field} is required.`,
  fieldTooShort: (field: string, min: number) =>
    `${field} must be at least ${min} characters.`,
  fieldTooLong: (field: string, max: number) =>
    `${field} must be at most ${max} characters.`,
  fieldInvalid: (field: string) => `${field} is invalid.`,
  emailInvalid: "Please enter a valid email address.",
  passwordTooShort: "Password must be at least 8 characters.",
  slugFormat: "Lowercase letters, numbers, and hyphens only (e.g. my-store).",
  slugFormatTenant:
    "Lowercase letters, numbers, and hyphens only (e.g. my-tenant).",

  // Submit feedback
  submitting: "Submitting...",
  submitSuccess: "Submitted successfully.",
  submitFailed: "Submission failed. Please try again.",

  // Common form states
  creating: "Creating...",
  created: (entity: string) => `${entity} created.`,
  createFailed: (entity: string) => `Failed to create ${entity}.`,
  updating: "Updating...",
  updated: (entity: string) => `${entity} updated.`,
  updateFailed: (entity: string) => `Failed to update ${entity}.`,
  deleting: "Deleting...",
  deleted: (entity: string) => `${entity} deleted.`,
  deleteFailed: (entity: string) => `Failed to delete ${entity}.`,
  saving: "Saving...",
  saved: "Changes saved.",
  saveFailed: "Failed to save changes.",

  // Search / filter
  searchPlaceholder: "Search...",
  filterAll: "All",
  noResultsFor: (query: string) => `No results for "${query}".`,

  // Dialogs
  confirmDelete: (entity: string) =>
    `Are you sure you want to delete this ${entity}? This action cannot be undone.`,
  confirmAction: "Are you sure you want to continue?",
} as const;

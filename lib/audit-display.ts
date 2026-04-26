type AuditActionDisplay = {
  title: string;
  description: string;
};

const ACTION_DISPLAY: Record<string, AuditActionDisplay> = {
  USER_LOGIN: {
    title: "School user signed in",
    description: "A school account successfully logged in."
  },
  PLATFORM_LOGIN: {
    title: "Platform user signed in",
    description: "A platform admin account successfully logged in."
  },
  FEED_POST_CREATED: {
    title: "Feed post created",
    description: "A new school feed announcement was published."
  },
  FEED_LAST_SEEN: {
    title: "Feed viewed",
    description: "A user opened the feed and the last-seen timestamp was updated."
  },
  SCHOOL_PROFILE_UPDATE: {
    title: "School profile updated",
    description: "School profile settings were changed."
  },
  STUDENT_DEMOGRAPHICS_CONFIG_UPDATE: {
    title: "Student form settings updated",
    description: "Demographic field configuration for students was changed."
  },
  STUDENT_UPDATE_REQUEST_CREATED: {
    title: "Student update request submitted",
    description: "An update request was raised for student information."
  },
  STUDENT_UPDATE_REQUEST_APPROVED: {
    title: "Student update request approved",
    description: "An admin approved a pending student update request."
  },
  STUDENT_UPDATE_REQUEST_REJECTED: {
    title: "Student update request rejected",
    description: "An admin rejected a pending student update request."
  },
  BUS_LOCATION_UPDATE: {
    title: "Bus location updated",
    description: "A transport location update was recorded."
  },
  BUS_TRIP_STATUS: {
    title: "Bus trip status changed",
    description: "The trip state for a bus was updated."
  },
  BUS_STUDENT_DROP: {
    title: "Student drop marked",
    description: "A student drop-off event was recorded for transport."
  },
  ID_CARD_TEMPLATE_UPDATE: {
    title: "ID card template updated",
    description: "School ID card template settings were changed."
  },
  USER_PROFILE_PHOTO_UPDATE: {
    title: "School user profile photo updated",
    description: "A school user updated their profile photo."
  },
  SCHOOL_USER_PASSWORD_RESET_EMAIL_SENT: {
    title: "School user password reset sent",
    description: "A password reset email was sent to a school user."
  },
  SCHOOL_USER_FORGOT_PASSWORD_REQUESTED: {
    title: "School user forgot-password requested",
    description: "A user requested a password reset from the public forgot-password page."
  },
  PLATFORM_USER_PASSWORD_RESET_EMAIL_SENT: {
    title: "Platform user password reset sent",
    description: "A password reset email was sent to a platform user."
  },
  PLATFORM_USER_FORGOT_PASSWORD_REQUESTED: {
    title: "Platform user forgot-password requested",
    description: "A user requested a password reset from the public forgot-password page."
  },
  PLATFORM_USER_PASSWORD_UPDATED_BY_SUPER_ADMIN: {
    title: "Platform user password updated",
    description: "A super admin directly updated a platform user's password."
  },
  SCHOOL_USER_PASSWORD_UPDATED_BY_ADMIN: {
    title: "School user password updated",
    description: "A school admin directly updated a school user's password."
  },
  SCHOOL_ADMIN_PASSWORD_UPDATED_BY_SUPER_ADMIN: {
    title: "School admin password updated",
    description: "A super admin directly updated a school admin's password."
  },
  PLATFORM_USER_PROFILE_PHOTO_UPDATE: {
    title: "Platform user profile photo updated",
    description: "A platform user updated their profile photo."
  },
  PLATFORM_USER_CREATED_PENDING: {
    title: "Platform user invited",
    description: "A platform user account was created in pending status."
  },
  PLATFORM_USER_APPROVED: {
    title: "Platform user approved",
    description: "A pending platform user account was approved."
  },
  PLATFORM_USER_REJECTED: {
    title: "Platform user rejected",
    description: "A pending platform user account was rejected."
  },
  PLATFORM_USER_UPDATED: {
    title: "Platform user updated",
    description: "Platform user account details were changed."
  },
  PLATFORM_USER_DELETED: {
    title: "Platform user deleted",
    description: "A platform user account was removed."
  },
  PLATFORM_SUPERADMIN_CREATED: {
    title: "Super admin created",
    description: "A new super admin account was provisioned."
  },
  PLATFORM_IMPERSONATE_USER: {
    title: "User impersonation started",
    description: "A platform admin started an impersonation session."
  },
  PLATFORM_SCHOOL_CREATED: {
    title: "School created",
    description: "A new school was created from the platform console."
  },
  PLATFORM_SCHOOL_INVITE_GENERATED: {
    title: "School invite generated",
    description: "An invite link/token was generated for school onboarding."
  },
  PLATFORM_PLAN_CHANGED: {
    title: "School plan changed",
    description: "A school's subscription plan was updated."
  },
  PLATFORM_PLAN_SETTINGS_UPDATED: {
    title: "Plan settings updated",
    description: "Default plan pricing or duration settings were changed."
  },
  PLATFORM_CUSTOM_SUBSCRIPTION_CREATED: {
    title: "Custom subscription created",
    description: "A custom subscription plan was created."
  },
  PLATFORM_MODULE_CREATED: {
    title: "Platform module created",
    description: "A new module definition was added."
  },
  PLATFORM_MODULE_FIELD_ADDED: {
    title: "Module field added",
    description: "A new field was added to a module."
  },
  PLATFORM_MODULE_FIELD_REMOVED: {
    title: "Module field removed",
    description: "An existing field was removed from a module."
  },
  PLATFORM_SCHOOL_MODULE_FIELDS_UPDATED: {
    title: "School module fields updated",
    description: "Module field configuration was updated for a school."
  },
  PLATFORM_ONBOARDING_REQUEST_APPROVED: {
    title: "Onboarding request approved",
    description: "A school onboarding request was approved."
  },
  PLATFORM_ONBOARDING_REQUEST_REJECTED: {
    title: "Onboarding request rejected",
    description: "A school onboarding request was rejected."
  },
  PLATFORM_ONBOARDING_REQUEST_ON_HOLD: {
    title: "Onboarding request put on hold",
    description: "A school onboarding request was moved to hold status."
  },
  PLATFORM_ONBOARDING_APPROVAL_NOTIFICATIONS: {
    title: "Approval notifications sent",
    description: "Approval emails/notifications were sent for onboarding."
  },
  PLATFORM_ONBOARDING_REJECTION_NOTIFICATION: {
    title: "Rejection notifications sent",
    description: "Rejection emails/notifications were sent for onboarding."
  },
  PLATFORM_ONBOARDING_HOLD_NOTIFICATION: {
    title: "Hold notifications sent",
    description: "Hold-status emails/notifications were sent for onboarding."
  },
  PLATFORM_TRIAL_EXTEND_ATTEMPT: {
    title: "Trial extension attempted",
    description: "A platform admin attempted to extend a school trial."
  }
};

export function humanizeAuditToken(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function describeAuditAction(action: string): AuditActionDisplay {
  const fromMap = ACTION_DISPLAY[action];
  if (fromMap) return fromMap;

  const normalized = action.toUpperCase();
  if (normalized.endsWith("_CREATED")) {
    return {
      title: `${humanizeAuditToken(normalized.replace(/_CREATED$/, ""))} created`,
      description: "A new record was created."
    };
  }
  if (normalized.endsWith("_UPDATED") || normalized.endsWith("_UPDATE")) {
    return {
      title: `${humanizeAuditToken(normalized.replace(/_(UPDATED|UPDATE)$/, ""))} updated`,
      description: "Existing data was updated."
    };
  }
  if (normalized.endsWith("_DELETED")) {
    return {
      title: `${humanizeAuditToken(normalized.replace(/_DELETED$/, ""))} deleted`,
      description: "A record was removed."
    };
  }
  if (normalized.endsWith("_APPROVED")) {
    return {
      title: `${humanizeAuditToken(normalized.replace(/_APPROVED$/, ""))} approved`,
      description: "An approval action was completed."
    };
  }
  if (normalized.endsWith("_REJECTED")) {
    return {
      title: `${humanizeAuditToken(normalized.replace(/_REJECTED$/, ""))} rejected`,
      description: "A rejection action was completed."
    };
  }
  return {
    title: humanizeAuditToken(action),
    description: "Action recorded in the audit trail."
  };
}

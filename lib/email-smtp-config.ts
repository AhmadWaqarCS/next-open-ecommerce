export interface SmtpEnvKeys {
  hostKey: string;
  portKey: string;
  secureKey: string;
  userKey: string;
  passKey: string;
}

export interface SmtpResolvedConfig {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  envKeys: SmtpEnvKeys;
}

export const EMAIL_PURPOSE_ENV_KEYS: Record<string, SmtpEnvKeys> = {
  order_completion: {
    hostKey: "SMTP_ORDER_COMPLETION_HOST",
    portKey: "SMTP_ORDER_COMPLETION_PORT",
    secureKey: "SMTP_ORDER_COMPLETION_SECURE",
    userKey: "SMTP_ORDER_COMPLETION_USER",
    passKey: "SMTP_ORDER_COMPLETION_PASS",
  },
  marketing: {
    hostKey: "SMTP_MARKETING_HOST",
    portKey: "SMTP_MARKETING_PORT",
    secureKey: "SMTP_MARKETING_SECURE",
    userKey: "SMTP_MARKETING_USER",
    passKey: "SMTP_MARKETING_PASS",
  },
  otp_verification: {
    hostKey: "SMTP_OTP_VERIFICATION_HOST",
    portKey: "SMTP_OTP_VERIFICATION_PORT",
    secureKey: "SMTP_OTP_VERIFICATION_SECURE",
    userKey: "SMTP_OTP_VERIFICATION_USER",
    passKey: "SMTP_OTP_VERIFICATION_PASS",
  },
  system: {
    hostKey: "SMTP_SYSTEM_HOST",
    portKey: "SMTP_SYSTEM_PORT",
    secureKey: "SMTP_SYSTEM_SECURE",
    userKey: "SMTP_SYSTEM_USER",
    passKey: "SMTP_SYSTEM_PASS",
  },
};

export function getSmtpEnvVarsForPurpose(purpose: string = "marketing"): SmtpResolvedConfig {
  const normPurpose = purpose.trim().toLowerCase();
  const envKeys = EMAIL_PURPOSE_ENV_KEYS[normPurpose] || {
    hostKey: `SMTP_${normPurpose.toUpperCase()}_HOST`,
    portKey: `SMTP_${normPurpose.toUpperCase()}_PORT`,
    secureKey: `SMTP_${normPurpose.toUpperCase()}_SECURE`,
    userKey: `SMTP_${normPurpose.toUpperCase()}_USER`,
    passKey: `SMTP_${normPurpose.toUpperCase()}_PASS`,
  };

  const host = process.env[envKeys.hostKey] || process.env.SMTP_HOST;
  const portVal = process.env[envKeys.portKey] || process.env.SMTP_PORT;
  const port = portVal && !isNaN(Number(portVal)) ? Number(portVal) : 587;
  const secureVal = process.env[envKeys.secureKey] !== undefined ? process.env[envKeys.secureKey] : process.env.SMTP_SECURE;
  const secure = secureVal === "true";
  const user = process.env[envKeys.userKey] || process.env.SMTP_USER;
  const pass = process.env[envKeys.passKey] || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  return {
    host,
    port,
    secure,
    user,
    pass,
    envKeys,
  };
}

export function generateEnvSnippetForPurpose(purpose: string = "marketing"): string {
  const normPurpose = purpose.trim().toLowerCase();
  const keys = EMAIL_PURPOSE_ENV_KEYS[normPurpose] || {
    hostKey: `SMTP_${normPurpose.toUpperCase()}_HOST`,
    portKey: `SMTP_${normPurpose.toUpperCase()}_PORT`,
    secureKey: `SMTP_${normPurpose.toUpperCase()}_SECURE`,
    userKey: `SMTP_${normPurpose.toUpperCase()}_USER`,
    passKey: `SMTP_${normPurpose.toUpperCase()}_PASS`,
  };

  const purposeTitle = normPurpose.replace(/_/g, " ").toUpperCase();

  return `# ${purposeTitle} EMAIL CONFIGURATION (.env)
${keys.hostKey}=smtp.example.com
${keys.portKey}=587
${keys.secureKey}=false
${keys.userKey}=your_${normPurpose}_username
${keys.passKey}=your_${normPurpose}_password`;
}

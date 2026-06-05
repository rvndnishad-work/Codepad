import { Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type OtpVerificationProps = {
  otp: string;
};

export function OtpVerification({ otp }: OtpVerificationProps) {
  return (
    <BaseLayout
      preview="Your Interviewpad verification code"
      footer="If you did not request this code, you can safely ignore this email."
    >
      <Text style={emailStyles.badge("#3b82f6")}>Email Verification</Text>
      <Text style={emailStyles.h1}>Verify your email address</Text>
      <Text style={emailStyles.body}>
        Thank you for signing up for Interviewpad. Please use the following one-time passcode (OTP) to complete your registration. This code is valid for 10 minutes:
      </Text>
      <div
        style={{
          background: "#1e2229",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
          margin: "24px 0",
          fontFamily: "monospace",
          fontSize: "32px",
          fontWeight: "bold",
          color: "#FFD700",
          letterSpacing: "0.15em",
        }}
      >
        {otp}
      </div>
      <Text style={emailStyles.body}>
        Enter this code in your browser to verify your email and activate your account.
      </Text>
    </BaseLayout>
  );
}

export function otpVerificationText(p: OtpVerificationProps): string {
  return [
    "Verify your email address",
    "",
    "Thank you for signing up for Interviewpad. Please use the following one-time passcode (OTP) to complete your registration:",
    "",
    p.otp,
    "",
    "This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.",
  ].join("\n");
}

export const FORM_SCHOOL_NAME = "Tomhel Preparatory/JHS";
export const FORM_SCHOOL_SLOGAN = "Press On to Higher Grounds";

export type FormSuccessContent = {
  title: string;
  message: string;
  detail?: string;
};

export function getAdmissionSuccessContent(applicationId?: string | null): FormSuccessContent {
  return {
    title: "Application Received",
    message: `Thank you for applying to ${FORM_SCHOOL_NAME}. A confirmation email has been sent to your inbox. Our admissions office will review your submission and contact you within two business days.`,
    detail: applicationId ? `Application Reference: ${applicationId}` : undefined,
  };
}

export const CONTACT_SUCCESS_CONTENT: FormSuccessContent = {
  title: "Message Sent",
  message: `Thank you for contacting ${FORM_SCHOOL_NAME}. Your message has been received and a confirmation email is on its way. A member of our team will respond within one to two business days.`,
};

export const VISIT_SUCCESS_CONTENT: FormSuccessContent = {
  title: "Visit Request Received",
  message: `Thank you for your interest in ${FORM_SCHOOL_NAME}. Your campus visit request has been received and a confirmation email has been sent. Our team will contact you shortly to confirm your appointment.`,
};

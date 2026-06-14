export const FORM_SCHOOL_NAME = "Tomhel Preparatory/JHS";
export const FORM_SCHOOL_SLOGAN = "Press On to Higher Grounds";

export function getAdmissionSuccessMessage(applicationId?: string | null) {
  const reference = applicationId
    ? ` Your application reference is ${applicationId}.`
    : "";

  return `Thank you for applying to ${FORM_SCHOOL_NAME}.${reference} A confirmation email has been sent to your inbox. Our admissions office will review your submission and contact you within two business days.`;
}

export const CONTACT_SUCCESS_MESSAGE = `Thank you for contacting ${FORM_SCHOOL_NAME}. Your message has been received and a confirmation email is on its way. A member of our team will respond within one to two business days.`;

export const VISIT_SUCCESS_MESSAGE = `Thank you for your interest in ${FORM_SCHOOL_NAME}. Your campus visit request has been received and a confirmation email has been sent. Our team will contact you shortly to confirm your appointment.`;

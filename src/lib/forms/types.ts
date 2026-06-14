export type FormEndpoint = "admissions" | "messages" | "visit-request";

export type FormApiResponse = {
  success: boolean;
  message: string;
  applicationId?: string;
};

export type FormSubmitStatus = "idle" | "loading" | "success" | "error";

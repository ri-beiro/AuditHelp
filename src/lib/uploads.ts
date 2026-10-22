export const MAX_UPLOAD_MB = 25;
/** Vídeos MP4 podem ser maiores (Contatos de Segurança). Vídeos longos: preferir link do YouTube. */
export const MAX_VIDEO_MB = 100;

export const maxUploadMb = (type: string) => (type.startsWith("video/") ? MAX_VIDEO_MB : MAX_UPLOAD_MB);

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "video/mp4",
];

export const UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.csv,.txt,.mp4";

export interface WhatsappMessageDto {
  from: string;
  body: string;
  type: string;
  timestamp: string;
  messageId: string;
}

export interface WhatsappImageMessageDto extends WhatsappMessageDto {
  imageUrl: string;
  caption?: string;
}

export interface WhatsappDocumentMessageDto extends WhatsappMessageDto {
  documentUrl: string;
  fileName: string;
  mimeType: string;
}

export interface WhatsappWebhookDto {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages: Array<
          | WhatsappMessageDto
          | WhatsappImageMessageDto
          | WhatsappDocumentMessageDto
        >;
      };
      field: string;
    }>;
  }>;
}

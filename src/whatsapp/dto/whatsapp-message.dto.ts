export class WhatsappMessageDto {
  from: string;
  body: string;
  type: string;
  timestamp: string;
  messageId: string;
}

export class WhatsappImageMessageDto extends WhatsappMessageDto {
  imageUrl: string;
  caption?: string;
}

export class WhatsappDocumentMessageDto extends WhatsappMessageDto {
  documentUrl: string;
  fileName: string;
  mimeType: string;
}

export class WhatsappWebhookDto {
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

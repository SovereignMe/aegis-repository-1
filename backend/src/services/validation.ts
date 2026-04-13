export const sharedSchemas = {
  idParam: {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    properties: { id: { type: "string", minLength: 1 } },
  },
  loginBody: {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", minLength: 3, maxLength: 320 },
      password: { type: "string", minLength: 8, maxLength: 256 },
      mfaCode: { type: "string", minLength: 6, maxLength: 64 },
    },
  },
  registerBody: {
    type: "object",
    required: ["email", "fullName", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", minLength: 3, maxLength: 320 },
      fullName: { type: "string", minLength: 1, maxLength: 200 },
      password: { type: "string", minLength: 12, maxLength: 256 },
    },
  },
  bootstrapAdminBody: {
    type: "object",
    required: ["email", "fullName", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", minLength: 3, maxLength: 320 },
      fullName: { type: "string", minLength: 1, maxLength: 200 },
      password: { type: "string", minLength: 12, maxLength: 256 },
    },
  },
  changePasswordBody: {
    type: "object",
    required: ["currentPassword", "newPassword"],
    additionalProperties: false,
    properties: {
      currentPassword: { type: "string", minLength: 8, maxLength: 256 },
      newPassword: { type: "string", minLength: 12, maxLength: 256 },
    },
  },
  qQuery: {
    type: "object",
    additionalProperties: false,
    properties: { q: { type: "string", maxLength: 200 } },
  },
  userBody: {
    type: "object",
    required: ["email", "fullName", "role", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", minLength: 3, maxLength: 320 },
      fullName: { type: "string", minLength: 1, maxLength: 200 },
      role: { type: "string", enum: ["VIEWER", "EDITOR", "ADMIN"] },
      password: { type: "string", minLength: 12, maxLength: 256 },
    },
  },
  mfaEnableBody: {
    type: "object",
    required: ["code"],
    additionalProperties: false,
    properties: {
      code: { type: "string", minLength: 6, maxLength: 64 },
    },
  },
  mfaVerifyChallengeBody: {
    type: "object",
    required: ["challengeToken", "code"],
    additionalProperties: false,
    properties: {
      challengeToken: { type: "string", minLength: 16, maxLength: 4096 },
      code: { type: "string", minLength: 6, maxLength: 64 },
    },
  },
  settingsBody: { type: "object", additionalProperties: true },
  integrationSyncParams: { type: "object", required: ["id"], additionalProperties: false, properties: { id: { type: "string", minLength: 1, maxLength: 100 } } },
  taskBody: { type: "object", required: ["title"], additionalProperties: true, properties: { title: { type: "string", minLength: 1, maxLength: 200 } } },
  taskFromDocumentBody: {
    type: "object",
    required: ["documentId", "title"],
    additionalProperties: true,
    properties: {
      documentId: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1, maxLength: 200 },
      presetDays: { type: ["number", "null"], minimum: 0, maximum: 3650 },
      sourceChannel: { type: "string", maxLength: 50 },
    },
  },
  contactBody: { type: "object", required: ["fullName"], additionalProperties: true, properties: { fullName: { type: "string", minLength: 1, maxLength: 200 }, email: { type: "string", minLength: 3, maxLength: 320 }, phone: { type: "string", maxLength: 50 }, faxNumber: { type: "string", maxLength: 50 }, status: { type: "string", enum: ["TRUSTEE", "BENEFICIARY", "COUNSEL", "VENDOR", "COURT", "ADMINISTRATIVE CONTACTS"] }, organization: { type: "string", maxLength: 200 }, addressLine1: { type: "string", maxLength: 200 }, addressLine2: { type: "string", maxLength: 200 }, city: { type: "string", maxLength: 100 }, state: { type: "string", maxLength: 100 }, postalCode: { type: "string", maxLength: 30 }, country: { type: "string", maxLength: 100 }, notes: { type: "string", maxLength: 5000 } } },
  documentBody: { type: "object", required: ["title"], additionalProperties: true, properties: { title: { type: "string", minLength: 1, maxLength: 255 } } },
  uploadBody: {
    type: "object",
    required: ["fileContentBase64", "originalFileName", "mimeType"],
    additionalProperties: true,
    properties: {
      title: { type: "string", maxLength: 255 },
      docType: { type: "string", maxLength: 100 },
      jurisdiction: { type: "string", maxLength: 100 },
      status: { type: "string", maxLength: 100 },
      summary: { type: "string", maxLength: 5000 },
      notes: { type: "string", minLength: 3, maxLength: 5000 },
      reasonCode: { type: "string", minLength: 2, maxLength: 100 },
      originalFileName: { type: "string", minLength: 1, maxLength: 255 },
      mimeType: { type: "string", minLength: 3, maxLength: 255 },
      fileContentBase64: { type: "string", minLength: 1 },
    },
  },
  permissionsBody: { type: "object", required: ["permissions"], additionalProperties: false, properties: { permissions: { type: "object", additionalProperties: true } } },
  timerBody: { type: "object", required: ["label", "timerType"], additionalProperties: true, properties: { label: { type: "string", minLength: 1, maxLength: 200 }, timerType: { type: "string", minLength: 1, maxLength: 100 } } },
  beneficiaryBody: {
    type: "object",
    required: ["fullName"],
    additionalProperties: true,
    properties: {
      fullName: { type: "string", minLength: 1, maxLength: 200 },
      beneficiaryType: { type: "string", maxLength: 100 },
      allocationPercent: { type: "number", minimum: 0, maximum: 100 },
      notes: { type: "string", maxLength: 5000 },
    },
  },
  approvalDecisionBody: {
    type: "object",
    required: ["notes", "reasonCode"],
    additionalProperties: false,
    properties: {
      notes: { type: "string", minLength: 3, maxLength: 5000 },
      reasonCode: { type: "string", minLength: 2, maxLength: 100 },
    },
  },
  distributionBody: {
    type: "object",
    required: ["beneficiaryId", "amount"],
    additionalProperties: true,
    properties: {
      beneficiaryId: { type: "string", minLength: 1 },
      documentId: { type: "string", minLength: 1 },
      category: { type: "string", maxLength: 100 },
      amount: { type: "number", minimum: 0 },
      currency: { type: "string", maxLength: 10 },
      notes: { type: "string", maxLength: 5000 },
    },
  },
  noticeBody: {
    type: "object",
    required: ["recipientName"],
    additionalProperties: true,
    properties: {
      documentId: { type: "string", minLength: 1 },
      contactId: { type: "string", minLength: 1 },
      noticeType: { type: "string", maxLength: 100 },
      serviceMethod: { type: "string", maxLength: 100 },
      recipientName: { type: "string", minLength: 1, maxLength: 200 },
      recipientAddress: { type: "string", maxLength: 500 },
      dueDate: { type: "string", maxLength: 50 },
      trackingNumber: { type: "string", maxLength: 100 },
      notes: { type: "string", maxLength: 5000 },
    },
  },
  serveNoticeBody: {
    type: "object",
    additionalProperties: false,
    properties: {
      trackingNumber: { type: "string", maxLength: 100 },
    },
  },

  policyVersionBody: {
    type: "object",
    required: ["policyType", "title", "content"],
    additionalProperties: false,
    properties: {
      policyType: { type: "string", enum: ["trust-policy-template", "approval-thresholds", "jurisdiction-hint-pack"] },
      title: { type: "string", minLength: 1, maxLength: 255 },
      policyKey: { type: "string", minLength: 1, maxLength: 100 },
      changeSummary: { type: "string", maxLength: 5000 },
      activate: { type: "boolean" },
      content: { type: "object", additionalProperties: true },
    },
  },
  policyVersionParams: {
    type: "object", required: ["policyType", "versionId"], additionalProperties: false,
    properties: {
      policyType: { type: "string", enum: ["trust-policy-template", "approval-thresholds", "jurisdiction-hint-pack"] },
      versionId: { type: "string", minLength: 1 }
    }
  },

  packetBody: {
    type: "object",
    required: ["packetType", "title"],
    additionalProperties: false,
    properties: {
      packetType: { type: "string", enum: ["administrative-record", "evidence-package"] },
      title: { type: "string", minLength: 1, maxLength: 255 },
      documentIds: { type: "array", items: { type: "string" } },
      noticeIds: { type: "array", items: { type: "string" } },
      notes: { type: "string", minLength: 3, maxLength: 5000 },
      reasonCode: { type: "string", minLength: 2, maxLength: 100 },
    },
  },
};

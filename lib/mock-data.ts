import { Review, FieldRelation } from "./types";

// Document IDs for Operation B
const DOC_PED = "d-ped";
const DOC_BL = "d-bl";
const DOC_BLREV = "d-blrev";
const DOC_INV = "d-inv";
const DOC_INV2 = "d-inv2";
const DOC_CE = "d-ce";
const DOC_CARTA = "d-carta";
const DOC_MV = "d-mv";
const DOC_CP = "d-cp";
const DOC_EIR = "d-eir";
const DOC_DOCS = "d-docs";
const DOC_AA1 = "d-aa1";
const DOC_AA2 = "d-aa2";
const DOC_AA3 = "d-aa3";
const DOC_AA4 = "d-aa4";
const DOC_AA5 = "d-aa5";
const DOC_AA6 = "d-aa6";
const DOC_AA7 = "d-aa7";

const DRIVE_PATH = "data/raw/drive-download-20260205T220732Z-1-001";

export const operationBRelations: FieldRelation[] = [
  // BL numero: BL, BL REV, CE, DOCS all have IBC1399710
  { id: "rel-1", sourceDocId: DOC_BL, targetDocId: DOC_BLREV, fieldName: "BL Numero", sourceValue: "IBC1399710", targetValue: "IBC1399710", status: "match" },
  { id: "rel-2", sourceDocId: DOC_BL, targetDocId: DOC_CE, fieldName: "BL Numero", sourceValue: "IBC1399710", targetValue: "IBC1399710", status: "match" },
  { id: "rel-3", sourceDocId: DOC_BL, targetDocId: DOC_DOCS, fieldName: "BL Numero", sourceValue: "IBC1399710", targetValue: "IBC1399710", status: "match" },
  { id: "rel-4", sourceDocId: DOC_PED, targetDocId: DOC_BL, fieldName: "BL Numero", sourceValue: "MEDUE1503261", targetValue: "IBC1399710", status: "mismatch", note: "Pedimento shows MEDUE1503261, all supporting docs show IBC1399710" },
  { id: "rel-5", sourceDocId: DOC_PED, targetDocId: DOC_BLREV, fieldName: "BL Numero", sourceValue: "MEDUE1503261", targetValue: "IBC1399710", status: "mismatch" },
  { id: "rel-6", sourceDocId: DOC_PED, targetDocId: DOC_CE, fieldName: "BL Numero", sourceValue: "MEDUE1503261", targetValue: "IBC1399710", status: "mismatch" },
  { id: "rel-7", sourceDocId: DOC_PED, targetDocId: DOC_DOCS, fieldName: "BL Numero", sourceValue: "MEDUE1503261", targetValue: "IBC1399710", status: "mismatch" },

  // Bultos: Pedimento 25 vs docs 24
  { id: "rel-8", sourceDocId: DOC_PED, targetDocId: DOC_BL, fieldName: "Bultos", sourceValue: "25", targetValue: "24", status: "mismatch", note: "Pedimento declares 25 packages, all documents indicate 24" },
  { id: "rel-9", sourceDocId: DOC_PED, targetDocId: DOC_BLREV, fieldName: "Bultos", sourceValue: "25", targetValue: "24", status: "mismatch" },
  { id: "rel-10", sourceDocId: DOC_PED, targetDocId: DOC_INV, fieldName: "Bultos", sourceValue: "25", targetValue: "24", status: "mismatch" },
  { id: "rel-11", sourceDocId: DOC_PED, targetDocId: DOC_INV2, fieldName: "Bultos", sourceValue: "25", targetValue: "24", status: "mismatch" },
  { id: "rel-12", sourceDocId: DOC_PED, targetDocId: DOC_DOCS, fieldName: "Bultos", sourceValue: "25", targetValue: "24", status: "mismatch" },
  { id: "rel-13", sourceDocId: DOC_BL, targetDocId: DOC_INV, fieldName: "Bultos", sourceValue: "24", targetValue: "24", status: "match" },

  // Contenedor: Pedimento GLDU3540997 vs docs JAYU1098003
  { id: "rel-14", sourceDocId: DOC_PED, targetDocId: DOC_BLREV, fieldName: "Contenedor", sourceValue: "GLDU3540997", targetValue: "JAYU1098003", status: "mismatch", note: "Container numbers do not match between pedimento and transport docs" },
  { id: "rel-15", sourceDocId: DOC_PED, targetDocId: DOC_DOCS, fieldName: "Contenedor", sourceValue: "GLDU3540997", targetValue: "JAYU1098003", status: "mismatch" },
  { id: "rel-16", sourceDocId: DOC_PED, targetDocId: DOC_EIR, fieldName: "Contenedor", sourceValue: "GLDU3540997", targetValue: "JAYU1098003", status: "mismatch" },
  { id: "rel-17", sourceDocId: DOC_BLREV, targetDocId: DOC_EIR, fieldName: "Contenedor", sourceValue: "JAYU1098003", targetValue: "JAYU1098003", status: "match" },
  { id: "rel-18", sourceDocId: DOC_DOCS, targetDocId: DOC_EIR, fieldName: "Contenedor", sourceValue: "JAYU1098003", targetValue: "JAYU1098003", status: "match" },

  // Importer RFC: most match, Carta 3.1.8 mismatch
  { id: "rel-19", sourceDocId: DOC_PED, targetDocId: DOC_CE, fieldName: "RFC Importador", sourceValue: "SES7402068M2", targetValue: "SES7402068M2", status: "match" },
  { id: "rel-20", sourceDocId: DOC_PED, targetDocId: DOC_INV, fieldName: "RFC Importador", sourceValue: "SES7402068M2", targetValue: "SES7402068M2", status: "match" },
  { id: "rel-21", sourceDocId: DOC_PED, targetDocId: DOC_MV, fieldName: "RFC Importador", sourceValue: "SES7402068M2", targetValue: "SES7402068M2", status: "match" },
  { id: "rel-22", sourceDocId: DOC_PED, targetDocId: DOC_CARTA, fieldName: "RFC Importador", sourceValue: "SES7402068M2", targetValue: "AAZA701109H47", status: "mismatch", note: "Carta 3.1.8 shows RFC of person (AAZA701109H47), not company RFC" },
  { id: "rel-23", sourceDocId: DOC_PED, targetDocId: DOC_AA1, fieldName: "RFC Importador", sourceValue: "SES7402068M2", targetValue: "SES7402068M2", status: "match" },

  // Peso bruto: pedimento 25458 vs docs 24797
  { id: "rel-24", sourceDocId: DOC_PED, targetDocId: DOC_BL, fieldName: "Peso Bruto (Kg)", sourceValue: "25,458", targetValue: "24,797", status: "mismatch", note: "661 Kg difference between pedimento and supporting documents" },
  { id: "rel-25", sourceDocId: DOC_PED, targetDocId: DOC_INV, fieldName: "Peso Bruto (Kg)", sourceValue: "25,458", targetValue: "24,797", status: "mismatch" },
  { id: "rel-26", sourceDocId: DOC_BL, targetDocId: DOC_INV, fieldName: "Peso Bruto (Kg)", sourceValue: "24,797", targetValue: "24,797", status: "match" },

  // Port of discharge: match
  { id: "rel-27", sourceDocId: DOC_PED, targetDocId: DOC_BL, fieldName: "Puerto Descarga", sourceValue: "ALTAMIRA", targetValue: "ALTAMIRA", status: "match" },
  { id: "rel-28", sourceDocId: DOC_PED, targetDocId: DOC_BLREV, fieldName: "Puerto Descarga", sourceValue: "ALTAMIRA", targetValue: "ALTAMIRA", status: "match" },

  // Valor USD: pedimento 92.98 vs docs 28,322.78
  { id: "rel-29", sourceDocId: DOC_PED, targetDocId: DOC_INV, fieldName: "Valor USD", sourceValue: "$92.98", targetValue: "$28,322.78", status: "mismatch", note: "Massive value discrepancy - pedimento shows $92.98, invoices show $28,322.78" },
  { id: "rel-30", sourceDocId: DOC_PED, targetDocId: DOC_MV, fieldName: "Valor USD", sourceValue: "$92.98", targetValue: "$28,322.78", status: "mismatch" },
  { id: "rel-31", sourceDocId: DOC_INV, targetDocId: DOC_MV, fieldName: "Valor USD", sourceValue: "$28,322.78", targetValue: "$28,322.78", status: "match" },
  { id: "rel-32", sourceDocId: DOC_INV, targetDocId: DOC_INV2, fieldName: "Valor USD", sourceValue: "$28,322.78", targetValue: "$28,322.78", status: "match" },

  // Vessel: pedimento vs docs mismatch
  { id: "rel-33", sourceDocId: DOC_PED, targetDocId: DOC_BL, fieldName: "Buque", sourceValue: "MSCEVERESTVIII", targetValue: "X-PRESS MULHACEN", status: "mismatch", note: "Vessel name mismatch - pedimento shows MSC EVEREST VIII, BL shows X-PRESS MULHACEN" },
  { id: "rel-34", sourceDocId: DOC_PED, targetDocId: DOC_BLREV, fieldName: "Buque", sourceValue: "MSCEVERESTVIII", targetValue: "APL MINNESOTA", status: "mismatch" },
  { id: "rel-35", sourceDocId: DOC_BL, targetDocId: DOC_BLREV, fieldName: "Buque", sourceValue: "X-PRESS MULHACEN", targetValue: "APL MINNESOTA", status: "mismatch", note: "Different vessels on BL vs BL revision" },

  // Supplier name: cross-doc matches
  { id: "rel-36", sourceDocId: DOC_INV, targetDocId: DOC_CP, fieldName: "Proveedor", sourceValue: "Nueva Incal S.A.U.", targetValue: "Nueva Incal, S.A.U.", status: "match" },
  { id: "rel-37", sourceDocId: DOC_INV, targetDocId: DOC_MV, fieldName: "Proveedor", sourceValue: "Nueva Incal S.A.U.", targetValue: "NUEVA INCAL S.A.U.", status: "match" },
  { id: "rel-38", sourceDocId: DOC_BL, targetDocId: DOC_CARTA, fieldName: "Proveedor", sourceValue: "NUEVA INCAL SA", targetValue: "NUEVA INCAL, S.A.U.", status: "match" },
];

export const mockReviews: Review[] = [
  {
    id: "rev-001",
    pedimentoNumber: "25 81 3645 5001570",
    importerName: "Serviacero Especiales S.A. de C.V.",
    operationType: "Importacion Definitiva (IC)",
    status: "completed",
    createdAt: "2026-02-15T10:30:00Z",
    completedAt: "2026-02-15T10:45:00Z",
    documentsCount: 18,
    matchCount: 15,
    mismatchCount: 8,
    warningCount: 4,
    documents: [
      { id: DOC_PED, name: "81_5001570_IC_PN_1.pdf", type: "application/pdf", size: 312000, isPedimento: true, classification: "pedimento", filePath: "data/raw/81_5001570_IC_PN_1.pdf" },
      { id: DOC_BL, name: "BL.pdf", type: "application/pdf", size: 156000, isPedimento: false, classification: "bill_of_lading", filePath: `${DRIVE_PATH}/BL.pdf`, operationId: "B" },
      { id: DOC_BLREV, name: "BL REV.pdf", type: "application/pdf", size: 148000, isPedimento: false, classification: "delivery_order", filePath: `${DRIVE_PATH}/BL REV.pdf`, operationId: "B" },
      { id: DOC_INV, name: "FV25288.pdf", type: "application/pdf", size: 180000, isPedimento: false, classification: "commercial_invoice", filePath: `${DRIVE_PATH}/FV25288.pdf`, operationId: "B" },
      { id: DOC_INV2, name: "SES3555 FA.pdf", type: "application/pdf", size: 165000, isPedimento: false, classification: "commercial_invoice", filePath: `${DRIVE_PATH}/SES3555 FA.pdf`, operationId: "B" },
      { id: DOC_CE, name: "CE.pdf", type: "application/pdf", size: 67000, isPedimento: false, classification: "carta_encomienda", filePath: `${DRIVE_PATH}/CE.pdf`, operationId: "B" },
      { id: DOC_CARTA, name: "Carta 3.1.8.pdf", type: "application/pdf", size: 89000, isPedimento: false, classification: "carta_3_1_8", filePath: `${DRIVE_PATH}/Carta 3.1.8.pdf`, operationId: "B" },
      { id: DOC_MV, name: "MV SES3555.pdf", type: "application/pdf", size: 92000, isPedimento: false, classification: "manifestacion_de_valor", filePath: `${DRIVE_PATH}/MV SES3555.pdf`, operationId: "B" },
      { id: DOC_CP, name: "CERTIFICADO PRODUCCION.pdf", type: "application/pdf", size: 78000, isPedimento: false, classification: "certificado_produccion", filePath: `${DRIVE_PATH}/CERTIFICADO PRODUCCION.pdf`, operationId: "B" },
      { id: DOC_EIR, name: "EIR JAYU1098003.pdf", type: "application/pdf", size: 56000, isPedimento: false, classification: "equipment_interchange_receipt", filePath: `${DRIVE_PATH}/EIR JAYU1098003.pdf`, operationId: "B" },
      { id: DOC_DOCS, name: "DOCS FV25-288 SERVIACERO (JAYU1098003).pdf", type: "application/pdf", size: 245000, isPedimento: false, classification: "document_compilation", filePath: `${DRIVE_PATH}/DOCS FV25-288 SERVIACERO (JAYU1098003).pdf`, operationId: "B" },
      { id: DOC_AA1, name: "1119C125184334.pdf", type: "application/pdf", size: 42000, isPedimento: false, classification: "aviso_automatico", filePath: `${DRIVE_PATH}/1119C125184334.pdf`, operationId: "B" },
      { id: DOC_AA2, name: "1119C125184583.pdf", type: "application/pdf", size: 42000, isPedimento: false, classification: "aviso_automatico", filePath: `${DRIVE_PATH}/1119C125184583.pdf`, operationId: "B" },
      { id: DOC_AA3, name: "1119C125184584.pdf", type: "application/pdf", size: 42000, isPedimento: false, classification: "aviso_automatico", filePath: `${DRIVE_PATH}/1119C125184584.pdf`, operationId: "B" },
      { id: DOC_AA4, name: "1119C125184585.pdf", type: "application/pdf", size: 42000, isPedimento: false, classification: "aviso_automatico", filePath: `${DRIVE_PATH}/1119C125184585.pdf`, operationId: "B" },
      { id: DOC_AA5, name: "1119C125184586.pdf", type: "application/pdf", size: 42000, isPedimento: false, classification: "aviso_automatico", filePath: `${DRIVE_PATH}/1119C125184586.pdf`, operationId: "B" },
      { id: DOC_AA6, name: "1119C125184587.pdf", type: "application/pdf", size: 42000, isPedimento: false, classification: "aviso_automatico", filePath: `${DRIVE_PATH}/1119C125184587.pdf`, operationId: "B" },
      { id: DOC_AA7, name: "1119C125184588.pdf", type: "application/pdf", size: 42000, isPedimento: false, classification: "aviso_automatico", filePath: `${DRIVE_PATH}/1119C125184588.pdf`, operationId: "B" },
    ],
    fields: [
      {
        id: "f-bl", fieldName: "Numero de BL", pedimentoValue: "MEDUE1503261", documentValue: "IBC1399710", documentSource: "BL.pdf", documentId: DOC_BL,
        crossRefDocIds: [DOC_BL, DOC_BLREV, DOC_CE, DOC_DOCS], status: "mismatch", severity: "high",
        note: "Pedimento declares BL MEDUE1503261 but all supporting documents reference IBC1399710. Likely a data entry error on the pedimento.",
      },
      {
        id: "f-bultos", fieldName: "Cantidad de Bultos", pedimentoValue: "25", documentValue: "24", documentSource: "BL.pdf", documentId: DOC_BL,
        crossRefDocIds: [DOC_BL, DOC_BLREV, DOC_INV, DOC_INV2, DOC_DOCS], status: "mismatch", severity: "medium",
        note: "Pedimento states 25 packages; BL, invoice, and compilation docs all state 24. Difference of 1 package.",
      },
      {
        id: "f-contenedor", fieldName: "Numero de Contenedor", pedimentoValue: "GLDU3540997", documentValue: "JAYU1098003", documentSource: "BL REV.pdf", documentId: DOC_BLREV,
        crossRefDocIds: [DOC_BLREV, DOC_DOCS, DOC_EIR], status: "mismatch", severity: "high",
        note: "Container number mismatch. Pedimento: GLDU3540997, Transport docs: JAYU1098003. Could indicate wrong container assigned.",
      },
      {
        id: "f-rfc", fieldName: "RFC Importador", pedimentoValue: "SES7402068M2", documentValue: "SES7402068M2", documentSource: "CE.pdf", documentId: DOC_CE,
        crossRefDocIds: [DOC_CE, DOC_INV, DOC_MV, DOC_AA1, DOC_AA2, DOC_AA3, DOC_AA4, DOC_AA5, DOC_AA6, DOC_AA7], status: "match",
      },
      {
        id: "f-rfc-carta", fieldName: "RFC Importador (Carta 3.1.8)", pedimentoValue: "SES7402068M2", documentValue: "AAZA701109H47", documentSource: "Carta 3.1.8.pdf", documentId: DOC_CARTA,
        crossRefDocIds: [DOC_CARTA], status: "mismatch", severity: "medium",
        note: "Carta 3.1.8 shows personal RFC (AAZA701109H47) instead of company RFC. This may be the legal representative's RFC.",
      },
      {
        id: "f-rfc-inv2", fieldName: "RFC Importador (SES3555 FA)", pedimentoValue: "SES7402068M2", documentValue: "MXSES7402068M2", documentSource: "SES3555 FA.pdf", documentId: DOC_INV2,
        crossRefDocIds: [DOC_INV2], status: "warning", severity: "low",
        note: "SES3555 FA has prefix 'MX' before the RFC. Likely country code prefix, functionally same RFC.",
      },
      {
        id: "f-peso", fieldName: "Peso Bruto (Kg)", pedimentoValue: "25,458.00", documentValue: "24,797.00", documentSource: "BL.pdf", documentId: DOC_BL,
        crossRefDocIds: [DOC_BL, DOC_BLREV, DOC_INV, DOC_INV2, DOC_DOCS], status: "mismatch", severity: "high",
        note: "Weight discrepancy of 661 Kg. Pedimento: 25,458 Kg vs documents: 24,797 Kg. May trigger customs audit.",
      },
      {
        id: "f-port", fieldName: "Puerto de Descarga", pedimentoValue: "ALTAMIRA", documentValue: "ALTAMIRA", documentSource: "BL.pdf", documentId: DOC_BL,
        crossRefDocIds: [DOC_BL, DOC_BLREV], status: "match",
      },
      {
        id: "f-valor", fieldName: "Valor Comercial (USD)", pedimentoValue: "$92.98", documentValue: "$28,322.78", documentSource: "FV25288.pdf", documentId: DOC_INV,
        crossRefDocIds: [DOC_INV, DOC_INV2, DOC_MV, DOC_DOCS], status: "mismatch", severity: "high",
        note: "Critical value discrepancy. Pedimento declares $92.98, invoices and MV declare $28,322.78. Possible unit vs total amount confusion.",
      },
      {
        id: "f-vessel", fieldName: "Buque / Vessel", pedimentoValue: "MSCEVERESTVIII", documentValue: "X-PRESS MULHACEN", documentSource: "BL.pdf", documentId: DOC_BL,
        crossRefDocIds: [DOC_BL, DOC_BLREV], status: "mismatch", severity: "medium",
        note: "Vessel mismatch. Pedimento: MSC EVEREST VIII, BL: X-PRESS MULHACEN, BL REV: APL MINNESOTA. Three different vessel names across docs.",
      },
      {
        id: "f-supplier", fieldName: "Nombre del Proveedor", pedimentoValue: "N/A", documentValue: "NUEVA INCAL SA", documentSource: "BL.pdf", documentId: DOC_BL,
        crossRefDocIds: [DOC_BL, DOC_BLREV, DOC_CARTA, DOC_CP, DOC_DOCS, DOC_INV, DOC_MV, DOC_INV2], status: "warning", severity: "medium",
        note: "Supplier name not found in pedimento. All supporting docs reference Nueva Incal S.A.U. with minor name variations.",
      },
      {
        id: "f-consignee", fieldName: "Consignatario", pedimentoValue: "N/A", documentValue: "SERVIACERO ESPECIALES SA DE CV", documentSource: "BL REV.pdf", documentId: DOC_BLREV,
        crossRefDocIds: [DOC_BLREV, DOC_BL, DOC_DOCS, DOC_INV, DOC_INV2], status: "warning", severity: "low",
        note: "Consignee field not extracted from pedimento. All docs consistently reference Serviacero Especiales with minor formatting differences.",
      },
      {
        id: "f-invoice", fieldName: "Numero de Factura", pedimentoValue: "N/A", documentValue: "FV25/288", documentSource: "FV25288.pdf", documentId: DOC_INV,
        crossRefDocIds: [DOC_INV, DOC_MV, DOC_INV2], status: "warning", severity: "low",
        note: "Invoice number not extracted from pedimento. FV25288 and MV both reference FV25/288.",
      },
    ],
    fieldRelations: operationBRelations,
  },
  {
    id: "rev-002",
    pedimentoNumber: "25 01 3645 8100051",
    importerName: "Nueva Incal S.A. de C.V.",
    operationType: "Importacion Definitiva (A1)",
    status: "in_progress",
    createdAt: "2026-02-17T14:20:00Z",
    documentsCount: 8,
    matchCount: 0,
    mismatchCount: 0,
    warningCount: 0,
    documents: [
      { id: "d6", name: "Pedimento Simplificado.pdf", type: "application/pdf", size: 210000, isPedimento: true, classification: "pedimento", filePath: "" },
      { id: "d7", name: "Invoice 26EZ705.pdf", type: "application/pdf", size: 145000, isPedimento: false, classification: "commercial_invoice", filePath: "" },
    ],
    fields: [],
  },
  {
    id: "rev-003",
    pedimentoNumber: "25 01 3645 8100048",
    importerName: "Grupo Industrial MX S.A.",
    operationType: "Exportacion Definitiva (K1)",
    status: "completed",
    createdAt: "2026-02-10T09:15:00Z",
    completedAt: "2026-02-10T09:32:00Z",
    documentsCount: 6,
    matchCount: 28,
    mismatchCount: 0,
    warningCount: 2,
    documents: [],
    fields: [
      {
        id: "f20", fieldName: "RFC Exportador", pedimentoValue: "GIM990812AB3", documentValue: "GIM990812AB3", documentSource: "Carta Encomienda",
        documentId: "", crossRefDocIds: [], status: "match",
      },
      {
        id: "f21", fieldName: "Valor Declarado (MXN)", pedimentoValue: "$2,456,780.00", documentValue: "$2,456,780.00", documentSource: "Factura Comercial",
        documentId: "", crossRefDocIds: [], status: "match",
      },
    ],
  },
  {
    id: "rev-004",
    pedimentoNumber: "25 01 3645 8100052",
    importerName: "Aceros del Norte S.A.",
    operationType: "Importacion Temporal (F5)",
    status: "completed",
    createdAt: "2026-02-12T16:00:00Z",
    completedAt: "2026-02-12T16:22:00Z",
    documentsCount: 10,
    matchCount: 31,
    mismatchCount: 1,
    warningCount: 3,
    documents: [],
    fields: [],
  },
];

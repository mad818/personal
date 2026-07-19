export interface CisaKevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
}

export interface CisaKevPayload {
  vulnerabilities: CisaKevEntry[];
  catalogVersion: string;
  dateReleased: string;
  total: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isCisaKevEntry(value: unknown): value is CisaKevEntry {
  if (!isRecord(value)) return false;
  return [
    "cveID",
    "vendorProject",
    "product",
    "vulnerabilityName",
    "dateAdded",
    "shortDescription",
    "requiredAction",
    "dueDate",
    "knownRansomwareCampaignUse",
  ].every((field) => typeof value[field] === "string");
}

export function isCisaKevPayload(value: unknown): value is CisaKevPayload {
  if (!isRecord(value) || !Array.isArray(value.vulnerabilities)) return false;
  return (
    value.vulnerabilities.every(isCisaKevEntry) &&
    typeof value.catalogVersion === "string" &&
    typeof value.dateReleased === "string" &&
    typeof value.total === "number" &&
    Number.isFinite(value.total)
  );
}

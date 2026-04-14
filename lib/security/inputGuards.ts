export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

type FloatParamOptions = {
  min: number;
  max: number;
  defaultValue?: number;
  required?: boolean;
  label?: string;
};

function readTrimmedParam(searchParams: URLSearchParams, name: string) {
  const raw = searchParams.get(name);
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseBoundedFloatParam(
  searchParams: URLSearchParams,
  name: string,
  opts: FloatParamOptions & { defaultValue: number },
): number;
export function parseBoundedFloatParam(
  searchParams: URLSearchParams,
  name: string,
  opts: FloatParamOptions & { required: true },
): number;
export function parseBoundedFloatParam(
  searchParams: URLSearchParams,
  name: string,
  opts: FloatParamOptions,
): number | null {
  const raw = readTrimmedParam(searchParams, name);
  const label = opts.label ?? name;

  if (raw === null) {
    if (typeof opts.defaultValue === "number") return opts.defaultValue;
    if (opts.required) {
      throw new RequestValidationError(`${label} is required.`);
    }
    return null;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new RequestValidationError(`${label} must be a valid number.`);
  }
  if (value < opts.min || value > opts.max) {
    throw new RequestValidationError(
      `${label} must be between ${opts.min} and ${opts.max}.`,
    );
  }
  return value;
}

export function parseOptionalBoundingBox(searchParams: URLSearchParams) {
  const rawValues = {
    lamin: readTrimmedParam(searchParams, "lamin"),
    lomin: readTrimmedParam(searchParams, "lomin"),
    lamax: readTrimmedParam(searchParams, "lamax"),
    lomax: readTrimmedParam(searchParams, "lomax"),
  };

  const present = Object.values(rawValues).filter(Boolean).length;
  if (present === 0) return null;
  if (present !== 4) {
    throw new RequestValidationError(
      "lamin, lomin, lamax, and lomax must all be provided together.",
    );
  }

  const lamin = parseBoundedFloatParam(searchParams, "lamin", {
    min: -90,
    max: 90,
    required: true,
  });
  const lomin = parseBoundedFloatParam(searchParams, "lomin", {
    min: -180,
    max: 180,
    required: true,
  });
  const lamax = parseBoundedFloatParam(searchParams, "lamax", {
    min: -90,
    max: 90,
    required: true,
  });
  const lomax = parseBoundedFloatParam(searchParams, "lomax", {
    min: -180,
    max: 180,
    required: true,
  });

  if (lamin >= lamax) {
    throw new RequestValidationError("lamin must be less than lamax.");
  }
  if (lomin >= lomax) {
    throw new RequestValidationError("lomin must be less than lomax.");
  }

  return { lamin, lomin, lamax, lomax };
}

type QueryParamSpec = {
  required?: boolean;
  maxLength?: number;
  allowedValues?: readonly string[];
  pattern?: RegExp;
  normalize?: (value: string) => string;
};

export function buildValidatedSearchParams(
  searchParams: URLSearchParams,
  specs: Record<string, QueryParamSpec>,
) {
  const output = new URLSearchParams();

  for (const [name, spec] of Object.entries(specs)) {
    const raw = readTrimmedParam(searchParams, name);

    if (raw === null) {
      if (spec.required) {
        throw new RequestValidationError(`${name} is required.`);
      }
      continue;
    }

    if (spec.maxLength && raw.length > spec.maxLength) {
      throw new RequestValidationError(
        `${name} exceeds the maximum length of ${spec.maxLength}.`,
      );
    }
    if (spec.allowedValues && !spec.allowedValues.includes(raw)) {
      throw new RequestValidationError(
        `${name} must be one of: ${spec.allowedValues.join(", ")}.`,
      );
    }
    if (spec.pattern && !spec.pattern.test(raw)) {
      throw new RequestValidationError(`${name} is invalid.`);
    }

    output.set(name, spec.normalize ? spec.normalize(raw) : raw);
  }

  return output;
}

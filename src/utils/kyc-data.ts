// ─── KYC Country & ID Type Data ───────────────────────────────────────────────
// A curated, production-quality list of countries and their government-issued
// ID documents. This drives the country/ID-type selection steps in the KYC flow.

export interface IdType {
  id: string;
  label: string;
  description: string;
  acceptedFormats: string; // user-facing accepted formats hint
  sides: "single" | "double"; // single = front only, double = front + back
}

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string; // emoji flag
  idTypes: IdType[];
}

export const COUNTRIES: Country[] = [
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    idTypes: [
      {
        id: "passport",
        label: "Passport",
        description: "US Passport booklet or card",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "drivers_license",
        label: "Driver's License",
        description: "State-issued driver's license",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "state_id",
        label: "State ID Card",
        description: "Government-issued state ID card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "green_card",
        label: "Permanent Resident Card (Green Card)",
        description: "USCIS-issued permanent resident card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    idTypes: [
      {
        id: "passport",
        label: "Passport",
        description: "UK/British passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "drivers_license",
        label: "Driver's Licence (DVLA)",
        description: "DVLA-issued photocard driving licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "national_id",
        label: "National Identity Card",
        description: "HM Passport Office national identity card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    idTypes: [
      {
        id: "passport",
        label: "Passport",
        description: "Canadian passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "drivers_license",
        label: "Provincial Driver's Licence",
        description: "Province-issued driver's licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "health_card",
        label: "Provincial Health Card",
        description: "Province-issued health insurance card",
        acceptedFormats: "JPG, PNG",
        sides: "single",
      },
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    idTypes: [
      {
        id: "nin",
        label: "National Identification Number (NIN) Card",
        description: "NIMC-issued NIN card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "International Passport",
        description: "Nigerian international passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "voters_card",
        label: "Permanent Voter's Card (PVC)",
        description: "INEC-issued permanent voter's card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "drivers_license",
        label: "Driver's Licence (FRSC)",
        description: "FRSC-issued driver's licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    idTypes: [
      {
        id: "personalausweis",
        label: "Personalausweis (National ID Card)",
        description: "German national identity card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Reisepass (Passport)",
        description: "German passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "drivers_license",
        label: "Führerschein (Driver's Licence)",
        description: "German driving licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    idTypes: [
      {
        id: "aadhaar",
        label: "Aadhaar Card",
        description: "UIDAI-issued Aadhaar card",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "double",
      },
      {
        id: "pan",
        label: "PAN Card",
        description: "Income Tax Department-issued PAN card",
        acceptedFormats: "JPG, PNG",
        sides: "single",
      },
      {
        id: "passport",
        label: "Passport",
        description: "Indian passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "voters_id",
        label: "Voter ID (EPIC)",
        description: "Election Commission-issued Voter ID",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "drivers_license",
        label: "Driver's Licence",
        description: "State RTO-issued driving licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    idTypes: [
      {
        id: "emirates_id",
        label: "Emirates ID",
        description: "Federal Authority for Identity-issued Emirates ID",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Passport",
        description: "UAE or foreign passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    idTypes: [
      {
        id: "passport",
        label: "Passport",
        description: "Australian passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "drivers_license",
        label: "Driver's Licence",
        description: "State/Territory-issued driver's licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "medicare",
        label: "Medicare Card",
        description: "Australian Medicare card",
        acceptedFormats: "JPG, PNG",
        sides: "single",
      },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "🇸🇬",
    idTypes: [
      {
        id: "nric",
        label: "NRIC (National Registration Identity Card)",
        description: "ICA-issued NRIC for citizens/PRs",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Passport",
        description: "Singapore passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "flp",
        label: "Foreign Identification Number (FIN) Card",
        description: "ICA-issued FIN card for foreigners",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
    idTypes: [
      {
        id: "smart_id",
        label: "Smart ID Card",
        description: "Department of Home Affairs Smart ID",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Passport",
        description: "South African passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "drivers_license",
        label: "Driver's Licence",
        description: "South African driver's licence card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "BR",
    name: "Brazil",
    flag: "🇧🇷",
    idTypes: [
      {
        id: "cpf",
        label: "CPF Card",
        description: "Federal Revenue-issued CPF card",
        acceptedFormats: "JPG, PNG",
        sides: "single",
      },
      {
        id: "rg",
        label: "RG (Cédula de Identidade)",
        description: "State-issued identity card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Passaporte",
        description: "Brazilian passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "cnh",
        label: "CNH (Driver's Licence)",
        description: "DETRAN-issued driver's licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    flag: "🇰🇪",
    idTypes: [
      {
        id: "national_id",
        label: "National ID Card",
        description: "Government-issued Kenyan national ID",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Passport",
        description: "Kenyan passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
    ],
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    idTypes: [
      {
        id: "national_id",
        label: "Carte Nationale d'Identité",
        description: "French national identity card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Passeport",
        description: "French passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "drivers_license",
        label: "Permis de Conduire",
        description: "French driving licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    idTypes: [
      {
        id: "my_number",
        label: "My Number Card",
        description: "Individual Number Card (マイナンバーカード)",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Passport",
        description: "Japanese passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "drivers_license",
        label: "Driver's Licence",
        description: "Japanese driving licence",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
    ],
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "🇬🇭",
    idTypes: [
      {
        id: "ghana_card",
        label: "Ghana Card",
        description: "NIA-issued Ghana National ID Card",
        acceptedFormats: "JPG, PNG",
        sides: "double",
      },
      {
        id: "passport",
        label: "Passport",
        description: "Ghanaian passport",
        acceptedFormats: "JPG, PNG, PDF",
        sides: "single",
      },
      {
        id: "voters_id",
        label: "Voter's ID",
        description: "Electoral Commission of Ghana Voter ID",
        acceptedFormats: "JPG, PNG",
        sides: "single",
      },
    ],
  },
];

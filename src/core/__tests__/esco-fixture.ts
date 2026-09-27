import { EscoIndex } from "../esco";

export const escoFixture = new EscoIndex(
  [
    {
      uri: "esco:python",
      preferredLabelEn: "Python (computer programming)",
      preferredLabelNl: "Python",
      altLabels: ["Python"],
      broaderUris: ["esco:programming"],
    },
    {
      uri: "esco:sql",
      preferredLabelEn: "SQL",
      altLabels: ["structured query language"],
      broaderUris: ["esco:databases"],
    },
    {
      uri: "esco:postgresql",
      preferredLabelEn: "PostgreSQL",
      altLabels: ["Postgres"],
      broaderUris: ["esco:databases"],
    },
    { uri: "esco:airflow", preferredLabelEn: "Apache Airflow", altLabels: ["Airflow"] },
    { uri: "esco:docker", preferredLabelEn: "Docker", altLabels: [] },
    { uri: "esco:kubernetes", preferredLabelEn: "Kubernetes", altLabels: ["k8s"] },
    { uri: "esco:r", preferredLabelEn: "R", altLabels: [] },
    {
      uri: "esco:project-mgmt",
      preferredLabelEn: "project management",
      preferredLabelNl: "projectmanagement",
      altLabels: [],
    },
    {
      uri: "esco:patient-care",
      preferredLabelEn: "provide patient care",
      preferredLabelNl: "patiëntenzorg verlenen",
      altLabels: ["patient care", "patiëntenzorg"],
    },
  ],
  [
    {
      uri: "esco-occ:data-engineer",
      iscoCode: "2521",
      preferredLabelEn: "data engineer",
      altLabels: ["big data engineer"],
    },
    {
      uri: "esco-occ:software-developer",
      iscoCode: "2512",
      preferredLabelEn: "software developer",
      altLabels: ["software engineer", "backend developer"],
    },
    {
      uri: "esco-occ:nurse",
      iscoCode: "2221",
      preferredLabelEn: "nurse responsible for general care",
      preferredLabelNl: "verpleegkundige",
      altLabels: ["nurse"],
    },
  ],
);

/**
 * A small framework fixture shaped like the real published data: records with
 * id + slug + a primary field, relationship fields as { slug, label } arrays, and
 * the comma-separated "other job titles" field. Used by the data-layer tests.
 */
import type {
  FrameworkManifest,
  RawDatasets,
} from "../../domain/framework/types";

export const fixtureManifest: FrameworkManifest = {
  framework: "Skills & Practices Framework",
  version: "test-v1",
  entities: [
    {
      entity: "job-functions",
      file: "framework-data/job-functions.json",
      count: 2,
      primaryField: "Job Function",
    },
    {
      entity: "duties",
      file: "framework-data/duties.json",
      count: 2,
      primaryField: "Duty Name",
    },
    {
      entity: "skills",
      file: "framework-data/skills.json",
      count: 1,
      primaryField: "Skill Name",
    },
  ],
};

export const fixtureDatasets: RawDatasets = {
  "job-functions": [
    {
      id: 1,
      slug: "ux-designer",
      "Job Function": "UX Designer",
      "Associated Duties": [
        { slug: "ux-user-experience-design", label: "UX (User Experience) Design" },
        { slug: "missing-duty", label: "A Duty Not In The Dataset" },
      ],
      "Other Job Titles You May See in the World":
        "Product Designer, UI/UX Designer, Interaction Designer",
      "Job Function Description": "Designs usable screens and flows.",
    },
    {
      id: 2,
      slug: "software-engineer",
      "Job Function": "Software Engineer",
      "Associated Duties": [
        { slug: "software-development", label: "Software Development" },
      ],
      "Other Job Titles You May See in the World": "Developer, Programmer",
      "Job Function Description": "Builds and ships software.",
    },
  ],
  duties: [
    {
      id: 1,
      slug: "ux-user-experience-design",
      "Duty Name": "UX (User Experience) Design",
      "Responsible Tasks": [
        { slug: "wireframing", label: "Wireframing" },
        { slug: "prototype-creation", label: "Prototype Creation" },
      ],
      Activities: [{ slug: "user-interviews", label: "User Interviews" }],
      "Responsible Deliverables": [
        { slug: "design-system", label: "Design System" },
      ],
      "Skills Required For the Duty": [
        { slug: "visual-design", label: "Visual Design" },
      ],
      "Unique Required Tools": [{ slug: "figma", label: "Figma" }],
      "Duty Description": "Shaping the end-to-end experience.",
      "Why Is This Duty Important to Project Success?":
        "Because usable design drives adoption.",
      "What Does It Take for This Duty To Succeed?":
        "Curiosity and iteration.",
      "First Step to Learn": "Sketch a simple flow.",
    },
    {
      id: 2,
      slug: "software-development",
      "Duty Name": "Software Development",
      "Responsible Tasks": [{ slug: "coding", label: "Coding" }],
      "Duty Description": "Writing the software.",
    },
  ],
  skills: [
    { id: 1, slug: "wireframing", "Skill Name": "Wireframing" },
  ],
};

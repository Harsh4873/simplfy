import type { StudyModule } from "./types";
import { isStudyModule, validateModule } from "./validate";

const files = import.meta.glob("../../content/modules/*.json", {
  eager: true,
  import: "default",
});

export type CatalogLoad = {
  modules: StudyModule[];
  errors: { file: string; issues: { path: string; message: string }[] }[];
};

export function loadCatalog(): CatalogLoad {
  const modules: StudyModule[] = [];
  const errors: CatalogLoad["errors"] = [];

  for (const [file, payload] of Object.entries(files)) {
    if (isStudyModule(payload)) {
      modules.push(payload);
    } else {
      errors.push({ file, issues: validateModule(payload, file) });
    }
  }

  modules.sort((a, b) => a.title.localeCompare(b.title));
  return { modules, errors };
}

export function indexModules(modules: StudyModule[]): Map<string, StudyModule> {
  return new Map(modules.map((module) => [module.id, module]));
}

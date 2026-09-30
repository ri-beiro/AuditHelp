import { Building2 } from "lucide-react";

export function NoUnit() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <Building2 className="mx-auto size-10 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-800">Nenhuma unidade vinculada</h2>
      <p className="mt-1 text-sm text-slate-500">
        Peça a um administrador para vincular seu usuário a uma unidade (CD) para começar.
      </p>
    </div>
  );
}
